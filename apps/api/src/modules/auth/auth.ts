import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { stripe } from "@better-auth/stripe";
import type { Database } from "@diary/database";
import {
    accounts,
    accountsRelations,
    documentRelations,
    documents,
    sessions,
    sessionsRelations,
    subscriptions,
    users,
    usersRelations,
    verifications
} from "@diary/database";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import Stripe from "stripe";
import type { Env } from "../../config/env";
import { AuthEmailService } from "./email";

const databaseSchema = {
    account: accounts,
    accounts,
    accountsRelations,
    document: documents,
    documents,
    documentRelations,
    session: sessions,
    sessions,
    sessionsRelations,
    subscription: subscriptions,
    subscriptions,
    user: users,
    users,
    usersRelations,
    verification: verifications,
    verifications
};

export function createAuth(db: Database, env: Env) {
    const email = new AuthEmailService({
        apiKey: env.resendApiKey,
        from: env.auth.emailFrom,
        webUrl: env.webUrl
    });
    const stripeClient = new Stripe(env.stripe.secretKey, {
        apiVersion: "2026-07-29.dahlia",
        typescript: true
    });

    return betterAuth({
        appName: "Diary",
        baseURL: env.apiUrl,
        basePath: "/api/auth",
        secret: env.auth.secret,
        trustedOrigins: [env.webUrl],
        database: drizzleAdapter(db, {
            provider: "pg",
            schema: databaseSchema
        }),
        advanced: {
            cookiePrefix: "diary",
            disableCSRFCheck: false,
            useSecureCookies: env.nodeEnv === "production",
            database: {
                generateId: () => crypto.randomUUID()
            }
        },
        session: {
            expiresIn: 60 * 60 * 24 * 30,
            updateAge: 60 * 60 * 24
        },
        rateLimit: {
            enabled: true,
            customRules: {
                "/email-otp/send-verification-otp": {
                    window: 60,
                    max: 1
                }
            }
        },
        user: {
            additionalFields: {
                username: {
                    type: "string",
                    required: false,
                    input: false
                }
            },
            deleteUser: {
                enabled: true,
                beforeDelete: async (user) => {
                    const stripeCustomerId = getStripeCustomerId(user);
                    if (stripeCustomerId) {
                        await stripeClient.customers.del(stripeCustomerId);
                    }
                }
            }
        },
        plugins: [
            emailOTP({
                expiresIn: 60 * 10,
                otpLength: 6,
                allowedAttempts: 5,
                storeOTP: "hashed",
                sendVerificationOTP: ({ email: address, otp, type }) => {
                    if (type !== "sign-in") {
                        throw new Error(`Unsupported Diary email OTP type: ${type}`);
                    }
                    return email.sendOtp(address, otp);
                }
            }),
            stripe({
                stripeClient,
                stripeWebhookSecret: env.stripe.webhookSecret,
                createCustomerOnSignUp: false,
                subscription: {
                    enabled: true,
                    plans: [
                        {
                            name: "plus",
                            priceId: env.stripe.plusPriceId
                        }
                    ],
                    authorizeReference: async ({ user, referenceId }) => user.id === referenceId
                }
            })
        ]
    });
}

export type Auth = ReturnType<typeof createAuth>;

function getStripeCustomerId(user: object): string | null {
    if (!("stripeCustomerId" in user)) {
        return null;
    }
    return typeof user.stripeCustomerId === "string" ? user.stripeCustomerId : null;
}
