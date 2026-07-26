import { z } from "zod";

export const documentFontSchema = z.enum(["serif", "sans", "mono"]);

export const documentMetadataSchema = z.object({
    font: documentFontSchema,
    font_size: z.number().int().min(12).max(48)
});

export const defaultDocumentMetadata = {
    font: "serif",
    font_size: 18
} as const;

export const documentSchema = z.object({
    id: z.string().min(1),
    owner_id: z.string().min(1),
    title: z.string().nullable(),
    content: z.string().nullable(),
    created_at: z.number().int().nonnegative(),
    updated_at: z.number().int().nonnegative(),
    metadata: documentMetadataSchema
});

export const documentSummarySchema = documentSchema.omit({
    content: true
});

export const listDocumentsResponseSchema = z.object({
    documents: z.array(documentSummarySchema)
});

export const documentResponseSchema = z.object({
    document: documentSchema
});

export const createDocumentRequestSchema = z.object({
    title: z.string().trim().min(1).max(255),
    timezoneOffsetMinutes: z.number().int().min(-840).max(840).default(0)
});

export const updateDocumentRequestSchema = z
    .object({
        content: z.string().max(65_535).optional(),
        title: z.string().max(255).optional(),
        metadata: documentMetadataSchema.optional()
    })
    .refine(
        ({ content, title, metadata }) =>
            content !== undefined || title !== undefined || metadata !== undefined,
        "At least one document field is required"
    );

export const updateDocumentContentRequestSchema = z.object({
    content: z.string().max(65_535)
});

export const documentIdParamsSchema = z.object({
    id: z.string().uuid()
});

export const deleteDocumentResponseSchema = z.object({
    success: z.literal(true)
});

export type Document = z.infer<typeof documentSchema>;
export type DocumentSummary = z.infer<typeof documentSummarySchema>;
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
export type CreateDocumentRequest = z.infer<typeof createDocumentRequestSchema>;
export type UpdateDocumentRequest = z.infer<typeof updateDocumentRequestSchema>;
