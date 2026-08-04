import { type DocumentMetadata, defaultDocumentMetadata } from "@diary/contracts";
import { relations } from "drizzle-orm";
import {
    bigint,
    boolean,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    varchar
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image_url"),
    username: varchar("username", { length: 255 }).unique(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable(
    "sessions",
    {
        id: varchar("id", { length: 255 }).primaryKey(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        token: varchar("token", { length: 255 }).notNull().unique(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: varchar("user_id", { length: 255 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" })
    },
    (table) => [index("sessions_user_id_idx").on(table.userId)]
);

export const accounts = pgTable(
    "accounts",
    {
        id: varchar("id", { length: 255 }).primaryKey(),
        accountId: varchar("account_id", { length: 255 }).notNull(),
        providerId: varchar("provider_id", { length: 255 }).notNull(),
        userId: varchar("user_id", { length: 255 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [
        index("accounts_user_id_idx").on(table.userId),
        uniqueIndex("accounts_provider_account_idx").on(table.providerId, table.accountId)
    ]
);

export const verifications = pgTable(
    "verifications",
    {
        id: varchar("id", { length: 255 }).primaryKey(),
        identifier: varchar("identifier", { length: 255 }).notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [index("verifications_identifier_idx").on(table.identifier)]
);

export const subscriptions = pgTable(
    "subscriptions",
    {
        id: varchar("id", { length: 255 }).primaryKey(),
        plan: varchar("plan", { length: 64 }).notNull(),
        referenceId: varchar("reference_id", { length: 255 }).notNull(),
        stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
        stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
        status: varchar("status", { length: 64 }).notNull().default("incomplete"),
        periodStart: timestamp("period_start", { withTimezone: true }),
        periodEnd: timestamp("period_end", { withTimezone: true }),
        trialStart: timestamp("trial_start", { withTimezone: true }),
        trialEnd: timestamp("trial_end", { withTimezone: true }),
        cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
        cancelAt: timestamp("cancel_at", { withTimezone: true }),
        canceledAt: timestamp("canceled_at", { withTimezone: true }),
        endedAt: timestamp("ended_at", { withTimezone: true }),
        seats: integer("seats"),
        billingInterval: varchar("billing_interval", { length: 32 }),
        stripeScheduleId: varchar("stripe_schedule_id", { length: 255 })
    },
    (table) => [
        index("subscriptions_reference_id_idx").on(table.referenceId),
        uniqueIndex("subscriptions_stripe_subscription_id_idx").on(table.stripeSubscriptionId)
    ]
);

export const documents = pgTable(
    "documents",
    {
        id: varchar("id", { length: 255 }).primaryKey(),
        owner_id: varchar("owner_id", { length: 255 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        title: text("title"),
        content: text("content"),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        metadata: jsonb("metadata")
            .$type<DocumentMetadata>()
            .notNull()
            .default(defaultDocumentMetadata)
    },
    (table) => [index("documents_owner_created_idx").on(table.owner_id, table.created_at)]
);

export const usersRelations = relations(users, ({ many }) => ({
    accounts: many(accounts),
    documents: many(documents),
    sessions: many(sessions)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id]
    })
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id]
    })
}));

export const documentRelations = relations(documents, ({ one }) => ({
    owner: one(users, {
        fields: [documents.owner_id],
        references: [users.id]
    })
}));
