# @diary/api

The Diary Elysia API.

The API owns Better Auth, Resend passwordless email, Stripe subscriptions, and
encrypted document persistence. Shared HTTP contracts live in
`@diary/contracts`, and all database schema and connection code lives in
`@diary/database`.

OpenAPI documentation is available at `/openapi` while the API is running.

```bash
bun --filter @diary/api dev
bun --filter @diary/api check
bun --filter @diary/api test
bun --filter @diary/api build
```
