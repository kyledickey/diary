import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    DB_URL: z.url(),
    WEB_URL: z.url().default("http://localhost:3000"),
    API_URL: z.url().default("http://localhost:8080"),
    BETTER_AUTH_SECRET: z.string().min(32),
    RESEND_API_KEY: z.string().min(1),
    AUTH_EMAIL_FROM: z.string().min(1).default("Diary <auth@mail.kyle.so>"),
    ENCRYPTION_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_PLUS_PRICE_ID: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1)
});

export type Env = ReturnType<typeof loadEnv>;

export function loadEnv(source: Record<string, string | undefined> = process.env) {
    const env = envSchema.parse(source);

    return {
        nodeEnv: env.NODE_ENV,
        port: env.PORT,
        databaseUrl: env.DB_URL,
        webUrl: env.WEB_URL.replace(/\/$/, ""),
        apiUrl: env.API_URL.replace(/\/$/, ""),
        auth: {
            secret: env.BETTER_AUTH_SECRET,
            emailFrom: env.AUTH_EMAIL_FROM
        },
        resendApiKey: env.RESEND_API_KEY,
        encryptionKey: env.ENCRYPTION_KEY,
        stripe: {
            secretKey: env.STRIPE_SECRET_KEY,
            plusPriceId: env.STRIPE_PLUS_PRICE_ID,
            webhookSecret: env.STRIPE_WEBHOOK_SECRET
        }
    };
}
