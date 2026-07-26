import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import Spinner from "@/components/ui/spinner";
import { useDocumentsQuery } from "@/features/documents/queries";
import { useDocumentPreferences } from "@/stores/document-preferences";

export function EntryIndexPage() {
    const documents = useDocumentsQuery();
    const navigate = useNavigate();
    const selectedDocumentId = useDocumentPreferences((state) => state.selectedDocumentId);
    const selectDocument = useDocumentPreferences((state) => state.selectDocument);

    useEffect(() => {
        if (!documents.data?.length) {
            return;
        }

        const target =
            documents.data.find((document) => document.id === selectedDocumentId) ??
            documents.data[0];

        if (target) {
            selectDocument(target.id);
            void navigate({
                to: "/entry/$id",
                params: { id: target.id },
                replace: true
            });
        }
    }, [documents.data, navigate, selectDocument, selectedDocumentId]);

    if (documents.isLoading) {
        return <Spinner className="h-8 w-8" />;
    }

    return null;
}
