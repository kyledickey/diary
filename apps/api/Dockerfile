# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14-slim AS build
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
RUN bun install --frozen-lockfile

COPY apps/api apps/api
COPY packages packages
RUN bun --filter @diary/api build

FROM oven/bun:1.3.14-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build --chown=bun:bun /app/apps/api/dist ./dist

USER bun
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["bun", "-e", "process.exit((await fetch('http://127.0.0.1:8080/health')).ok ? 0 : 1)"]

CMD ["bun", "dist/index.js"]
