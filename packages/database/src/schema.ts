import { type DocumentMetadata, defaultDocumentMetadata } from "@diary/contracts";
import { relations } from "drizzle-orm";
import { bigint, index, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: varchar("id", { length: 255 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    image_url: text("image_url"),
    username: varchar("username", { length: 255 }).unique(),
    stripe_customer_id: varchar("stripe_customer_id", { length: 255 }),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
    updated_at: bigint("updated_at", { mode: "number" }).notNull()
});

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
    documents: many(documents)
}));

export const documentRelations = relations(documents, ({ one }) => ({
    owner: one(users, {
        fields: [documents.owner_id],
        references: [users.id]
    })
}));
