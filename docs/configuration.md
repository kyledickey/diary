# Configuration

Every value below is read from the process environment. `.env.example` is the
template; copy it to `.env` and fill it in. The development scripts for both
applications load the repository-root `.env` explicitly
(`bun --env-file=../../.env ...`), and Compose reads the same file.

Never commit real values. `.gitignore` and `.dockerignore` both exclude `.env`
and `.env.*` while keeping `.env.example`.

## API (`apps/api`)

Validated by `apps/api/src/config/env.ts` with Zod at process start. A missing
or malformed required value crashes the API immediately rather than failing at
the first request.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | One of `development`, `test`, `production`. Logged at startup. |
| `PORT` | no | `8080` | Listen port. Coerced to a positive integer. |
| `DB_URL` | **yes** | — | PostgreSQL connection URL. Must parse as a URL. |
| `WEB_URL` | no | `http://localhost:3000` | Public web origin. Sets CORS, Better Auth's trusted origin, and billing return URLs. A trailing slash is stripped. |
| `API_URL` | no | `http://localhost:8080` | Public API origin and Better Auth base URL. A trailing slash is stripped. |
| `BETTER_AUTH_SECRET` | **yes** | — | High-entropy signing secret with at least 32 characters. Keep it stable between deployments. |
| `RESEND_API_KEY` | **yes** | — | Server-side Resend credential used for passwordless authentication email. |
| `AUTH_EMAIL_FROM` | no | `Diary <auth@mail.kyle.so>` | Verified sender used for magic links and one-time codes. |
| `ENCRYPTION_KEY` | **yes** | — | Secret for entry content encryption. See [Security](./security.md#entry-encryption). |
| `STRIPE_SECRET_KEY` | **yes** | — | Stripe API credential. |
| `STRIPE_PLUS_PRICE_ID` | **yes** | — | Recurring price used by the Better Auth `plus` subscription plan. |
| `STRIPE_WEBHOOK_SECRET` | **yes** | — | Verifies `POST /api/auth/stripe/webhook`. |

### Migration runner

`apps/api/src/migrate.ts` is a separate entrypoint (`dist/migrate.js` after
build) and reads its own variables:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DB_URL` | **yes** | — | Database to migrate. |
| `DATABASE_MIGRATIONS_DIR` | no | `../drizzle` relative to the database package | Directory of SQL migrations. `apps/api/Dockerfile` sets it to `/app/drizzle`, where the migrations are copied in the runtime image. |

`packages/database/drizzle.config.ts` also reads `DB_URL` and throws without it,
so all `drizzle-kit` commands need it in the environment.

## Web (`apps/web`)

Vite inlines `VITE_*` values into the client bundle at **build time**. They are
public — treat anything prefixed `VITE_` as visible to every visitor, and never
put a secret there.

| Variable | Stage | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `VITE_API_URL` | build | effectively yes | `http://localhost:8080` | API base URL used by `apps/web/src/lib/api-client.ts`. A trailing slash is stripped. |
| `PORT` | runtime | no | `3000` | Listen port for `apps/web/server.ts`. |

Changing `VITE_API_URL` requires rebuilding and redeploying the web image;
restarting it is not enough.

## Compose and local ports

Used only by `compose.yaml` and `.env.example`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `WEB_PORT` | `3000` | Published host port for the web container |
| `API_PORT` | `8080` | Published host port for the API container |
| `POSTGRES_PORT` | `5432` | Published host port for PostgreSQL, bound to `127.0.0.1` only |
| `POSTGRES_DB` | `diary` | Database name |
| `POSTGRES_USER` | `diary` | Database user |
| `POSTGRES_PASSWORD` | — (required) | Database password |

Compose composes `DB_URL` for the API itself from the PostgreSQL values, using
the internal `infra` hostname; the root `DB_URL` in `.env` is what the
non-container development workflow uses.

## Matching values across services

These must agree or authentication and billing break:

- `WEB_URL` (API) must be the origin the browser actually loads, or CORS
  rejects every request.
- `VITE_API_URL` (web build) must be the API's public URL.
- `API_URL` must be the public origin that serves `/api/auth`; magic-link URLs
  are generated from it.
- `BETTER_AUTH_SECRET` must be identical across every API instance.
- `AUTH_EMAIL_FROM` must use a domain verified by the configured Resend account.
- Stripe must send webhooks to `${API_URL}/api/auth/stripe/webhook` using the
  secret configured as `STRIPE_WEBHOOK_SECRET`.
- `ENCRYPTION_KEY` must stay stable for the lifetime of the data. See
  [Security](./security.md#key-handling).
