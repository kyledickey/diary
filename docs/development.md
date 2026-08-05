# Development

## Commands

Run from the repository root. Turbo fans each task out across the workspaces.

```bash
bun dev          # both applications
bun dev:web      # only apps/web  (http://localhost:3000)
bun dev:api      # only apps/api  (http://localhost:8080)

bun check        # typecheck every workspace (tsc --noEmit)
bun test         # run every test suite
bun run build    # build every workspace
bun lint         # Biome lint
bun format       # Biome format, in place
```

`bun run build` is required rather than `bun build`, which is Bun's own bundler
command.

Run a production build directly:

```bash
bun --filter @diary/web start   # serves apps/web/dist via server.ts
bun --filter @diary/api start   # runs apps/api/dist/index.js
```

Database commands need `DB_URL` in the environment:

```bash
DB_URL="postgresql://…" bun --filter @diary/database db:generate
DB_URL="postgresql://…" bun run migrate
DB_URL="postgresql://…" bun --filter @diary/database db:studio
```

## Task graph

`turbo.json` defines the pipeline:

- `dev` — persistent, never cached.
- `build` — depends on upstream builds. `@diary/contracts` and
  `@diary/database` declare no outputs because they are consumed as TypeScript
  source through their `exports` maps; only the applications emit artifacts
  (`dist/**`, `.output/**`).
- `check` — depends on upstream `check`, so a contract type error surfaces
  before the consumer is typechecked.
- `test` — depends on upstream `build`.

Because the shared packages export `./src/*.ts` directly, there is no build step
between editing a contract and using it — `bun dev` picks it up immediately.

## Code style

Biome (`biome.json`) is the single formatter and linter:

- 4-space indentation, 100-column lines
- double quotes, always semicolons, no trailing commas
- recommended lint preset, with `suspicious/noUnknownAtRules` disabled for
  Tailwind directives
- generated and build output excluded: `routeTree.gen.ts`, `.turbo`, `dist`,
  `.output`, `drizzle/meta`, `node_modules`, and web SVGs

TypeScript settings are shared through `tsconfig.base.json`: strict mode,
`noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
and `noEmit`. Each workspace extends it and adds only what differs (`types:
["bun"]` for the API, JSX and the `@/*` alias for the web app).

`noUncheckedIndexedAccess` is why array access in this codebase is destructured
and null-checked (`const [row] = await …; if (!row) …`) instead of indexed
directly.

## Tests

Tests use `bun:test` and live beside the code as `*.test.ts`. Current coverage
includes:

| File | Covers |
| --- | --- |
| `src/lib/cipher.test.ts` | GCM round trip, legacy CBC decryption, tamper rejection |
| `src/modules/documents/service.test.ts` | Ownership, plan gating, free-plan daily limit, encryption at the service boundary |
| `apps/web/src/lib/document-content.test.ts` | Legacy editor content normalization |
| `apps/web/src/lib/document-draft.test.ts` | Draft lifecycle and save behavior |
| `apps/web/src/lib/markdown-formatting.test.ts` | Markdown formatting commands |

Every workspace's `test` script passes `--pass-with-no-tests`, so `bun test`
succeeds in packages that have none.

The pattern to follow for API business rules is to test services rather than
routes. `DocumentService` takes the `DocumentStore` interface, so
`MemoryDocumentStore` exercises the real rules with no database. Keep new
business rules in the service layer and this stays cheap.

Run one file:

```bash
bun test apps/api/src/lib/cipher.test.ts
```

There is no CI workflow in this repository — `.github/` contains only funding
metadata. `bun check`, `bun test`, and `bun lint` are run locally before
pushing; nothing gates a merge automatically.

## Recipes

### Add or change an API endpoint

1. Add the request and response schemas to `packages/contracts/src/`, and export
   them from `index.ts`.
2. Add the rule to the module's service, throwing helpers from
   `src/lib/errors.ts` (`badRequest`, `unauthorized`, `forbidden`, `notFound`,
   or `new AppError(...)`) for anything the client should see.
3. Add the repository method if it needs new SQL. Scope every document query to
   `(id, owner_id)`.
4. Register the route in `src/modules/<name>/routes.ts` with the contract
   schemas and a `detail.summary`, which becomes the OpenAPI description.
5. Add the client method to `apps/web/src/lib/api-client.ts` and a query or
   mutation in `apps/web/src/features/`.
6. `bun check && bun test`.

Mount new route groups in `createApp()` in `apps/api/src/app.ts` and construct
their dependencies in `apps/api/src/index.ts`.

### Change the database schema

See [Data model → Migrations](./data-model.md#migrations). In short: edit
`packages/database/src/schema.ts`, run `bun run db:generate`, review the SQL,
run `bun run migrate`, and commit the SQL together with `drizzle/meta`.

If the change affects the initial schema used by the Compose image, note that
`infra/Dockerfile` copies `0000_breezy_plazm.sql` by name — a rename there needs
a matching edit in the Dockerfile.

### Add a UI component

```bash
bun --filter @diary/web ui:add dialog
```

shadcn writes into `src/components/ui/` using the aliases in `components.json`.
Compose feature components from those primitives rather than importing Radix
directly.

### Add an analytics event

Add the name to the `AnalyticsEvent` union in `apps/web/src/lib/analytics.ts`
first; the union is closed, so `trackAnalytics` will not typecheck otherwise.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| API exits at startup with a Zod error | A required variable is missing or malformed. See [Configuration](./configuration.md). |
| Auth email returns an error | `RESEND_API_KEY`, the verified sender domain, or `AUTH_EMAIL_FROM` is incorrect |
| Authentication requests target the wrong host | `VITE_API_URL`, `API_URL`, or `WEB_URL` is incorrect |
| Stripe checkout or portal fails | Stripe credentials, Plus price, or webhook configuration is missing or mismatched |
| Every browser request fails CORS | `WEB_URL` on the API does not match the origin the browser loaded |
| Requests return 401 despite signing in | The browser omitted credentials, cookies are blocked, or API/web origins are misconfigured |
| Web app calls `localhost:8080` in production | `VITE_API_URL` was missing at **build** time; rebuild the image |
| Entries fail to decrypt | `ENCRYPTION_KEY` changed. See [Security](./security.md#key-handling). |
