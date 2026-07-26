# Getting started

This guide takes a clean checkout to a running local Diary with a real entry
saved to the database.

## Requirements

- [Bun](https://bun.sh/) 1.3.14 or newer (the version pinned by
  `packageManager` in the root `package.json`)
- PostgreSQL — either the Compose service in this repository or your own server
- A [Clerk](https://clerk.com/) application (development instance is fine)
- A [Stripe](https://stripe.com/) account with two prices, one for the free plan
  and one for the Plus plan
- Docker, if you want the Compose database or the full container stack

Diary cannot run against Clerk and Stripe stubs. The API refuses to start
without every credential present, account rows are created only by a Clerk
webhook, and sign-up provisioning calls the Stripe API directly.

## 1. Install and configure

```bash
bun install
cp .env.example .env
```

Fill in every placeholder in `.env`. [Configuration](./configuration.md)
documents each variable, where it is read, and whether it is build-time or
runtime. The values you must supply by hand are the Clerk keys, the Clerk
webhook signing secret, `ENCRYPTION_KEY`, and the four Stripe values.

Both development scripts load the repository-root `.env`
(`bun --env-file=../../.env ...`), so one file configures the web app and the
API.

## 2. Start PostgreSQL

### Option A — the Compose database

```bash
docker compose up infra
```

`infra/Dockerfile` copies `packages/database/drizzle/0000_breezy_plazm.sql` into
the image's `docker-entrypoint-initdb.d`, so a fresh volume comes up with the
`users` and `documents` tables already created.

That init script creates the tables but does not write Drizzle's migration
bookkeeping table, so do **not** also run `db:migrate` against a
Compose-seeded database — the migrator would try to re-create tables that
already exist. Use Option B when you want the migrator to own the schema.

### Option B — your own PostgreSQL

Point `DB_URL` at an empty database and apply the checked-in migrations:

```bash
DB_URL="postgresql://diary:password@localhost:5432/diary" \
  bun --filter @diary/database db:migrate
```

`packages/database/drizzle.config.ts` reads `DB_URL` from the process
environment, so export it or prefix the command as shown.

## 3. Connect the Clerk webhook

**This step is required, not optional.** `documents.owner_id` is a foreign key
to `users.id`, and the only writer of `users` rows is the Clerk webhook handler
at `POST /auth/webhook/user`. Until a `user.created` event reaches the API,
a signed-in account has no database row, entry creation fails on the foreign
key, and `POST /billing/portal` returns 404.

1. Expose the local API with a tunnel (for example
   `ngrok http 8080` or `stripe listen`-style tooling of your choice).
2. In the Clerk dashboard, add an endpoint pointing at
   `https://<tunnel-host>/auth/webhook/user` subscribed to `user.created`,
   `user.updated`, and `user.deleted`.
3. Copy the signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`.

The same applies to Stripe: point a webhook at
`https://<tunnel-host>/stripe/webhook` for
`customer.subscription.updated` and `customer.subscription.deleted`, and copy
its secret into `STRIPE_WEBHOOK_SECRET`. Without it, plan changes made in the
Stripe billing portal never reach Clerk metadata.

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

1. Open <http://localhost:3000> and sign up through Clerk.
2. Confirm the webhook fired — a row should exist in `users` with a
   `stripe_customer_id`.
3. Go to `/entry`, choose **New Entry**, and type. The header switches to
   "Saving" and back to "Edited …" once the debounced autosave succeeds.
4. Confirm the stored content is ciphertext:

   ```sql
   select left(content, 3) from documents limit 1;  -- v2:
   ```

Browse the generated API reference at <http://localhost:8080/openapi> (the raw
document is at `/openapi/json`).

## Where to go next

- [Development](./development.md) for the command reference and change recipes
- [Architecture](./architecture.md) for how the pieces fit together
- [Deployment](./deployment.md) for containers and Railway
