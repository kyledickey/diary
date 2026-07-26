import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    DB_URL: z.url(),
    WEB_URL: z.url().default("http://localhost:3000"),
    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_JWT_KEY: z.string().min(1).optional(),
    CLERK_AUTHORIZED_PARTIES: z.string().optional(),
    CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
    CLERK_USER_WH_SECRET: z.string().min(1).optional(),
    ENCRYPTION_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_FREE_PRICE_ID: z.string().min(1),
    STRIPE_PLUS_PRICE_ID: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1)
});

export type Env = ReturnType<typeof loadEnv>;

export function loadEnv(source: Record<string, string | undefined> = process.env) {
    const env = envSchema.parse(source);
    const clerkWebhookSecret = env.CLERK_WEBHOOK_SIGNING_SECRET ?? env.CLERK_USER_WH_SECRET;

    if (!clerkWebhookSecret) {
        throw new Error(
            "CLERK_WEBHOOK_SIGNING_SECRET (or legacy CLERK_USER_WH_SECRET) is required"
        );
    }

    return {
        nodeEnv: env.NODE_ENV,
        port: env.PORT,
        databaseUrl: env.DB_URL,
        webUrl: env.WEB_URL.replace(/\/$/, ""),
        clerk: {
            publishableKey: env.CLERK_PUBLISHABLE_KEY,
            secretKey: env.CLERK_SECRET_KEY,
            jwtKey: env.CLERK_JWT_KEY,
            webhookSecret: clerkWebhookSecret,
            authorizedParties: env.CLERK_AUTHORIZED_PARTIES
                ? env.CLERK_AUTHORIZED_PARTIES.split(",").map((party) => party.trim())
                : [env.WEB_URL.replace(/\/$/, "")]
        },
        encryptionKey: env.ENCRYPTION_KEY,
        stripe: {
            secretKey: env.STRIPE_SECRET_KEY,
            freePriceId: env.STRIPE_FREE_PRICE_ID,
            plusPriceId: env.STRIPE_PLUS_PRICE_ID,
            webhookSecret: env.STRIPE_WEBHOOK_SECRET
        }
    };
}
