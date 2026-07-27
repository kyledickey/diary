import { describe, expect, test } from "bun:test";
import type { Document } from "@diary/contracts";
import { createInitialDocumentDraft, reconcileSavedDocumentDraft } from "./document-draft";

const plateShapedText = '[{"children":[{"text":"hello"}]}]';

describe("document draft lifecycle", () => {
    test("normalizes legacy Plate content on initial load", () => {
        const draft = createInitialDocumentDraft(createDocument(plateShapedText));
        expect(draft.content).toBe("hello");
    });

    test("preserves user-authored Plate-shaped text after a content save", () => {
        const current = {
            ...createInitialDocumentDraft(createDocument("")),
            content: plateShapedText
        };
        const saved = createDocument(plateShapedText);

        expect(reconcileSavedDocumentDraft(current, saved, true).content).toBe(plateShapedText);
    });

    test("retains normalized content after a metadata-only save", () => {
        const current = createInitialDocumentDraft(createDocument(plateShapedText));
        const saved = {
            ...createDocument(plateShapedText),
            title: "Updated title",
            metadata: { font: "sans", font_size: 20 } as const
        };

        expect(reconcileSavedDocumentDraft(current, saved, false)).toEqual({
            title: "Updated title",
            content: "hello",
            metadata: { font: "sans", font_size: 20 }
        });
    });
});

function createDocument(content: string): Document {
    return {
        id: "01e906c4-5319-47ff-a3b9-d66bc3463d0c",
        owner_id: "user_mock",
        title: "Original title",
        content,
        created_at: 1_700_000_000,
        updated_at: 1_700_000_000,
        metadata: { font: "serif", font_size: 18 }
    };
}
