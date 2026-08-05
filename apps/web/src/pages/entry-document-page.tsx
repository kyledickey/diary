import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import DocumentEditor from "@/components/editor/document-editor";
import { Spinner } from "@/components/ui/spinner";
import { useDocumentQuery } from "@/features/documents/queries";
import { useDocumentPreferences } from "@/stores/document-preferences";

export function EntryDocumentPage({ id }: { id: string }) {
    const document = useDocumentQuery(id);
    const navigate = useNavigate();
    const selectDocument = useDocumentPreferences((state) => state.selectDocument);

    useEffect(() => {
        if (document.data) {
            selectDocument(document.data.id);
        }
    }, [document.data, selectDocument]);

    useEffect(() => {
        if (document.isError) {
            selectDocument(null);
            void navigate({ to: "/entry", replace: true });
        }
    }, [document.isError, navigate, selectDocument]);

    if (!document.data) {
        return (
            <div className="flex h-full w-full items-center justify-center p-12 sm:p-4">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    return <DocumentEditor key={document.data.id} document={document.data} />;
}
