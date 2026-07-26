# Deployment

Diary ships as three images: PostgreSQL with the schema baked in, the API, and
the web application. Compose runs the whole stack locally; Railway runs it in
production with a managed database.

## Images

| Dockerfile | Contents |
| --- | --- |
| `infra/Dockerfile` | `postgres:18-alpine` with `packages/database/drizzle/0000_breezy_plazm.sql` installed as an init script, plus a `pg_isready` healthcheck |
| `apps/api/Dockerfile` | Multi-stage Bun build producing `dist/index.js` and `dist/migrate.js`, with the migrations directory copied to `/app/drizzle` |
| `apps/web/Dockerfile` | Multi-stage Bun build of the Vite/TanStack Start output, served by `server.ts` |

All three build from the **repository root** as context — they need the root
lockfile, `turbo.json`, `tsconfig.base.json`, and the shared packages.

Both application images run as the non-root `bun` user, define a `HEALTHCHECK`
that hits their own port (`/health` for the API, `/` for the web app), and honor
a runtime `PORT`.

The web build declares `VITE_API_URL` and `VITE_CLERK_PUBLISHABLE_KEY` as build
arguments and fails fast if either is empty, because Vite inlines them into the
client bundle. Changing either one requires a rebuild — see
[Configuration](./configuration.md#web-appsweb).

Build them individually from the root:

```bash
docker build -f infra/Dockerfile -t diary-infra .
docker build -f apps/api/Dockerfile -t diary-api .
docker build \
  -f apps/web/Dockerfile \
  --build-arg VITE_API_URL=http://localhost:8080 \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_me \
  -t diary-web .
```

## Compose

```bash
cp .env.example .env
# Fill in the Clerk, Stripe, encryption, and database values.
docker compose up --build
```

- web — <http://localhost:3000>
- API — <http://localhost:8080>
- PostgreSQL — `127.0.0.1:5432` (bound to loopback only)

Startup is ordered: `api` waits for `infra` to report healthy, and `web` waits
for `api`. The API's `DB_URL` is composed inside `compose.yaml` from the
PostgreSQL variables and uses the internal `infra` hostname, so it does not
depend on the `DB_URL` line in `.env`.

Compose declines to start if a required secret is missing — each `${VAR:?…}`
reference names the variable it needs.

Stop the stack with `docker compose down`. Add `--volumes` only when you
intend to delete the `postgres-data` volume and every entry in it.

## Railway

Diary deploys to Railway as three services:

- `web` — the public TanStack Start application
- `api` — the public Elysia API
- `Postgres` — a managed Railway database, reachable over the private network

Use the managed database rather than deploying `infra/Dockerfile`; the API
applies the checked-in Drizzle migrations before each deployment goes live.

### Create the services

1. Create an empty Railway project.
2. Add a managed PostgreSQL database and keep its service name as `Postgres`.
3. Add `api` and `web` services from this GitHub repository.
4. Keep the repository root as the build root for both. The applications depend
   on root workspace configuration and the shared packages.
5. Set each service's **Railway Config File**:
   - `api` → `/apps/api/railway.json`
   - `web` → `/apps/web/railway.json`

Those files select the Dockerfile, health check path and timeout, restart
policy, the pre-deploy migration command, and the monorepo watch paths that
decide which commits rebuild which service.

### Configure variables

On `api`:

```dotenv
DB_URL=${{Postgres.DATABASE_URL}}
WEB_URL=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
CLERK_AUTHORIZED_PARTIES=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
ENCRYPTION_KEY=
STRIPE_SECRET_KEY=
STRIPE_FREE_PRICE_ID=
STRIPE_PLUS_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
```

On `web`:

```dotenv
VITE_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

### Networking

Private networking is automatic, so `DB_URL` uses the managed database's private
connection and PostgreSQL needs no TCP proxy or public domain.

Enable public networking for `api` and `web` by generating a Railway domain.
**Generate the API domain first** — `VITE_API_URL` must resolve while the web
image builds. When you later move to custom domains, update `WEB_URL`,
`CLERK_AUTHORIZED_PARTIES`, and `VITE_API_URL`, and redeploy the web service so
the new API URL is baked in.

### Migrations

`apps/api/railway.json` sets `preDeployCommand: bun dist/migrate.js`, which runs
`apps/api/src/migrate.ts` against `DB_URL` before the new deployment takes
traffic. The API image sets `DATABASE_MIGRATIONS_DIR=/app/drizzle`, where the
SQL files were copied during the build.

A failing migration fails the deployment and the previous version keeps serving.

## After any deployment

1. Point the Clerk webhook at `https://<api-domain>/auth/webhook/user` for
   `user.created`, `user.updated`, and `user.deleted`, and set
   `CLERK_WEBHOOK_SIGNING_SECRET` from it. Without this, new sign-ups get no
   database row and cannot create entries.
2. Point the Stripe webhook at `https://<api-domain>/stripe/webhook` for
   `customer.subscription.updated` and `customer.subscription.deleted`, and set
   `STRIPE_WEBHOOK_SECRET`.
3. Check `GET https://<api-domain>/health`.
4. Sign up with a throwaway account and confirm a `users` row appears with a
   `stripe_customer_id`.
