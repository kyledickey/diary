import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "./index";

export async function runMigrations(
    databaseUrl: string,
    migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url))
) {
    const { client, db } = createDatabase(databaseUrl);

    try {
        await migrate(db, { migrationsFolder });
    } finally {
        await client.end();
    }
}

/** Baseline Compose databases created before Drizzle tracked migrations. */
export async function baselineLegacySchema(
    databaseUrl: string,
    migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url))
) {
    const { client } = createDatabase(databaseUrl);

    try {
        const [databaseState] = await client<
            Array<{
                documents: string | null;
                users: string | null;
                migrations: string | null;
            }>
        >`
            SELECT
                to_regclass('public.documents')::text AS documents,
                to_regclass('public.users')::text AS users,
                to_regclass('drizzle.__drizzle_migrations')::text AS migrations
        `;
        if (!databaseState) {
            throw new Error("Could not inspect the database migration state");
        }
        const { documents, users, migrations } = databaseState;
        let migrationCount = 0;

        if (migrations) {
            const [migrationState] = await client<Array<{ migrationCount: number }>>`
                SELECT count(*)::int AS "migrationCount"
                FROM drizzle.__drizzle_migrations
            `;
            if (!migrationState) {
                throw new Error("Could not inspect the migration history");
            }
            migrationCount = migrationState.migrationCount;
        }

        if (migrationCount > 0 || (!documents && !users)) {
            return;
        }

        if (!documents || !users) {
            throw new Error(
                "The legacy database is incomplete: expected both public.documents and public.users"
            );
        }

        const expectedColumns = [
            ["documents", "id"],
            ["documents", "owner_id"],
            ["documents", "created_at"],
            ["documents", "updated_at"],
            ["users", "id"],
            ["users", "email"],
            ["users", "created_at"],
            ["users", "updated_at"]
        ];
        const columns = await client<Array<{ tableName: string; columnName: string }>>`
            SELECT table_name AS "tableName", column_name AS "columnName"
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name IN ('documents', 'users')
        `;
        const presentColumns = new Set(
            columns.map((column) => `${column.tableName}.${column.columnName}`)
        );
        const missingColumns = expectedColumns.filter(
            ([table, column]) => !presentColumns.has(`${table}.${column}`)
        );

        if (missingColumns.length > 0) {
            throw new Error(
                `The legacy database does not match migration 0000; missing ${missingColumns
                    .map(([table, column]) => `${table}.${column}`)
                    .join(", ")}`
            );
        }

        const migrationSql = await readFile(`${migrationsFolder}/0000_breezy_plazm.sql`, "utf8");
        const hash = createHash("sha256").update(migrationSql).digest("hex");

        await client.begin(async (transaction) => {
            await transaction`CREATE SCHEMA IF NOT EXISTS drizzle`;
            await transaction`
                CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
                    id SERIAL PRIMARY KEY,
                    hash text NOT NULL,
                    created_at bigint
                )
            `;
            await transaction`
                INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
                SELECT ${hash}, ${1785022832291}
                WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations)
            `;
        });
    } finally {
        await client.end();
    }
}
