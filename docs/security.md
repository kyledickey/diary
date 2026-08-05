# Security

Diary's premise is that entries are private. This document records the controls
that back that claim, and their limits.

## Trust boundaries

- The browser is untrusted. It holds an HTTP-only Better Auth session cookie;
  JavaScript cannot read the session token.
- The web SSR server renders UI. It never holds auth secrets or reads or writes
  entry data.
- The API is the only component with database and Stripe credentials, and it
  re-derives the caller's identity on every request.

Plan checks in the UI (the free-plan static title, the sidebar's daily-limit
toast) are conveniences. The API enforces the same rules independently.

## Authentication

Every `/documents` request goes through `AuthService.requireUser()`, which asks
Better Auth to resolve the session from the request headers. The user ID comes
from the database-backed session, never from a caller-controlled header, body,
or query parameter.

Magic-link tokens and six-digit OTPs are stored hashed and expire after ten
minutes. OTP verification permits five attempts. In production, Better Auth's
rate limiter and the plugins' stricter per-endpoint rules are active. Origin and
CSRF checks remain enabled; only `WEB_URL` is trusted. Production forces secure
cookies. Sessions expire after 30 days and are refreshed at most once per day.

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

- Subscription actions are authorized against the Better Auth session's user
  ID; a caller cannot operate on another reference ID.
- The Stripe plugin creates a customer only when billing is needed. Free users
  do not receive customers or subscriptions.
- Entitlement is derived server-side from an active or trialing `plus` row in
  PostgreSQL. Browser subscription state is a UI convenience only.
- Account deletion removes the Stripe customer before deleting the user; a
  Stripe failure aborts the local deletion rather than silently diverging.

## Webhook verification

Stripe sends subscription events to `/api/auth/stripe/webhook`. The Better Auth
plugin receives the raw request and verifies its `stripe-signature` with
`STRIPE_WEBHOOK_SECRET` before updating local customer or subscription state.

## Plan enforcement

Two rules, both enforced server-side:

- **Free plan, one entry per local day.** Serialized with
  `pg_advisory_xact_lock` inside the insert transaction, so concurrent requests
  cannot both succeed; the loser gets `409 CONFLICT`. The day boundary comes
  from the caller-supplied `timezoneOffsetMinutes`, which is a client-controlled
  value — a caller can shift their own window by lying about their timezone.
- **Free plan cannot edit titles.** `403 FORBIDDEN` when a free-plan `PATCH`
  sends a title different from the stored one.

`PATCH /documents/:id` only queries subscription state when the body contains a
title, and the deprecated `POST /documents/:id` route skips the plan lookup
because it accepts content only. Any future rule that gates content or metadata
must add its own plan check.

## Transport and CORS

CORS is restricted to `env.webUrl` as the single allowed origin, permits
credentialed requests and the `Content-Type` header, allows the methods used by
the API and Better Auth, and caches preflight responses for 24 hours. There is
no wildcard origin.

The API does not terminate TLS; the platform in front of it does.

## Secrets

- `VITE_*` values are compiled into the browser bundle. They are public by
  construction — never put a secret behind that prefix.
- `.gitignore` and `.dockerignore` both exclude `.env` and `.env.*` while
  keeping `.env.example`, so local secrets do not reach a commit or a build
  context.
- Only the API holds `BETTER_AUTH_SECRET`, `RESEND_API_KEY`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ENCRYPTION_KEY`, and `DB_URL`.
  The web server needs no auth, email, database, billing, or encryption secret.

## Error disclosure and logging

Unhandled errors return a generic `500 INTERNAL_ERROR` message; the detail is
written to the JSON log with a request ID, the method, and the path. The
structured logger records the error `message` only, never the request body, so
entry content does not reach the logs.
