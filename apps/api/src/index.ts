import { createDatabase } from "@diary/database";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { DocumentCipher } from "./lib/cipher";
import { logger } from "./lib/logger";
import { createAuth } from "./modules/auth/auth";
import { AuthService } from "./modules/auth/service";
import { DocumentRepository } from "./modules/documents/repository";
import { DocumentService } from "./modules/documents/service";

const env = loadEnv();
const { db } = createDatabase(env.databaseUrl);
const auth = new AuthService(createAuth(db, env), db);
const documents = new DocumentService(
    new DocumentRepository(db),
    new DocumentCipher(env.encryptionKey)
);

const app = createApp({
    env,
    logger,
    auth,
    documents
});

app.listen(env.port);
logger.info("Diary API started", {
    port: env.port,
    environment: env.nodeEnv
});

export type App = typeof app;
