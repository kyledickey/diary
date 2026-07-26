# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14-slim AS dependencies
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
RUN bun install --frozen-lockfile

FROM dependencies AS build
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}

COPY apps/web apps/web
COPY packages packages

RUN test -n "${VITE_API_URL}" && test -n "${VITE_CLERK_PUBLISHABLE_KEY}"
RUN bun --filter @diary/web build

FROM dependencies AS production-dependencies
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.14-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=production-dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=bun:bun /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=production-dependencies --chown=bun:bun /app/packages ./packages
COPY --from=build --chown=bun:bun /app/apps/web/package.json ./apps/web/package.json
COPY --from=build --chown=bun:bun /app/apps/web/server.ts ./apps/web/server.ts
COPY --from=build --chown=bun:bun /app/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/web
USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["bun", "-e", "const port = Bun.env.PORT ?? '3000'; process.exit((await fetch(`http://127.0.0.1:${port}/`)).ok ? 0 : 1)"]

CMD ["bun", "server.ts"]
