# HTTP API

The Elysia API in `apps/api` is the only writer of entry data. Request and
response shapes come from `@diary/contracts`, so this document and the code
cannot drift far apart — when in doubt, read `packages/contracts/src`.

A generated, browsable reference is served at `/openapi` while the API runs
(Scalar UI; the raw document is at `/openapi/json`).

## Authentication

Every `/documents` endpoint requires a Better Auth session cookie. Browser
requests must include credentials:

```ts
fetch(`${apiUrl}/documents`, { credentials: "include" });
```

`AuthService.requireUser()` passes request headers to Better Auth's
`getSession()`, throws `401 UNAUTHORIZED` when no session exists, and uses the
session's user ID as the owner ID for every subsequent query.

Better Auth is mounted at `/api/auth`. Its magic-link, email-OTP, session,
account, subscription, portal, and webhook endpoints are consumed through the
typed client in `apps/web/src/lib/auth-client.ts` rather than handwritten
browser requests.

## Error envelope

Document and service-route failures return the body defined by
`apiErrorSchema`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Document was not found",
    "requestId": "6f0e…"
  }
}
```

| Code | Status | Raised when |
| --- | --- | --- |
| `BAD_REQUEST` | 400 | A request cannot be processed |
| `UNAUTHORIZED` | 401 | No valid Better Auth session |
| `FORBIDDEN` | 403 | Free plan attempted a title change |
| `NOT_FOUND` | 404 | Document not owned by the caller |
| `CONFLICT` | 409 | Free plan already created an entry today |
| `VALIDATION_ERROR` | 422 | Body, params, or headers failed schema validation |
| `INTERNAL_ERROR` | 500 | Anything unhandled; logged with the request ID |

Responses carry an `x-request-id` header. If the caller sends one it is echoed;
otherwise the API generates a UUID. Use it to correlate a client failure with
the JSON log line for the unhandled error.

Better Auth endpoints use Better Auth's own JSON error format and status codes;
the web client exposes those errors through its generated methods.

Ownership failures deliberately return `404`, not `403`, so the API does not
confirm that an entry ID exists for someone else.

## Service endpoints

### `GET /`

Service identity. `{ "name": "Diary API", "version": "2.0.0" }`.

### `GET /health`

`{ "status": "ok", "timestamp": "<ISO 8601>" }`. Used by the container
`HEALTHCHECK`, by Compose's `depends_on` gate for the web service, and by
Railway's `healthcheckPath`.

## Documents

Timestamps are Unix **seconds**, not milliseconds.

```jsonc
// Document
{
  "id": "uuid",
  "owner_id": "user_…",
  "title": "July 26, 2026",       // nullable
  "content": "Today I noticed…",      // nullable; plaintext Markdown on the wire
  "created_at": 1785022832,
  "updated_at": 1785022832,
  "metadata": { "font": "serif", "font_size": 18 }
}
```

`metadata.font` is `serif`, `sans`, or `mono`; `font_size` is an integer from 12
to 48. A document *summary* is the same object without `content`.

### `GET /documents`

Lists the caller's entries, newest first by `created_at`, as summaries.

```json
{ "documents": [ /* DocumentSummary[] */ ] }
```

Content is excluded from the list on purpose — the list query never decrypts.

### `POST /documents`

```json
{ "title": "July 26, 2026", "timezoneOffsetMinutes": -360 }
```

- `title` — trimmed, 1–255 characters, required.
- `timezoneOffsetMinutes` — integer from −840 to 840, defaults to `0`. Supplied
  by the browser as `new Date().getTimezoneOffset()`; it defines the caller's
  local midnight for the free-plan daily limit.

Returns `{ "document": Document }` with `content: null`. On the free plan a
second entry within the same local day returns `409 CONFLICT`
("You have already created an entry today"). Plus has no limit.

### `GET /documents/:id`

`id` must be a UUID. Returns `{ "document": Document }` with `content`
decrypted. Returns `404` when the document does not exist *or* belongs to
another user.

### `PATCH /documents/:id`

At least one field is required:

```json
{
  "content": "…",                                   // max 65535 characters
  "title": "…",                                     // max 255 characters
  "metadata": { "font": "mono", "font_size": 20 }
}
```

Behavior worth knowing:

- `content` is encrypted before storage and returned decrypted.
- `title` is trimmed and truncated to 255 characters; an empty result becomes
  `"Untitled"`.
- The caller's plan is only read from PostgreSQL when the request contains a
  `title`. Content and metadata updates skip that query.
- A free-plan title change that actually differs from the stored title returns
  `403 FORBIDDEN`. Sending the unchanged title is allowed.
- `updated_at` is always set to the current time.

Returns `{ "document": Document }`.

### `DELETE /documents/:id`

Returns `{ "success": true }`, or `404` if the delete matched no row owned by
the caller.

### Deprecated document routes

Both are marked `deprecated` in the OpenAPI document and exist only for older
clients. Prefer the routes above.

| Route | Equivalent | Note |
| --- | --- | --- |
| `GET /documents/all` | `GET /documents` | Identical handler |
| `POST /documents/:id` | `PATCH /documents/:id` | Accepts `{ "content": "…" }` only, and bypasses the plan lookup entirely |

## Better Auth

The server mounts Better Auth at `/api/auth`. The installed plugins add:

| Capability | Server path |
| --- | --- |
| Request a magic link | `POST /api/auth/sign-in/magic-link` |
| Verify a magic link | `GET /api/auth/magic-link/verify` |
| Request an email OTP | `POST /api/auth/email-otp/send-verification-otp` |
| Sign in with an OTP | `POST /api/auth/sign-in/email-otp` |
| Read the current session | `GET /api/auth/get-session` |
| Sign out | `POST /api/auth/sign-out` |
| Delete the current account | `POST /api/auth/delete-user` |

Magic links and OTPs expire after ten minutes. OTP verification permits five
attempts. Production rate limiting applies stricter plugin rules to link and
code endpoints.

## Billing and Stripe webhooks

The Better Auth Stripe client provides subscription checkout, subscription
listing, cancellation/restoration, and billing portal operations under
`/api/auth/subscription/*`. The web app calls the generated client methods, not
custom billing routes.

Stripe sends signed events to `POST /api/auth/stripe/webhook`. The plugin
verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`, updates the local
`subscriptions` table, and maintains `users.stripe_customer_id`. The configured
plan name is `plus`; free users are represented by the absence of an active or
trialing Plus subscription.
