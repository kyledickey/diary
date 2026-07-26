import { randomUUID } from "node:crypto";
import {
    type CreateDocumentRequest,
    type Document,
    type DocumentSummary,
    defaultDocumentMetadata,
    type Plan,
    type UpdateDocumentRequest
} from "@diary/contracts";
import type { DocumentCipher } from "../../lib/cipher";
import { AppError, forbidden, notFound } from "../../lib/errors";
import type { DocumentChanges, DocumentStore } from "./repository";

export class DocumentService {
    constructor(
        private readonly repository: DocumentStore,
        private readonly cipher: DocumentCipher
    ) {}

    list(ownerId: string): Promise<DocumentSummary[]> {
        return this.repository.list(ownerId);
    }

    async get(ownerId: string, id: string): Promise<Document> {
        const document = await this.repository.find(ownerId, id);

        if (!document) {
            throw notFound("Document");
        }

        return this.decrypt(document);
    }

    async create(ownerId: string, request: CreateDocumentRequest, plan: Plan): Promise<Document> {
        if (plan === "free") {
            const localDayStart = this.getLocalDayStart(request.timezoneOffsetMinutes);
            const alreadyCreated = await this.repository.hasCreatedSince(ownerId, localDayStart);

            if (alreadyCreated) {
                throw new AppError(409, "CONFLICT", "You have already created an entry today");
            }
        }

        const now = Math.floor(Date.now() / 1000);
        return this.repository.create({
            id: randomUUID(),
            owner_id: ownerId,
            title: request.title,
            content: null,
            created_at: now,
            updated_at: now,
            metadata: defaultDocumentMetadata
        });
    }

    async update(
        ownerId: string,
        id: string,
        request: UpdateDocumentRequest,
        plan: Plan
    ): Promise<Document> {
        const existing = await this.repository.find(ownerId, id);

        if (!existing) {
            throw notFound("Document");
        }

        const normalizedTitle =
            request.title === undefined
                ? undefined
                : request.title.trim().slice(0, 255) || "Untitled";

        if (
            plan === "free" &&
            normalizedTitle !== undefined &&
            normalizedTitle !== existing.title
        ) {
            throw forbidden("A Plus plan is required to edit entry titles");
        }

        const changes: DocumentChanges = {
            updated_at: Math.floor(Date.now() / 1000)
        };

        if (request.content !== undefined) {
            changes.content = this.cipher.encrypt(request.content);
        }
        if (normalizedTitle !== undefined) {
            changes.title = normalizedTitle;
        }
        if (request.metadata !== undefined) {
            changes.metadata = request.metadata;
        }

        const updated = await this.repository.update(ownerId, id, changes);

        if (!updated) {
            throw notFound("Document");
        }

        return this.decrypt(updated);
    }

    async delete(ownerId: string, id: string): Promise<void> {
        const deleted = await this.repository.delete(ownerId, id);

        if (!deleted) {
            throw notFound("Document");
        }
    }

    private decrypt(document: Document): Document {
        return {
            ...document,
            content: document.content ? this.cipher.decrypt(document.content) : null
        };
    }

    private getLocalDayStart(timezoneOffsetMinutes: number): number {
        const now = new Date();
        const localTime = new Date(now.getTime() - timezoneOffsetMinutes * 60_000);
        localTime.setUTCHours(0, 0, 0, 0);
        return Math.floor((localTime.getTime() + timezoneOffsetMinutes * 60_000) / 1000);
    }
}
