import { describe, expect, test } from "bun:test";
import { type Document, type DocumentSummary, defaultDocumentMetadata } from "@diary/contracts";
import { DocumentCipher } from "../../lib/cipher";
import type { AppError } from "../../lib/errors";
import type { DocumentChanges, DocumentStore } from "./repository";
import { DocumentService } from "./service";

class MemoryDocumentStore implements DocumentStore {
    readonly documents = new Map<string, Document>();
    updateCalls = 0;
    hasRecentDocument = false;

    list(ownerId: string): Promise<DocumentSummary[]> {
        return Promise.resolve(
            [...this.documents.values()]
                .filter((document) => document.owner_id === ownerId)
                .map(({ content: _content, ...document }) => document)
        );
    }

    find(ownerId: string, id: string): Promise<Document | null> {
        const document = this.documents.get(id);
        return Promise.resolve(document?.owner_id === ownerId ? document : null);
    }

    create(document: Document): Promise<Document> {
        this.documents.set(document.id, document);
        return Promise.resolve(document);
    }

    createForFreePlan(document: Document): Promise<Document | null> {
        if (this.hasRecentDocument) {
            return Promise.resolve(null);
        }

        this.hasRecentDocument = true;
        this.documents.set(document.id, document);
        return Promise.resolve(document);
    }

    update(ownerId: string, id: string, changes: DocumentChanges): Promise<Document | null> {
        this.updateCalls += 1;
        const existing = this.documents.get(id);
        if (!existing || existing.owner_id !== ownerId) {
            return Promise.resolve(null);
        }

        const updated = { ...existing, ...changes };
        this.documents.set(id, updated);
        return Promise.resolve(updated);
    }

    delete(ownerId: string, id: string): Promise<boolean> {
        const existing = this.documents.get(id);
        return Promise.resolve(existing?.owner_id === ownerId && this.documents.delete(id));
    }
}

const encryptionKey = Buffer.alloc(32, 7).toString("base64");

function createFixture() {
    const store = new MemoryDocumentStore();
    const cipher = new DocumentCipher(encryptionKey);
    const service = new DocumentService(store, cipher);
    const document: Document = {
        id: "8d756adc-9e52-4724-828b-01802156d733",
        owner_id: "user_owner",
        title: "Today",
        content: null,
        created_at: 1_700_000_000,
        updated_at: 1_700_000_000,
        metadata: defaultDocumentMetadata
    };
    store.documents.set(document.id, document);
    return { cipher, document, service, store };
}

describe("DocumentService", () => {
    test("does not reveal or update another user's document", async () => {
        const { document, service, store } = createFixture();

        await expect(service.get("user_attacker", document.id)).rejects.toMatchObject({
            status: 404,
            code: "NOT_FOUND"
        } satisfies Partial<AppError>);
        await expect(
            service.update("user_attacker", document.id, { content: "stolen" }, "plus")
        ).rejects.toMatchObject({
            status: 404,
            code: "NOT_FOUND"
        } satisfies Partial<AppError>);
        expect(store.updateCalls).toBe(0);
    });

    test("enforces paid title editing on the server", async () => {
        const { document, service, store } = createFixture();

        await expect(
            service.update("user_owner", document.id, { title: "Renamed" }, "free")
        ).rejects.toMatchObject({
            status: 403,
            code: "FORBIDDEN"
        } satisfies Partial<AppError>);
        expect(store.updateCalls).toBe(0);
    });

    test("stores authenticated ciphertext and returns plaintext", async () => {
        const { cipher, document, service, store } = createFixture();

        const updated = await service.update(
            "user_owner",
            document.id,
            { content: "A private thought" },
            "plus"
        );
        const stored = store.documents.get(document.id);

        expect(updated.content).toBe("A private thought");
        expect(stored?.content).toStartWith("v2:");
        expect(cipher.decrypt(stored?.content ?? "")).toBe("A private thought");
    });

    test("enforces the free daily entry limit on the server", async () => {
        const { service, store } = createFixture();
        store.hasRecentDocument = true;

        await expect(
            service.create("user_owner", { title: "Another", timezoneOffsetMinutes: 360 }, "free")
        ).rejects.toMatchObject({
            status: 409,
            code: "CONFLICT"
        } satisfies Partial<AppError>);
    });
});
