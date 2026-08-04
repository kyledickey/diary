import type { DocumentSummary } from "@diary/contracts";
import { useNavigate } from "@tanstack/react-router";
import { MenuIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCreateDocumentMutation, useDocumentsQuery } from "@/features/documents/queries";
import { usePlan } from "@/features/auth/queries";
import { useAnalytics } from "@/lib/analytics";
import { useDocumentPreferences } from "@/stores/document-preferences";
import AccountDropdown from "./account-dropdown";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

export default function Sidebar() {
    const navigate = useNavigate();
    const { plan, isLoaded: isPlanLoaded } = usePlan();
    const track = useAnalytics();
    const documentsQuery = useDocumentsQuery();
    const createDocument = useCreateDocumentMutation();
    const selectedDocumentId = useDocumentPreferences((state) => state.selectedDocumentId);
    const selectDocument = useDocumentPreferences((state) => state.selectDocument);
    const [isSideOpen, setIsSideOpen] = useState(false);
    const documents = documentsQuery.data ?? [];

    useEffect(() => {
        if (documentsQuery.error) {
            toast.error("Could not load entries", {
                description: documentsQuery.error.message
            });
        }
    }, [documentsQuery.error]);

    async function createEntry() {
        if (plan === "free" && createdEntryToday(documents)) {
            toast.error("You have already created an entry today");
            return;
        }

        try {
            const { document } = await createDocument.mutateAsync();
            selectDocument(document.id);
            setIsSideOpen(false);
            track("document_created");
            await navigate({
                to: "/entry/$id",
                params: { id: document.id }
            });
        } catch (error) {
            toast.error("Error creating document", {
                description: error instanceof Error ? error.message : "Please try again."
            });
        }
    }

    const entryList = (
        <div className="mt-4 flex w-full flex-col items-start text-left">
            <p className="text-foreground/60 mb-2 text-sm">Entries</p>
            <ScrollArea className="h-[60vh] w-full pb-2 md:h-[85vh]">
                {documents.length === 0 ? (
                    <p className="text-foreground/40 text-sm">No entries yet</p>
                ) : (
                    documents.map((document) => (
                        <SidebarTab
                            key={document.id}
                            document={document}
                            active={selectedDocumentId === document.id}
                            onSelect={async () => {
                                selectDocument(document.id);
                                setIsSideOpen(false);
                                await navigate({
                                    to: "/entry/$id",
                                    params: { id: document.id }
                                });
                            }}
                        />
                    ))
                )}
            </ScrollArea>
        </div>
    );

    return (
        <>
            <aside className="bg-background z-50 col-span-1 hidden h-screen w-full flex-col justify-between overflow-y-hidden p-4 md:flex">
                <div className="flex flex-col items-center">
                    <Button
                        className="w-full"
                        variant="outline"
                        disabled={createDocument.isPending || !isPlanLoaded}
                        onClick={createEntry}
                    >
                        New Entry
                    </Button>
                    {entryList}
                </div>
                <div className="fixed bottom-4 flex flex-col items-center">
                    <AccountDropdown />
                </div>
            </aside>

            <div className="fixed left-8 top-3 z-50 flex md:hidden">
                <Sheet open={isSideOpen} onOpenChange={setIsSideOpen}>
                    <SheetTrigger aria-label="Open entry navigation">
                        <MenuIcon className="h-5 w-5" />
                    </SheetTrigger>
                    <SheetContent side="left" className="w-full">
                        <div className="mt-8 flex flex-col items-center justify-between gap-4">
                            <Button
                                className="w-full"
                                variant="outline"
                                disabled={createDocument.isPending || !isPlanLoaded}
                                onClick={createEntry}
                            >
                                New Entry
                            </Button>
                            {entryList}
                            <AccountDropdown />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}

function SidebarTab({
    document,
    active,
    onSelect
}: {
    document: DocumentSummary;
    active: boolean;
    onSelect(): void;
}) {
    return (
        <Button
            variant={active ? "secondary" : "ghost"}
            className="text-foreground/60 flex h-fit w-full items-start justify-start py-1 text-left font-normal"
            onClick={onSelect}
        >
            {document.title || "Untitled"}
        </Button>
    );
}

function createdEntryToday(documents: DocumentSummary[]) {
    const today = new Date();
    return documents.some((document) => {
        const createdAt = new Date(document.created_at * 1000);
        return (
            createdAt.getFullYear() === today.getFullYear() &&
            createdAt.getMonth() === today.getMonth() &&
            createdAt.getDate() === today.getDate()
        );
    });
}
