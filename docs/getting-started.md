# Getting started

This guide takes a clean checkout to a running local Diary with a real entry
saved to the database.

## Requirements

- [Bun](https://bun.sh/) 1.3.14 or newer (the version pinned by
  `packageManager` in the root `package.json`)
- PostgreSQL — either the Compose service in this repository or your own server
- A [Resend](https://resend.com/) API key and verified sending domain
- A [Stripe](https://stripe.com/) account with one recurring Plus price
- Docker, if you want the Compose database or the full container stack

The API validates its database, Better Auth, Resend, encryption, and Stripe
configuration at startup. Use Stripe test-mode credentials locally.

## 1. Install and configure

```bash
bun install
cp .env.example .env
```

Fill in every placeholder in `.env`. [Configuration](./configuration.md)
documents each variable, where it is read, and whether it is build-time or
runtime. Supply `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `ENCRYPTION_KEY`, and
the Stripe secret, Plus price, and webhook secret.

Both development scripts load the repository-root `.env`
(`bun --env-file=../../.env ...`), so one file configures the web app and the
API.

## 2. Start PostgreSQL

### Option A — the Compose database

```bash
docker compose up -d infra
```

`infra/Dockerfile` copies `packages/database/drizzle/0000_breezy_plazm.sql` into
the image's `docker-entrypoint-initdb.d`, so a fresh volume comes up with the
`users` and `documents` tables already created.

The image seeds the original application tables. Apply all newer migrations
with the repository migration entrypoint:

```bash
bun run migrate
```

The entrypoint recognizes the complete seeded schema, records its initial
migration when needed, and then applies the remaining migrations.

### Option B — your own PostgreSQL

Point `DB_URL` at an empty database and apply the checked-in migrations:

```bash
DB_URL="postgresql://diary:password@localhost:5432/diary" bun run migrate
```

The migration entrypoint reads `DB_URL` from the process environment, so export
it or prefix the command as shown.

## 3. Connect Stripe

1. Expose the local API with a tunnel (for example `ngrok http 8080`).
2. Create a Stripe webhook endpoint at
   `https://<tunnel-host>/api/auth/stripe/webhook`.
3. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

The Better Auth Stripe plugin verifies events and synchronizes customers and
subscriptions into PostgreSQL. Free accounts do not require Stripe customers.

## 4. Run the apps

```bash
bun dev
```

Turbo starts both applications:

- web — <http://localhost:3000>
- API — <http://localhost:8080>

Run one at a time with `bun dev:web` or `bun dev:api`.

## 5. Verify

```bash
curl http://localhost:8080/health
# {"status":"ok","timestamp":"..."}
```

Then:

1. Open <http://localhost:3000> and request a magic link.
2. Follow the link from Resend, or use the six-digit email-code fallback.
3. Confirm a user and session row exist in PostgreSQL.
4. Go to `/entry`, choose **New Entry**, and type. The header switches to
   "Saving" and back to "Edited …" once the debounced autosave succeeds.
5. Confirm the stored content is ciphertext:

   ```sql
   select left(content, 3) from documents limit 1;  -- v2:
   ```

Browse the generated API reference at <http://localhost:8080/openapi> (the raw
document is at `/openapi/json`).

## Where to go next

- [Development](./development.md) for the command reference and change recipes
- [Architecture](./architecture.md) for how the pieces fit together
- [Deployment](./deployment.md) for containers and Railway
