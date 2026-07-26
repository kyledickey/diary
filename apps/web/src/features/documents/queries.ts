import { useAuth } from "@clerk/tanstack-react-start";
import type { Document, DocumentSummary, UpdateDocumentRequest } from "@diary/contracts";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type TokenGetter } from "@/lib/api-client";

export const documentKeys = {
    all: ["documents"] as const,
    detail: (id: string) => ["documents", id] as const
};

export function documentsQueryOptions(getToken: TokenGetter) {
    return queryOptions({
        queryKey: documentKeys.all,
        queryFn: async () => (await apiClient.listDocuments(getToken)).documents
    });
}

export function documentQueryOptions(id: string, getToken: TokenGetter) {
    return queryOptions({
        queryKey: documentKeys.detail(id),
        queryFn: async () => (await apiClient.getDocument(id, getToken)).document
    });
}

export function useDocumentsQuery() {
    const { getToken, isSignedIn } = useAuth();
    return useQuery({
        ...documentsQueryOptions(getToken),
        enabled: isSignedIn === true
    });
}

export function useDocumentQuery(id: string) {
    const { getToken, isSignedIn } = useAuth();
    return useQuery({
        ...documentQueryOptions(id, getToken),
        enabled: isSignedIn === true
    });
}

export function useCreateDocumentMutation() {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            apiClient.createDocument(
                {
                    title: new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    }),
                    timezoneOffsetMinutes: new Date().getTimezoneOffset()
                },
                getToken
            ),
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
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (changes: UpdateDocumentRequest) =>
            apiClient.updateDocument(id, changes, getToken),
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
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => apiClient.deleteDocument(id, getToken),
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: documentKeys.detail(id) });
            queryClient.setQueryData<DocumentSummary[]>(documentKeys.all, (current = []) =>
                current.filter((document) => document.id !== id)
            );
        }
    });
}
