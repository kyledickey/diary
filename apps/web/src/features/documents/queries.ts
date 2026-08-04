import type { Document, DocumentSummary, UpdateDocumentRequest } from "@diary/contracts";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

export const documentKeys = {
    all: ["documents"] as const,
    detail: (id: string) => ["documents", id] as const
};

export function documentsQueryOptions() {
    return queryOptions({
        queryKey: documentKeys.all,
        queryFn: async () => (await apiClient.listDocuments()).documents
    });
}

export function documentQueryOptions(id: string) {
    return queryOptions({
        queryKey: documentKeys.detail(id),
        queryFn: async () => (await apiClient.getDocument(id)).document
    });
}

export function useDocumentsQuery() {
    const session = authClient.useSession();
    return useQuery({
        ...documentsQueryOptions(),
        enabled: Boolean(session.data?.user)
    });
}

export function useDocumentQuery(id: string) {
    const session = authClient.useSession();
    return useQuery({
        ...documentQueryOptions(id),
        enabled: Boolean(session.data?.user)
    });
}

export function useCreateDocumentMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            apiClient.createDocument({
                title: new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }),
                timezoneOffsetMinutes: new Date().getTimezoneOffset()
            }),
        onSuccess: ({ document }) => {
            const { content: _content, ...summary } = document;
            queryClient.setQueryData<DocumentSummary[]>(documentKeys.all, (current = []) => [
                summary,
                ...current
            ]);
            queryClient.setQueryData(documentKeys.detail(document.id), document);
            void queryClient.invalidateQueries({ queryKey: documentKeys.all });
        }
    });
}

export function useUpdateDocumentMutation(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (changes: UpdateDocumentRequest) => apiClient.updateDocument(id, changes),
        scope: { id: `document-${id}` },
        onSuccess: ({ document }) => {
            queryClient.setQueryData<Document>(documentKeys.detail(id), document);
            queryClient.setQueryData<DocumentSummary[]>(documentKeys.all, (current = []) =>
                current.map((summary) =>
                    summary.id === id
                        ? {
                              ...summary,
                              title: document.title,
                              metadata: document.metadata,
                              updated_at: document.updated_at
                          }
                        : summary
                )
            );
        }
    });
}

export function useDeleteDocumentMutation(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => apiClient.deleteDocument(id),
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: documentKeys.detail(id) });
            queryClient.setQueryData<DocumentSummary[]>(documentKeys.all, (current = []) =>
                current.filter((document) => document.id !== id)
            );
        }
    });
}
