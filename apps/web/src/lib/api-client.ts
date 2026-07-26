import {
    apiErrorSchema,
    billingPortalResponseSchema,
    type CreateDocumentRequest,
    deleteDocumentResponseSchema,
    documentResponseSchema,
    listDocumentsResponseSchema,
    type UpdateDocumentRequest
} from "@diary/contracts";
import type { z } from "zod";

export type TokenGetter = () => Promise<string | null>;

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
    getToken: TokenGetter,
    init: RequestInit = {}
): Promise<z.infer<TSchema>> {
    const token = await getToken();
    if (!token) {
        throw new ApiClientError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const response = await fetch(`${apiUrl}${path}`, {
        ...init,
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
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
    listDocuments: (getToken: TokenGetter) =>
        request("/documents", listDocumentsResponseSchema, getToken),

    getDocument: (id: string, getToken: TokenGetter) =>
        request(`/documents/${id}`, documentResponseSchema, getToken),

    createDocument: (input: CreateDocumentRequest, getToken: TokenGetter) =>
        request("/documents", documentResponseSchema, getToken, {
            method: "POST",
            body: JSON.stringify(input)
        }),

    updateDocument: (id: string, input: UpdateDocumentRequest, getToken: TokenGetter) =>
        request(`/documents/${id}`, documentResponseSchema, getToken, {
            method: "PATCH",
            body: JSON.stringify(input)
        }),

    deleteDocument: (id: string, getToken: TokenGetter) =>
        request(`/documents/${id}`, deleteDocumentResponseSchema, getToken, {
            method: "DELETE"
        }),

    createBillingPortal: (getToken: TokenGetter) =>
        request("/billing/portal", billingPortalResponseSchema, getToken, {
            method: "POST"
        })
};
