# HTTP API

The Elysia API in `apps/api` is the only writer of entry data. Request and
response shapes come from `@diary/contracts`, so this document and the code
cannot drift far apart — when in doubt, read `packages/contracts/src`.

A generated, browsable reference is served at `/openapi` while the API runs
(Scalar UI; the raw document is at `/openapi/json`).

## Authentication

Every `/documents` and `/billing` endpoint requires a Clerk session token:

```
Authorization: Bearer <clerk session token>
```

`AuthService.requireUser()` calls Clerk's `authenticateRequest` with
`acceptsToken: "session_token"` and the configured authorized parties, and
throws `401 UNAUTHORIZED` when the token is missing, expired, or issued for
another party. The authenticated Clerk user ID is the owner ID used for every
subsequent query.

The two webhook endpoints do not use bearer auth; they verify provider
signatures instead.

## Error envelope

Every failure returns the same body, defined by `apiErrorSchema`:

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
| `BAD_REQUEST` | 400 | Webhook signature verification failed |
| `UNAUTHORIZED` | 401 | No valid Clerk session token |
| `FORBIDDEN` | 403 | Free plan attempted a title change |
| `NOT_FOUND` | 404 | Document not owned by the caller, or no Stripe customer |
| `CONFLICT` | 409 | Free plan already created an entry today |
| `VALIDATION_ERROR` | 422 | Body, params, or headers failed schema validation |
| `INTERNAL_ERROR` | 500 | Anything unhandled; logged with the request ID |

Responses carry an `x-request-id` header. If the caller sends one it is echoed;
otherwise the API generates a UUID. Use it to correlate a client failure with
the JSON log line for the unhandled error.

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
  "content": "{\"…\":\"…\"}",     // nullable; plaintext Slate JSON on the wire
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
- The caller's plan is only fetched from Clerk when the request contains a
  `title`. Content and metadata updates skip that round trip.
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

## Billing

### `POST /billing/portal`

Creates a Stripe billing portal session for the authenticated user and returns
`{ "url": "https://billing.stripe.com/…" }`. The customer ID comes from the
caller's `users` row — never from the request — and a user with no stored
customer ID gets `404 NOT_FOUND` ("Billing customer was not found").

The return URL is `${WEB_URL}/entry`.

## Webhooks

Both webhook routes are registered with `parse: "none"` so the raw body reaches
signature verification unmodified. Do not add a body parser to them.

### `POST /auth/webhook/user`

Verified with `CLERK_WEBHOOK_SIGNING_SECRET` via `@clerk/backend/webhooks`.
Handled event types:

| Event | Effect |
| --- | --- |
| `user.created` | Upsert the `users` row, then create the Stripe customer and free subscription and write `plan` into Clerk `publicMetadata` |
| `user.updated` | Re-sync email, image, and username; preserve `stripe_customer_id` |
| `user.deleted` | Delete the Stripe customer, then delete the user's documents and user row in one transaction |

Other event types are accepted and ignored. Verification failure returns
`400 BAD_REQUEST`. Success returns `{ "message": "Webhook received" }`.

Subscribing to these three events is mandatory for a working deployment — see
[Getting started](./getting-started.md#3-connect-the-clerk-webhook).

### `POST /stripe/webhook`

Requires a `stripe-signature` header (missing header returns `400` with
`{ "message": "Missing Stripe signature" }`) and is verified with
`STRIPE_WEBHOOK_SECRET`.

| Event | Effect |
| --- | --- |
| `customer.subscription.updated` | Resolve the customer to a user and set the plan from the subscription's first price: `free` when it matches `STRIPE_FREE_PRICE_ID`, otherwise `plus` |
| `customer.subscription.deleted` | Force the plan to `free` |

Other event types are ignored. An event for an unknown customer raises
`404 NOT_FOUND`, which Stripe will retry.
