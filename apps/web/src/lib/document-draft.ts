import type { Document } from "@diary/contracts";
import { normalizeDocumentContent } from "./document-content";

export interface DocumentDraft {
    title: string;
    content: string;
    metadata: Document["metadata"];
}

export function createInitialDocumentDraft(document: Document): DocumentDraft {
    return {
        ...toDocumentDraft(document),
        content: normalizeDocumentContent(document.content)
    };
}

export function reconcileSavedDocumentDraft(
    current: DocumentDraft,
    saved: Document,
    didSaveContent: boolean
): DocumentDraft {
    const savedDraft = toDocumentDraft(saved);
    return {
        ...savedDraft,
        content: didSaveContent ? savedDraft.content : current.content
    };
}

function toDocumentDraft(document: Document): DocumentDraft {
    return {
        title: document.title ?? "Untitled",
        content: document.content ?? "",
        metadata: document.metadata
    };
}
