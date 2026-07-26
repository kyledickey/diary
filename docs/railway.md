# Railway deployment

Diary deploys to Railway as three services:

- `web` — the public TanStack Start application
- `api` — the public Elysia API
- `Postgres` — a managed Railway PostgreSQL database, reachable only over
  Railway's private network

Railway recommends a managed database instead of translating the local
PostgreSQL Compose container directly. The API runs the checked-in Drizzle
migrations before each Railway deployment.

## Create the services

1. Create an empty Railway project.
2. Add a managed PostgreSQL database and keep its service name as `Postgres`.
3. Add `api` and `web` services from this GitHub repository.
4. Keep the repository root as the build root for both application services.
   The applications depend on root workspace configuration and shared packages.
5. Set each service's **Railway Config File**:
   - `api`: `/apps/api/railway.json`
   - `web`: `/apps/web/railway.json`

The config files select the correct Dockerfiles, health checks, restart
policies, migration command, and monorepo watch paths.

## Configure variables

Set these variables on the `api` service:

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

Set these variables on the `web` service:

```dotenv
VITE_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

`VITE_*` variables are embedded into the browser bundle during the Docker
build. Changing either one requires a new web deployment.

## Networking

Railway private networking is automatic. `DB_URL` uses the managed Postgres
service's private connection, so the database does not need a TCP proxy or
public domain.

Both application images listen on Railway's runtime `PORT`. Enable public
networking for `api` and `web` in their service settings by generating a
Railway domain. Generate the API domain before deploying the web service so
`VITE_API_URL` resolves during its build. Custom domains can replace the
Railway-provided domains later; update `WEB_URL`, `CLERK_AUTHORIZED_PARTIES`,
and `VITE_API_URL` when they do.
