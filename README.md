# Diary

A private, encrypted place to keep track of your thoughts.

## Workspace

Diary is a Bun and TypeScript monorepo:

- `apps/web` — TanStack Start, React, Clerk, and TanStack Query
- `apps/api` — Elysia API with Clerk authentication and Stripe billing
- `packages/contracts` — shared Zod request, response, and domain contracts
- `packages/database` — shared Drizzle schema and PostgreSQL connection

## Requirements

- [Bun](https://bun.sh/) 1.3.14 or newer
- PostgreSQL
- Clerk and Stripe credentials

## Setup

```bash
bun install
cp .env.example .env
bun dev
```

The web app runs at `http://localhost:3000` and the API at
`http://localhost:8080`.

Environment variables are loaded from the process running each workspace. Keep
all secret API values server-side in the API environment. Only `VITE_*` values
are exposed to the browser. The development scripts load the repository-root
`.env` file for both applications.

## Containers

The repository has focused production images for each runtime:

- `infra/Dockerfile` — PostgreSQL with the initial Diary schema
- `apps/api/Dockerfile` — the bundled Elysia API
- `apps/web/Dockerfile` — the TanStack Start SSR server and static assets

See [docs/railway.md](./docs/railway.md) for deploying the complete stack to
Railway with managed PostgreSQL and separate web/API services.

Run the complete stack through Compose:

```bash
cp .env.example .env
# Fill in the Clerk, Stripe, encryption, and database values in .env.
docker compose up --build
```

The web app is available at `http://localhost:3000`, the API at
`http://localhost:8080`, and PostgreSQL at `127.0.0.1:5432`. Stop the stack
with `docker compose down`; add `--volumes` only when you intentionally want to
delete local database data.

Each image can also be built independently from the repository root:

```bash
docker build -f infra/Dockerfile -t diary-infra .
docker build -f apps/api/Dockerfile -t diary-api .
docker build \
  -f apps/web/Dockerfile \
  --build-arg VITE_API_URL=http://localhost:8080 \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_me \
  -t diary-web .
```

## Commands

```bash
bun dev          # run both apps
bun dev:web      # run only TanStack Start
bun dev:api      # run only Elysia
bun check        # typecheck every workspace
bun test         # run the test suite
bun run build    # build every workspace
bun lint         # lint the repository
bun format       # format the repository
```

After building, run either production service directly:

```bash
bun --filter @diary/web start
bun --filter @diary/api start
```

Database commands are routed through the database package:

```bash
bun --filter @diary/database db:generate
bun --filter @diary/database db:migrate
bun --filter @diary/database db:studio
```

## Security

- Clerk session tokens are verified at the API boundary.
- Every entry lookup and mutation is scoped to the authenticated owner.
- New entry content uses authenticated AES-256-GCM encryption.
- Existing AES-256-CBC entries remain readable and are upgraded to GCM the next
  time they are saved.
- Stripe portal sessions are created from the authenticated user's stored
  customer ID; customer IDs are never trusted from browser input.

See [CHANGELOG.md](./CHANGELOG.md) for product history.

## License

[MIT](./LICENSE)
