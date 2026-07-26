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
