# syntax=docker/dockerfile:1

FROM postgres:18-alpine

COPY packages/database/drizzle/0000_breezy_plazm.sql \
    /docker-entrypoint-initdb.d/0000_diary_schema.sql
RUN chmod 0444 /docker-entrypoint-initdb.d/0000_diary_schema.sql

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
