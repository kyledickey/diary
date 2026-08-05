import { baselineLegacySchema, runMigrations } from "@diary/database/migrate";

const databaseUrl = Bun.env.DB_URL;

if (!databaseUrl) {
    throw new Error("DB_URL is required to run database migrations");
}

await baselineLegacySchema(databaseUrl, Bun.env.DATABASE_MIGRATIONS_DIR);
await runMigrations(databaseUrl, Bun.env.DATABASE_MIGRATIONS_DIR);
console.info("Database migrations completed");
