# Architecture

## System shape

Diary is two deployable applications plus PostgreSQL, with Resend and Stripe as
external services.

```
                    ┌──────────────────────────────────────────┐
                    │              Browser                     │
                    │ React app, Better Auth client, Query     │
                    └───────┬───────────────────────┬──────────┘
        document HTML,      │                       │  fetch() with
        JS/CSS assets       │                       │  HTTP-only session cookie
                    ┌───────▼─────────┐     ┌───────▼──────────┐
                    │  apps/web       │     │  apps/api        │
                    │  TanStack Start │     │  Elysia on Bun   │
                    │  SSR on Bun     │     │  :8080           │
                    │  :3000          │     └───┬──────────┬───┘
                    └─────────────────┘         │          │ Stripe API
                                               │          ▼
                                      Resend ◄─┤      Stripe
                                               │       webhooks
                                               ▼          │
                                          PostgreSQL ◄────┘
                               (auth, subscriptions, documents)
```

The important consequence of this shape: **the browser talks to the API
directly.** The SSR server renders HTML but does not authenticate requests or
proxy entry data. `VITE_API_URL` is therefore a public,
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
singleton, which is why the document service tests can substitute an in-memory
`DocumentStore`.

`DocumentService` depends on the `DocumentStore` interface rather than
`DocumentRepository`, so `apps/api/src/modules/documents/service.test.ts` runs
the real business rules with no database.

## Request lifecycle

1. `cors` restricts origins to `env.webUrl`, allows credentials and
   `Content-Type`, and accepts `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and
   `OPTIONS`.
2. `openapi` mounts the generated reference at `/openapi`.
3. Better Auth handles `/api/auth/*`; document handlers call
   `auth.requireUser(request)`, which resolves the database session cookie and
   returns the user ID or throws `unauthorized()`.
4. The service applies rules and the repository executes SQL.
5. `onError` converts failures to one JSON envelope. `AppError` keeps its status
   and code, Elysia's `VALIDATION` code becomes `422 VALIDATION_ERROR`, and
   anything else is logged and returned as `500 INTERNAL_ERROR`. Every error
   response carries an `x-request-id` header, echoing the inbound value when the
   caller supplied one.

See [the API reference](./api.md) for the endpoint list and error envelope.

## Runtime flows

### Passwordless authentication

Better Auth is mounted at `/api/auth` and uses the Drizzle adapter:

1. The browser requests a magic link, or a six-digit email OTP as fallback.
2. `AuthEmailService` sends the message through Resend. Verification values are
   hashed in PostgreSQL and expire after ten minutes.
3. A valid link or code verifies the email and creates a database session.
4. Better Auth returns an HTTP-only cookie. Subsequent document requests send
   that cookie with `credentials: "include"`.

Sessions expire after 30 days and are refreshed at most once per day. New IDs
are UUIDs; existing string IDs remain valid because the schema uses
`varchar(255)`.

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

`/upgrade` uses the Better Auth Stripe client to start checkout for the `plus`
plan. `/billing` opens the Stripe customer portal. The plugin handles
`/api/auth/stripe/webhook` and writes subscription state into PostgreSQL.
`AuthService.getPlan()` treats an active or trialing `plus` subscription as
paid; otherwise the user is free. Free accounts have no Stripe subscription.

## Persistence and logging

`createDatabase()` builds one `postgres` pool per process (max 10 connections,
20 s idle timeout, 10 s connect timeout) wrapped in Drizzle with the full schema
for relational queries.

`apps/api/src/lib/logger.ts` writes single-line JSON with a timestamp, level,
message, and arbitrary context — suitable for a log aggregator, with no
dependency. Only startup and unhandled errors are logged today; handled
`AppError`s are not.
