# Architecture

## System shape

Diary is two deployable applications plus a database, with Clerk and Stripe as
external systems of record.

```
                    ┌──────────────────────────────────────────┐
                    │              Browser                     │
                    │  React app, Clerk session, TanStack Query│
                    └───────┬───────────────────────┬──────────┘
        document HTML,      │                       │  fetch() with
        JS/CSS assets       │                       │  Authorization: Bearer <Clerk session token>
                    ┌───────▼─────────┐     ┌───────▼──────────┐
                    │  apps/web       │     │  apps/api        │
                    │  TanStack Start │     │  Elysia on Bun   │
                    │  SSR on Bun     │     │  :8080           │
                    │  :3000          │     └───┬──────────┬───┘
                    └───────┬─────────┘         │          │
                            │ clerkMiddleware   │          │ Stripe API
                            ▼                   │          ▼
                          Clerk ────────────────┘      Stripe
                            │  webhooks              webhooks │
                            └────────────►  apps/api  ◄───────┘
                                             │
                                             ▼
                                        PostgreSQL
                                     (users, documents)
```

The important consequence of this shape: **the browser talks to the API
directly.** The SSR server renders HTML and runs Clerk's request middleware, but
it does not proxy entry data. `VITE_API_URL` is therefore a public,
browser-visible URL, and the API's CORS origin must be the web app's public URL.

## Workspace boundaries

| Package | Role | Depends on |
| --- | --- | --- |
| `@diary/contracts` | Zod schemas and inferred types for every request, response, and domain object | `zod` only |
| `@diary/database` | Drizzle schema, migration runner, pooled `postgres` client | `@diary/contracts` |
| `@diary/api` | HTTP surface, business rules, external integrations | both packages |
| `@diary/web` | UI, routing, client-side data layer | `@diary/contracts` |

Contracts is the seam that keeps the two applications honest: the API validates
incoming bodies with the same schemas the web client uses to parse responses
(`apps/web/src/lib/api-client.ts`). A contract change that breaks one side fails
`bun check` on the other.

`@diary/database` also imports contracts, so the `documents.metadata` JSONB
column is typed as `DocumentMetadata` and defaults to `defaultDocumentMetadata`
at both the Drizzle and SQL levels.

## API layering

`apps/api` uses one shape per module, under `src/modules/<name>/`:

- **routes** — Elysia route definitions. Parse and validate input against
  contracts, resolve the caller via `AuthService`, delegate, and shape the
  response body.
- **service** — business rules. Owns plan enforcement, encryption, and the
  external API calls. Throws `AppError` for anything the client should see.
- **repository** — Drizzle queries. Every document query is keyed on
  `(id, owner_id)` so ownership is enforced in SQL, not in a conditional.

Dependencies are constructed once in `apps/api/src/index.ts` and injected into
`createApp()` (`apps/api/src/app.ts`). Nothing reaches for a module-level
singleton, which is why the service tests can substitute an in-memory
`DocumentStore` and hand-built Clerk/Stripe doubles.

`DocumentService` depends on the `DocumentStore` interface rather than
`DocumentRepository`, so `apps/api/src/modules/documents/service.test.ts` runs
the real business rules with no database.

## Request lifecycle

1. `cors` restricts origins to `env.webUrl` and allows only
   `Authorization` and `Content-Type` on `GET`, `POST`, `PATCH`, `DELETE`, and
   `OPTIONS`.
2. `openapi` mounts the generated reference at `/openapi`.
3. The route handler calls `auth.requireUser(request)`, which verifies the Clerk
   session token and returns the user ID, or throws `unauthorized()`.
4. The service applies rules and the repository executes SQL.
5. `onError` converts failures to one JSON envelope. `AppError` keeps its status
   and code, Elysia's `VALIDATION` code becomes `422 VALIDATION_ERROR`, and
   anything else is logged and returned as `500 INTERNAL_ERROR`. Every error
   response carries an `x-request-id` header, echoing the inbound value when the
   caller supplied one.

See [the API reference](./api.md) for the endpoint list and error envelope.

## Runtime flows

### Account provisioning

Sign-up is driven entirely by Clerk webhooks
(`apps/api/src/modules/webhooks/clerk.ts`):

1. `user.created` → `UserService.sync()` upserts the `users` row from the
   Clerk payload, choosing the primary email address.
2. `BillingService.provisionFreePlan()` creates a Stripe customer (idempotency
   key `diary-customer-<userId>`) and a subscription to `STRIPE_FREE_PRICE_ID`
   (key `diary-free-subscription-<userId>`), stores the customer ID on the
   `users` row, and writes `{ stripeCustomerId, plan: "free" }` into Clerk
   `publicMetadata`.
3. `user.updated` re-syncs profile fields but preserves the stored
   `stripe_customer_id`.
4. `user.deleted` deletes the Stripe customer, then deletes the user's documents
   and the user row inside one transaction.

**Clerk `publicMetadata.plan` is the source of truth for entitlement.** The
database stores only the Stripe customer ID; the API reads the plan through
`AuthService.getPlan()`, and the browser reads the same value from
`useUser().publicMetadata.plan`.

### Writing an entry

1. `DocumentEditor` (`apps/web/src/components/document.tsx`) diffs the working
   draft against the last saved state and debounces a `PATCH /documents/:id`.
   The delay is `min(650 * 2 ** saveAttempt, 10_000)` ms, so repeated failures
   back off to ten seconds and reset to 650 ms on the first success.
2. `DocumentService.update()` encrypts `content` with AES-256-GCM before it
   reaches the repository, and refuses a title change on the free plan.
3. `DocumentRepository.update()` writes with a `(id, owner_id)` predicate and
   returns the row, so a mismatched owner surfaces as `404 NOT_FOUND` rather
   than a leaked 403.
4. The service decrypts the returned row, and the mutation's `onSuccess` writes
   both the detail cache and the matching list entry so the sidebar title stays
   in sync without a refetch.

### One free entry per local day

Free-plan creation is serialized in PostgreSQL rather than in application code.
`DocumentRepository.createForFreePlan()` opens a transaction, takes
`pg_advisory_xact_lock(hashtextextended(owner_id, 0))`, checks for any document
created at or after the caller's local midnight, and only then inserts. Two
concurrent requests cannot both pass the check; the loser receives
`409 CONFLICT`.

The local day boundary comes from `timezoneOffsetMinutes` in the request body,
which the browser fills from `new Date().getTimezoneOffset()`. The server does
not infer a timezone.

### Plan changes

The Stripe billing portal is the only upgrade and downgrade path. `/billing`
and `/upgrade` both render `BillingPage`, which immediately calls
`POST /billing/portal` and redirects to the returned Stripe URL. When the
subscription changes, Stripe posts to `/stripe/webhook`; the API resolves the
customer to a user, derives the plan (`free` when the price matches
`STRIPE_FREE_PRICE_ID` or the subscription was deleted, otherwise `plus`), and
writes it back to Clerk metadata.

## Persistence and logging

`createDatabase()` builds one `postgres` pool per process (max 10 connections,
20 s idle timeout, 10 s connect timeout) wrapped in Drizzle with the full schema
for relational queries.

`apps/api/src/lib/logger.ts` writes single-line JSON with a timestamp, level,
message, and arbitrary context — suitable for a log aggregator, with no
dependency. Only startup and unhandled errors are logged today; handled
`AppError`s are not.
