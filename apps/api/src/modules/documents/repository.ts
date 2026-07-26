import type { Document, DocumentMetadata, DocumentSummary } from "@diary/contracts";
import { type Database, documents } from "@diary/database";
import { and, desc, eq, gte } from "drizzle-orm";

export interface DocumentChanges {
    content?: string;
    title?: string;
    metadata?: DocumentMetadata;
    updated_at: number;
}

export interface DocumentStore {
    list(ownerId: string): Promise<DocumentSummary[]>;
    find(ownerId: string, id: string): Promise<Document | null>;
    create(document: Document): Promise<Document>;
    update(ownerId: string, id: string, changes: DocumentChanges): Promise<Document | null>;
    delete(ownerId: string, id: string): Promise<boolean>;
    hasCreatedSince(ownerId: string, timestamp: number): Promise<boolean>;
}

export class DocumentRepository implements DocumentStore {
    constructor(private readonly db: Database) {}

    async list(ownerId: string): Promise<DocumentSummary[]> {
        return this.db
            .select({
                id: documents.id,
                owner_id: documents.owner_id,
                title: documents.title,
                created_at: documents.created_at,
                updated_at: documents.updated_at,
                metadata: documents.metadata
            })
            .from(documents)
            .where(eq(documents.owner_id, ownerId))
            .orderBy(desc(documents.created_at));
    }

    async find(ownerId: string, id: string): Promise<Document | null> {
        const [document] = await this.db
            .select()
            .from(documents)
            .where(and(eq(documents.id, id), eq(documents.owner_id, ownerId)))
            .limit(1);

        return document ?? null;
    }

    async create(document: Document): Promise<Document> {
        const [created] = await this.db.insert(documents).values(document).returning();

        if (!created) {
            throw new Error("Database did not return the created document");
        }

        return created;
    }

    async update(ownerId: string, id: string, changes: DocumentChanges): Promise<Document | null> {
        const [updated] = await this.db
            .update(documents)
            .set(changes)
            .where(and(eq(documents.id, id), eq(documents.owner_id, ownerId)))
            .returning();

        return updated ?? null;
    }

    async delete(ownerId: string, id: string): Promise<boolean> {
        const deleted = await this.db
            .delete(documents)
            .where(and(eq(documents.id, id), eq(documents.owner_id, ownerId)))
            .returning({ id: documents.id });

        return deleted.length === 1;
    }

    async hasCreatedSince(ownerId: string, timestamp: number): Promise<boolean> {
        const [document] = await this.db
            .select({ id: documents.id })
            .from(documents)
            .where(and(eq(documents.owner_id, ownerId), gte(documents.created_at, timestamp)))
            .limit(1);

        return document !== undefined;
    }
}
