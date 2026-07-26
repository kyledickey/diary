# Diary

A private, encrypted place to keep track of your thoughts.

[Website](https://diary.kyle.so) · [Changelog](./CHANGELOG.md) · [Documentation](./docs/README.md) · [MIT License](./LICENSE)

Diary is a journaling app built around one idea: what you write stays yours.
Entry content is encrypted before it reaches the database, every read and write
is scoped to the signed-in owner, and the writing surface is deliberately plain
— a title, a page, and nothing asking for your attention.

## Features

- **Distraction-free editor** with per-entry font family and size, plus a blur
  toggle for writing in public.
- **Autosave** that debounces as you type and backs off when the network fails,
  so you never press save.
- **Encrypted at rest** — entry content is stored as AES-256-GCM ciphertext, so
  a database dump contains no readable text.
- **Accounts and billing** through Clerk and Stripe. The free plan allows one
  entry per day; Plus removes the limit and unlocks editable titles.
- **Light and dark themes**, server-side rendering, and a mobile layout.

## Tech stack

| Layer                       | Choice                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Runtime and package manager | [Bun](https://bun.sh/)                                                                                                         |
| Monorepo tasks              | [Turborepo](https://turbo.build/)                                                                                              |
| Web                         | [TanStack Start](https://tanstack.com/start), React 19, TanStack Query, Tailwind CSS, shadcn/ui, [Plate](https://platejs.org/) |
| API                         | [Elysia](https://elysiajs.com/)                                                                                                |
| Database                    | PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)                                                                       |
| Auth                        | [Clerk](https://clerk.com/)                                                                                                    |
| Payments                    | [Stripe](https://stripe.com/)                                                                                                  |
| Validation                  | [Zod](https://zod.dev/) contracts shared by both apps                                                                          |
| Lint and format             | [Biome](https://biomejs.dev/)                                                                                                  |

## Project structure

Diary is a Bun and TypeScript monorepo:

```
apps/web            TanStack Start web application, server-rendered by Bun
apps/api            Elysia HTTP API — the only writer of entry data
packages/contracts  Zod request, response, and domain contracts shared by both apps
packages/database   Drizzle schema, migrations, and the PostgreSQL connection
infra               PostgreSQL image with the initial Diary schema
docs                Full developer documentation
```

The browser talks to the API directly with a Clerk session token; the web server
renders UI and never proxies entry data.

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) 1.3.14 or newer
- PostgreSQL — use the Compose service in this repository or your own server
- A [Clerk](https://clerk.com/) application (a development instance is fine)
- A [Stripe](https://stripe.com/) account with two prices: one for the free plan
  and one for Plus
- Docker, if you want the Compose database or the full container stack

Diary cannot run against stubs. The API refuses to start without every
credential, accounts are created by a Clerk webhook, and sign-up provisioning
calls Stripe directly.

### 1. Install

```bash
git clone https://github.com/kyledickey/diary.git
cd diary
bun install
```

### 2. Configure

```bash
cp .env.example .env
```

Fill in the Clerk keys, the Clerk webhook signing secret, `ENCRYPTION_KEY`, and
the four Stripe values. Every variable is documented in
[docs/configuration.md](./docs/configuration.md).

Keep all secret API values server-side in the API environment. Only `VITE_*`
values are exposed to the browser, and they are baked into the client bundle at
build time. The development scripts load the repository-root `.env` file for
both applications.

### 3. Start PostgreSQL

Either bring up the Compose database, which ships with the schema baked in:

```bash
docker compose up infra
```

Or point `DB_URL` at your own empty database and apply the migrations:

```bash
DB_URL="postgresql://diary:password@localhost:5432/diary" \
  bun --filter @diary/database db:migrate
```

Pick one. The Compose image seeds the schema through an init script that does
not populate Drizzle's migration bookkeeping, so running `db:migrate` against it
will fail on tables that already exist.

### 4. Connect the webhooks

**This step is required.** Account rows are written only by the Clerk webhook
handler, and `documents.owner_id` is a foreign key to `users.id` — until a
`user.created` event reaches the API, a signed-in account cannot create entries.

Expose the local API with a tunnel, then register:

- **Clerk** → `https://<tunnel-host>/auth/webhook/user` for `user.created`,
  `user.updated`, and `user.deleted`. Copy the signing secret into
  `CLERK_WEBHOOK_SIGNING_SECRET`.
- **Stripe** → `https://<tunnel-host>/stripe/webhook` for
  `customer.subscription.updated` and `customer.subscription.deleted`. Copy the
  secret into `STRIPE_WEBHOOK_SECRET`.

### 5. Run

```bash
bun dev
```

The web app runs at `http://localhost:3000` and the API at
`http://localhost:8080`.

### 6. Verify

```bash
curl http://localhost:8080/health
# {"status":"ok","timestamp":"..."}
```

Sign up at `http://localhost:3000`, confirm a row appears in `users` with a
`stripe_customer_id`, then create an entry and type into it — the header shows
"Saving" and settles on "Edited …". The generated API reference is at
`http://localhost:8080/openapi`.

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

Database commands are routed through the database package and read `DB_URL` from
the environment:

```bash
bun --filter @diary/database db:generate   # generate SQL from the schema
bun --filter @diary/database db:migrate    # apply migrations
bun --filter @diary/database db:studio     # browse the data
```

## Testing

Tests use `bun:test` and live beside the code as `*.test.ts`. Run the whole
suite with `bun test`, or a single file:

```bash
bun test apps/api/src/lib/cipher.test.ts
```

Business rules live in the service layer and take interfaces, so tests exercise
real logic against in-memory doubles with no database or network.

## Containers

The repository has focused production images for each runtime:

- `infra/Dockerfile` — PostgreSQL with the initial Diary schema
- `apps/api/Dockerfile` — the bundled Elysia API
- `apps/web/Dockerfile` — the TanStack Start SSR server and static assets

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

See [docs/deployment.md](./docs/deployment.md) for deploying the complete stack
to Railway with managed PostgreSQL and separate web and API services.

## Contributing

Issues and pull requests are welcome.

1. Branch from `main`.
2. Make the change. Biome owns formatting and linting — four-space indentation,
   100-column lines, double quotes — so run `bun format` rather than hand-tuning
   style.
3. Run `bun check && bun test && bun lint` before opening a pull request. There
   is no CI workflow, so these checks are the gate.
4. Note anything user-facing in [CHANGELOG.md](./CHANGELOG.md).

A few conventions worth knowing before you start:

- Shared request and response shapes belong in `packages/contracts`, so the web
  app and API cannot drift apart.
- Keep business rules in the API's service layer, database access in
  repositories, and scope every document query to `(id, owner_id)`.
- Never route user input through the Markdown rendering used for policy pages.

[docs/development.md](./docs/development.md) has the full workflow, including
recipes for adding an endpoint, changing the schema, and adding a UI component.

## Documentation

Full documentation lives in [docs/](./docs/README.md):

| Guide                                        | Covers                                |
| -------------------------------------------- | ------------------------------------- |
| [Getting started](./docs/getting-started.md) | First run, end to end                 |
| [Architecture](./docs/architecture.md)       | Services, boundaries, runtime flows   |
| [Configuration](./docs/configuration.md)     | Every environment variable            |
| [HTTP API](./docs/api.md)                    | Endpoints, errors, webhooks           |
| [Data model](./docs/data-model.md)           | Schema, migrations, ciphertext format |
| [Web application](./docs/web-app.md)         | Routes, data layer, editor            |
| [Development](./docs/development.md)         | Commands, tests, change recipes       |
| [Deployment](./docs/deployment.md)           | Docker, Compose, Railway              |
| [Security](./docs/security.md)               | Auth, ownership, encryption, secrets  |

## Security

- Clerk session tokens are verified at the API boundary.
- Every entry lookup and mutation is scoped to the authenticated owner.
- New entry content uses authenticated AES-256-GCM encryption.
- Existing AES-256-CBC entries remain readable and are upgraded to GCM the next
  time they are saved.
- Stripe portal sessions are created from the authenticated user's stored
  customer ID; customer IDs are never trusted from browser input.

This is server-side encryption at rest, not end-to-end encryption, and
`ENCRYPTION_KEY` has no rotation path — see
[docs/security.md](./docs/security.md) for the full model and its limits.

Please report vulnerabilities privately to [hi@kyle.so](mailto:hi@kyle.so)
rather than opening a public issue.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for product history.

## License

[MIT](./LICENSE) © Kyle Dickey
