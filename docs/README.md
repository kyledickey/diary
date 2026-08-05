# Diary documentation

Diary is a private journaling application. Entries are written in a browser,
stored encrypted in PostgreSQL, and gated by a Better Auth session and Stripe
subscription state.

This directory is the single documentation source for the whole monorepo. Start
here, then follow the guide that matches the task.

## Guides

| Guide | Read it when you want to |
| --- | --- |
| [Getting started](./getting-started.md) | Run Diary locally for the first time |
| [Architecture](./architecture.md) | Understand the services, boundaries, and runtime flows |
| [Configuration](./configuration.md) | Look up an environment variable and where it is consumed |
| [HTTP API](./api.md) | Call, extend, or debug an API endpoint |
| [Data model](./data-model.md) | Work with the database schema, migrations, or stored ciphertext |
| [Web application](./web-app.md) | Change routes, data fetching, the editor, or UI state |
| [Development](./development.md) | Run commands, tests, and common change recipes |
| [Deployment](./deployment.md) | Build images, run Compose, or deploy to Railway |
| [Security](./security.md) | Reason about auth, ownership, encryption, and secrets |
| [Auth provider migration](./migrating-from-clerk.md) | Perform the one-time production auth and billing cutover |

## Repository layout

```
apps/web            TanStack Start web application (SSR via Bun)
apps/api            Elysia HTTP API
packages/contracts  Zod schemas shared by the web app and API
packages/database   Drizzle schema, migrations, and PostgreSQL connection
infra               PostgreSQL image with the initial schema baked in
docs                This documentation
```

Product history lives in [CHANGELOG.md](../CHANGELOG.md), which is also rendered
in the app at `/changelog`.
