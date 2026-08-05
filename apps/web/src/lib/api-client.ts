import {
    apiErrorSchema,
    type CreateDocumentRequest,
    deleteDocumentResponseSchema,
    documentResponseSchema,
    listDocumentsResponseSchema,
    type UpdateDocumentRequest
} from "@diary/contracts";
import type { z } from "zod";

const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export class ApiClientError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly code?: string
    ) {
        super(message);
        this.name = "ApiClientError";
    }
}

async function request<TSchema extends z.ZodType>(
    path: string,
    schema: TSchema,
    init: RequestInit = {}
): Promise<z.infer<TSchema>> {
    const response = await fetch(`${apiUrl}${path}`, {
        ...init,
        credentials: "include",
        headers: {
            Accept: "application/json",
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers
        }
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
        const parsed = apiErrorSchema.safeParse(payload);
        throw new ApiClientError(
            parsed.success
                ? parsed.data.error.message
                : `Request failed with status ${response.status}`,
            response.status,
            parsed.success ? parsed.data.error.code : undefined
        );
    }

    return schema.parse(payload);
}

export const apiClient = {
    listDocuments: () => request("/documents", listDocumentsResponseSchema),

    getDocument: (id: string) => request(`/documents/${id}`, documentResponseSchema),

    createDocument: (input: CreateDocumentRequest) =>
        request("/documents", documentResponseSchema, {
            method: "POST",
            body: JSON.stringify(input)
        }),

    updateDocument: (id: string, input: UpdateDocumentRequest) =>
        request(`/documents/${id}`, documentResponseSchema, {
            method: "PATCH",
            body: JSON.stringify(input)
        }),

    deleteDocument: (id: string) =>
        request(`/documents/${id}`, deleteDocumentResponseSchema, {
            method: "DELETE"
        })
};
