# Security

Diary's premise is that entries are private. This document records the controls
that back that claim, and their limits.

## Trust boundaries

- The browser is untrusted. It holds a Clerk session token and nothing else that
  grants access.
- The web SSR server renders UI and runs Clerk middleware. It never reads or
  writes entry data.
- The API is the only component with database and Stripe credentials, and it
  re-derives the caller's identity on every request.

Plan checks in the UI (the free-plan static title, the sidebar's daily-limit
toast) are conveniences. The API enforces the same rules independently.

## Authentication

Every `/documents` and `/billing` request goes through
`AuthService.requireUser()`, which calls Clerk's `authenticateRequest` with:

- `acceptsToken: "session_token"` — API keys and other token types are rejected
- `authorizedParties` — the token's `azp` must be `WEB_URL`, or one of
  `CLERK_AUTHORIZED_PARTIES` when set, which blocks tokens minted for another
  origin
- `jwtKey` — when `CLERK_JWT_KEY` is set, verification is local, with no network
  call to Clerk on the request path

The user ID comes from the verified token, never from a header, body, or query
parameter.

## Ownership

`owner_id` is applied in SQL, not in an `if`. Every read, update, and delete in
`DocumentRepository` filters on `(id, owner_id)` together, and the service
treats an empty result as `404 NOT_FOUND`.

Returning `404` rather than `403` is deliberate: the API does not confirm that
an entry ID exists for a different account.

`create` sets `owner_id` from the authenticated user, so a client cannot write
an entry into someone else's account.

## Entry encryption

`apps/api/src/lib/cipher.ts` encrypts `content` before it reaches the database
and decrypts it on read.

- **Current format** — AES-256-GCM, stored as
  `v2:<iv>:<authTag>:<ciphertext>` in hex, with a fresh 12-byte random IV per
  encryption. GCM is authenticated, so tampering with stored ciphertext fails
  decryption instead of yielding altered plaintext (covered by
  `cipher.test.ts`).
- **Legacy format** — AES-256-CBC, stored as `<iv>:<ciphertext>`. Still
  readable, and rewritten as `v2` the next time the entry is saved. There is no
  backfill; untouched entries stay in the old format.
- **Key derivation** — `sha256(ENCRYPTION_KEY)`. This is a plain hash, not a
  KDF, so the strength of the key is the strength of the secret. Use a long,
  high-entropy random value.

What is *not* encrypted: entry titles, `metadata`, all timestamps, and every
column of `users`. This is server-side encryption at rest, not end-to-end
encryption — the API necessarily holds the key and sees plaintext in memory, and
plaintext crosses the wire to the browser over TLS.

### Key handling

`ENCRYPTION_KEY` has no rotation support. Changing it makes every existing
entry undecryptable — decryption will throw, and reads of affected entries will
fail. Treat it as permanent for the lifetime of the data, and back it up
wherever you keep the database backups.

## Billing integrity

- Portal sessions are created from the `stripe_customer_id` stored on the
  caller's `users` row. A customer ID from the request is never trusted.
- Sign-up provisioning uses idempotency keys (`diary-customer-<userId>`,
  `diary-free-subscription-<userId>`), so a redelivered `user.created` webhook
  does not create duplicate customers or subscriptions.
- Entitlement lives in Clerk `publicMetadata.plan`, written only by the API in
  response to a verified Stripe or Clerk webhook.

## Webhook verification

Both webhook routes are declared with `parse: "none"` so the raw body reaches
signature verification byte-for-byte — a body parser would break both
signatures.

- Clerk: `verifyWebhook()` with `CLERK_WEBHOOK_SIGNING_SECRET`; failure returns
  `400 BAD_REQUEST`.
- Stripe: a `stripe-signature` header is required by the route schema, and
  `stripe.webhooks.constructEvent` verifies it against `STRIPE_WEBHOOK_SECRET`;
  failure returns `400 BAD_REQUEST`.

## Plan enforcement

Two rules, both enforced server-side:

- **Free plan, one entry per local day.** Serialized with
  `pg_advisory_xact_lock` inside the insert transaction, so concurrent requests
  cannot both succeed; the loser gets `409 CONFLICT`. The day boundary comes
  from the caller-supplied `timezoneOffsetMinutes`, which is a client-controlled
  value — a caller can shift their own window by lying about their timezone.
- **Free plan cannot edit titles.** `403 FORBIDDEN` when a free-plan `PATCH`
  sends a title different from the stored one.

Note that `PATCH /documents/:id` only fetches the plan from Clerk when the body
contains a `title`, and the deprecated `POST /documents/:id` route skips the
plan lookup entirely because it accepts content only. Any future rule that gates
content or metadata must add its own plan check.

## Transport and CORS

CORS is restricted to `env.webUrl` as the single allowed origin, with
`Authorization` and `Content-Type` headers, the five methods the API actually
uses, and a 24-hour preflight cache. There is no wildcard origin.

The API does not terminate TLS; the platform in front of it does.

## Secrets

- `VITE_*` values are compiled into the browser bundle. They are public by
  construction — never put a secret behind that prefix.
- `.gitignore` and `.dockerignore` both exclude `.env` and `.env.*` while
  keeping `.env.example`, so local secrets do not reach a commit or a build
  context.
- Only the API holds `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, the webhook
  secrets, `ENCRYPTION_KEY`, and `DB_URL`. The web server holds
  `CLERK_SECRET_KEY` for SSR middleware and nothing else.

## Error disclosure and logging

Unhandled errors return a generic `500 INTERNAL_ERROR` message; the detail is
written to the JSON log with a request ID, the method, and the path. The
structured logger records the error `message` only, never the request body, so
entry content does not reach the logs.
