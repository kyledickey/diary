import { createDatabase } from "@diary/database";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { DocumentCipher } from "./lib/cipher";
import { logger } from "./lib/logger";
import { AuthService } from "./modules/auth/service";
import { BillingService } from "./modules/billing/service";
import { DocumentRepository } from "./modules/documents/repository";
import { DocumentService } from "./modules/documents/service";
import { UserRepository } from "./modules/users/repository";
import { UserService } from "./modules/users/service";

const env = loadEnv();
const { db } = createDatabase(env.databaseUrl);
const auth = new AuthService(env.clerk);
const users = new UserService(new UserRepository(db));
const billing = new BillingService(env.stripe, env.webUrl, auth, users);
const documents = new DocumentService(
    new DocumentRepository(db),
    new DocumentCipher(env.encryptionKey)
);

const app = createApp({
    env,
    logger,
    auth,
    documents,
    billing,
    users
});

app.listen(env.port);
logger.info("Diary API started", {
    port: env.port,
    environment: env.nodeEnv
});

export type App = typeof app;
