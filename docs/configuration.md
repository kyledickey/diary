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
| `WEB_URL` | no | `http://localhost:3000` | Public web origin. Sets the CORS origin, the default Clerk authorized party, and the Stripe portal `return_url` (`${WEB_URL}/entry`). A trailing slash is stripped. |
| `CLERK_PUBLISHABLE_KEY` | **yes** | — | Passed to `createClerkClient`. |
| `CLERK_SECRET_KEY` | **yes** | — | Clerk backend API credential. |
| `CLERK_JWT_KEY` | no | — | PEM public key. When set, session tokens are verified locally with no network call to Clerk. |
| `CLERK_AUTHORIZED_PARTIES` | no | `[WEB_URL]` | Comma-separated list of accepted token `azp` values. Entries are trimmed. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | **yes**¹ | — | Verifies `POST /auth/webhook/user`. |
| `CLERK_USER_WH_SECRET` | no | — | Legacy alias for the above, accepted for backwards compatibility. |
| `ENCRYPTION_KEY` | **yes** | — | Secret for entry content encryption. See [Security](./security.md#entry-encryption). |
| `STRIPE_SECRET_KEY` | **yes** | — | Stripe API credential. |
| `STRIPE_FREE_PRICE_ID` | **yes** | — | Price subscribed on sign-up, and the value compared against to classify a subscription as `free`. |
| `STRIPE_PLUS_PRICE_ID` | **yes** | — | Required at startup and loaded into config. Plan classification is currently done by *not* matching the free price, so this value is not read at runtime. |
| `STRIPE_WEBHOOK_SECRET` | **yes** | — | Verifies `POST /stripe/webhook`. |

¹ `loadEnv()` throws if neither `CLERK_WEBHOOK_SIGNING_SECRET` nor
`CLERK_USER_WH_SECRET` is set.

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
| `VITE_CLERK_PUBLISHABLE_KEY` | build | yes | — | Clerk browser key. `apps/web/Dockerfile` fails the build if it is empty. |
| `CLERK_SECRET_KEY` | runtime | yes | — | Used by `clerkMiddleware()` in the SSR request pipeline (`apps/web/src/start.ts`). |
| `PORT` | runtime | no | `3000` | Listen port for `apps/web/server.ts`. |

Changing either `VITE_*` value requires rebuilding and redeploying the web
image; restarting it is not enough.

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
- `CLERK_AUTHORIZED_PARTIES` must include the web origin when it differs from
  `WEB_URL`.
- The Clerk instance behind `CLERK_PUBLISHABLE_KEY`,
  `VITE_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY` must be the same one.
- `ENCRYPTION_KEY` must stay stable for the lifetime of the data. See
  [Security](./security.md#key-handling).
