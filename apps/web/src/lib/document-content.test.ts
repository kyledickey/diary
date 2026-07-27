import { describe, expect, test } from "bun:test";
import type { Document } from "@diary/contracts";
import { normalizeDocumentContent } from "./document-content";

const mockDocuments = [
    {
        id: "01e906c4-5319-47ff-a3b9-d66bc3463d0c",
        owner_id: "user_mock",
        title: "Plate paragraphs",
        content: JSON.stringify([
            {
                type: "p",
                children: [{ text: "A quiet first paragraph." }]
            },
            {
                type: "p",
                children: [
                    { text: "A second paragraph with " },
                    { text: "emphasis.", italic: true }
                ]
            }
        ]),
        created_at: 1_700_000_000,
        updated_at: 1_700_000_000,
        metadata: { font: "serif", font_size: 18 }
    },
    {
        id: "7514ec6e-9c42-472c-a8ab-ee7f9a55511e",
        owner_id: "user_mock",
        title: "Structured Plate entry",
        content: JSON.stringify([
            {
                type: "h2",
                children: [{ text: "What I noticed" }]
            },
            {
                type: "blockquote",
                children: [{ type: "p", children: [{ text: "Write the honest version." }] }]
            },
            {
                type: "ul",
                children: [
                    { type: "li", children: [{ type: "p", children: [{ text: "Slow down" }] }] },
                    {
                        type: "li",
                        children: [
                            {
                                type: "p",
                                children: [{ text: "Keep the " }, { text: "useful", bold: true }]
                            }
                        ]
                    }
                ]
            }
        ]),
        created_at: 1_700_000_001,
        updated_at: 1_700_000_001,
        metadata: { font: "sans", font_size: 20 }
    },
    {
        id: "b6b65b28-c162-4b01-9676-ef120e39b503",
        owner_id: "user_mock",
        title: "Markdown entry",
        content: "# Already Markdown\n\nThis stays **exactly** as written.",
        created_at: 1_700_000_002,
        updated_at: 1_700_000_002,
        metadata: { font: "mono", font_size: 16 }
    }
] as const satisfies readonly Document[];

describe("normalizeDocumentContent", () => {
    test("converts legacy Plate paragraph JSON into Markdown", () => {
        expect(normalizeDocumentContent(mockDocuments[0].content)).toBe(
            "A quiet first paragraph.\n\nA second paragraph with _emphasis._"
        );
    });

    test("converts supported Plate blocks and marks without losing structure", () => {
        expect(normalizeDocumentContent(mockDocuments[1].content)).toBe(
            [
                "## What I noticed",
                "> Write the honest version.",
                "- Slow down\n- Keep the **useful**"
            ].join("\n\n")
        );
    });

    test("leaves existing Markdown unchanged", () => {
        expect(normalizeDocumentContent(mockDocuments[2].content)).toBe(mockDocuments[2].content);
    });

    test("leaves non-Plate JSON and malformed legacy text unchanged", () => {
        expect(normalizeDocumentContent('[{"note":"ordinary JSON"}]')).toBe(
            '[{"note":"ordinary JSON"}]'
        );
        expect(normalizeDocumentContent("an unfinished [ thought")).toBe("an unfinished [ thought");
    });

    test("normalizes empty content", () => {
        expect(normalizeDocumentContent(null)).toBe("");
        expect(normalizeDocumentContent("")).toBe("");
        expect(normalizeDocumentContent("[]")).toBe("");
    });
});
