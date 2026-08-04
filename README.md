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
- **Passwordless accounts** through Better Auth and Resend, with magic links
  and a one-time-code fallback. Stripe powers the optional Plus plan.
- **Light and dark themes**, server-side rendering, and a mobile layout.

## Tech stack

| Layer                       | Choice                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Runtime and package manager | [Bun](https://bun.sh/)                                                                                                         |
| Monorepo tasks              | [Turborepo](https://turbo.build/)                                                                                              |
| Web                         | [TanStack Start](https://tanstack.com/start), React 19, TanStack Query, Tailwind CSS, shadcn/ui, CodeMirror                      |
| API                         | [Elysia](https://elysiajs.com/)                                                                                                |
| Database                    | PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)                                                                       |
| Auth                        | [Better Auth](https://better-auth.com/) with [Resend](https://resend.com/)                                                    |
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

The browser talks to the API directly with a Better Auth session cookie; the
web server renders UI and never proxies entry data.

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) 1.3.14 or newer
- PostgreSQL — use the Compose service in this repository or your own server
- A [Resend](https://resend.com/) API key and verified sending domain
- A [Stripe](https://stripe.com/) account with one recurring Plus price
- Docker, if you want the Compose database or the full container stack

The API validates its database, Better Auth, Resend, encryption, and Stripe
configuration at startup. Use test-mode Stripe credentials locally.

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

Fill in `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `ENCRYPTION_KEY`, and the Stripe
values. Every variable is documented in
[docs/configuration.md](./docs/configuration.md).

Keep all secret API values server-side in the API environment. Only `VITE_*`
values are exposed to the browser, and they are baked into the client bundle at
build time. The development scripts load the repository-root `.env` file for
both applications.

### 3. Start PostgreSQL

Bring up the Compose database, then apply all checked-in migrations:

```bash
docker compose up -d infra
bun run migrate
```

`bun run migrate` also works with an empty external PostgreSQL database. It
recognizes an older Compose schema and safely records its initial migration
before applying newer migrations.

### 4. Connect Stripe

Expose the local API with a tunnel, then point Stripe at
`https://<tunnel-host>/api/auth/stripe/webhook`. Copy the endpoint signing
secret into `STRIPE_WEBHOOK_SECRET`. Better Auth verifies the webhook and keeps
the local `subscriptions` table synchronized.

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

Sign up at `http://localhost:3000` using a magic link or one-time code, then
create an entry and type into it — the header shows "Saving" and settles on
"Edited …". The generated API reference is at
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
bun run db:generate                        # generate SQL from the schema
bun run migrate                            # apply migrations
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
# Fill in the Better Auth, Resend, Stripe, encryption, and database values.
docker compose up -d infra
bun run migrate
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
| [HTTP API](./docs/api.md)                    | Auth, documents, billing, errors      |
| [Data model](./docs/data-model.md)           | Schema, migrations, ciphertext format |
| [Web application](./docs/web-app.md)         | Routes, data layer, editor            |
| [Development](./docs/development.md)         | Commands, tests, change recipes       |
| [Deployment](./docs/deployment.md)           | Docker, Compose, Railway              |
| [Security](./docs/security.md)               | Auth, ownership, encryption, secrets  |

## Security

- Better Auth sessions are resolved from HTTP-only cookies at the API boundary.
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
