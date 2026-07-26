import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DB_URL;

if (!databaseUrl) {
    throw new Error("DB_URL is required to run Drizzle commands");
}

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/schema.ts",
    out: "./drizzle",
    dbCredentials: {
        url: databaseUrl
    }
});
