import type { Document, DocumentSummary } from "@diary/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle
} from "@/components/ui/dialog";
import { toastManager } from "@/components/ui/toast";
import { documentKeys, useDeleteDocumentMutation } from "@/features/documents/queries";
import { useAnalytics } from "@/lib/analytics";
import { useDocumentPreferences } from "@/stores/document-preferences";

interface DeleteDocumentDialogProps {
    document: Document;
    open: boolean;
    onOpenChange(open: boolean): void;
}

export default function DeleteDocumentDialog({
    document,
    open,
    onOpenChange
}: DeleteDocumentDialogProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const deleteDocument = useDeleteDocumentMutation(document.id);
    const selectDocument = useDocumentPreferences((state) => state.selectDocument);
    const track = useAnalytics();

    async function confirmDelete() {
        try {
            await deleteDocument.mutateAsync();
            const remaining = queryClient.getQueryData<DocumentSummary[]>(documentKeys.all) ?? [];
            const nextDocument = remaining[0];
            selectDocument(nextDocument?.id ?? null);
            track("document_deleted");
            onOpenChange(false);

            if (nextDocument) {
                await navigate({
                    to: "/entry/$id",
                    params: { id: nextDocument.id },
                    replace: true
                });
            } else {
                await navigate({ to: "/entry", replace: true });
            }
        } catch (error) {
            toastManager.add({
                type: "error",
                title: "Error deleting document",
                description: error instanceof Error ? error.message : "Please try again."
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        Are you sure you want to delete this entry?
                    </DialogTitle>
                    <DialogDescription>This action cannot be undone.</DialogDescription>
                </DialogHeader>
                <DialogPanel>
                    <p className="text-sm text-muted-foreground">
                        “{document.title || "Untitled"}” will be permanently removed.
                    </p>
                </DialogPanel>
                <DialogFooter className="gap-2">
                    <DialogClose
                        render={<Button variant="secondary" className="w-full sm:w-1/2" />}
                    >
                        Cancel
                    </DialogClose>
                    <Button
                        variant="destructive"
                        className="w-full sm:w-1/2"
                        loading={deleteDocument.isPending}
                        onClick={confirmDelete}
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
}
