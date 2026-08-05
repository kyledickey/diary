import { randomUUID } from "node:crypto";
import { createDatabase, subscriptions, users } from "@diary/database";
import { baselineLegacySchema, runMigrations } from "@diary/database/migrate";
import Stripe from "stripe";
import { parseClerkUsers } from "./modules/auth/clerk-import";

const csvPath = Bun.argv[2];
if (!csvPath) {
    throw new Error("Usage: bun run migrate:clerk -- /absolute/path/to/clerk-users.csv");
}

const databaseUrl = requiredEnv("DB_URL");
const stripeSecretKey = requiredEnv("STRIPE_SECRET_KEY");
const plusPriceId = requiredEnv("STRIPE_PLUS_PRICE_ID");
const legacyFreePriceId = Bun.env.STRIPE_FREE_PRICE_ID?.trim() || null;
const exportedUsers = parseClerkUsers(await Bun.file(csvPath).text());

await baselineLegacySchema(databaseUrl, Bun.env.DATABASE_MIGRATIONS_DIR);
await runMigrations(databaseUrl, Bun.env.DATABASE_MIGRATIONS_DIR);

const { client, db } = createDatabase(databaseUrl);
const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-07-29.dahlia",
    typescript: true
});

try {
    const existingUsers = await db.select().from(users);
    const existingEmailOwners = new Map(
        existingUsers.map((user) => [user.email.toLowerCase(), user.id] as const)
    );
    const importedIds = new Set(exportedUsers.map((user) => user.id));
    const missingFromExport = existingUsers.filter((user) => !importedIds.has(user.id));

    if (missingFromExport.length > 0) {
        throw new Error(
            `${missingFromExport.length} PostgreSQL user(s) were not present in the Clerk export`
        );
    }

    for (const user of exportedUsers) {
        const existingOwner = existingEmailOwners.get(user.email);
        if (existingOwner && existingOwner !== user.id) {
            throw new Error(
                `${user.email} belongs to ${existingOwner} in PostgreSQL but ${user.id} in Clerk`
            );
        }
    }

    await db.transaction(async (transaction) => {
        for (const user of exportedUsers) {
            await transaction
                .insert(users)
                .values({
                    id: user.id,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    name: user.name,
                    username: user.username,
                    createdAt: user.createdAt,
                    updatedAt: user.createdAt
                })
                .onConflictDoUpdate({
                    target: users.id,
                    set: {
                        email: user.email,
                        emailVerified: user.emailVerified,
                        name: user.name,
                        username: user.username,
                        updatedAt: new Date()
                    }
                });
        }
    });

    const billingUsers = await db
        .select({
            id: users.id,
            stripeCustomerId: users.stripeCustomerId
        })
        .from(users);

    let importedPlusSubscriptions = 0;
    let canceledLegacyFreeSubscriptions = 0;

    for (const user of billingUsers) {
        if (!user.stripeCustomerId) {
            continue;
        }

        await stripe.customers.update(user.stripeCustomerId, {
            metadata: {
                customerType: "user",
                userId: user.id
            }
        });

        const stripeSubscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            limit: 100,
            status: "all"
        });

        for (const stripeSubscription of stripeSubscriptions.data) {
            const plusItem = stripeSubscription.items.data.find(
                (item) => item.price.id === plusPriceId
            );
            const isLegacyFree =
                legacyFreePriceId !== null &&
                stripeSubscription.items.data.some((item) => item.price.id === legacyFreePriceId);

            if (
                isLegacyFree &&
                !["canceled", "incomplete_expired"].includes(stripeSubscription.status)
            ) {
                await stripe.subscriptions.cancel(stripeSubscription.id);
                canceledLegacyFreeSubscriptions += 1;
                continue;
            }

            if (!plusItem) {
                continue;
            }

            await db
                .insert(subscriptions)
                .values({
                    id: randomUUID(),
                    plan: "plus",
                    referenceId: user.id,
                    stripeCustomerId: user.stripeCustomerId,
                    stripeSubscriptionId: stripeSubscription.id,
                    status: stripeSubscription.status,
                    periodStart: new Date(plusItem.current_period_start * 1000),
                    periodEnd: new Date(plusItem.current_period_end * 1000),
                    trialStart: stripeSubscription.trial_start
                        ? new Date(stripeSubscription.trial_start * 1000)
                        : null,
                    trialEnd: stripeSubscription.trial_end
                        ? new Date(stripeSubscription.trial_end * 1000)
                        : null,
                    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                    cancelAt: stripeSubscription.cancel_at
                        ? new Date(stripeSubscription.cancel_at * 1000)
                        : null,
                    canceledAt: stripeSubscription.canceled_at
                        ? new Date(stripeSubscription.canceled_at * 1000)
                        : null,
                    endedAt: stripeSubscription.ended_at
                        ? new Date(stripeSubscription.ended_at * 1000)
                        : null,
                    seats: plusItem.quantity ?? 1,
                    billingInterval: plusItem.price.recurring?.interval ?? null,
                    stripeScheduleId:
                        typeof stripeSubscription.schedule === "string"
                            ? stripeSubscription.schedule
                            : (stripeSubscription.schedule?.id ?? null)
                })
                .onConflictDoUpdate({
                    target: subscriptions.stripeSubscriptionId,
                    set: {
                        referenceId: user.id,
                        stripeCustomerId: user.stripeCustomerId,
                        status: stripeSubscription.status,
                        periodStart: new Date(plusItem.current_period_start * 1000),
                        periodEnd: new Date(plusItem.current_period_end * 1000),
                        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
                    }
                });
            importedPlusSubscriptions += 1;
        }
    }

    console.info("Clerk migration completed", {
        users: exportedUsers.length,
        importedPlusSubscriptions,
        canceledLegacyFreeSubscriptions
    });
} finally {
    await client.end();
}

function requiredEnv(name: string) {
    const value = Bun.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}
