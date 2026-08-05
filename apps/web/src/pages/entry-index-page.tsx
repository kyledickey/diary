import type { DocumentSummary } from "@diary/contracts";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { usePlan } from "@/features/auth/queries";
import { useCreateDocumentMutation, useDocumentsQuery } from "@/features/documents/queries";
import { useAnalytics } from "@/lib/analytics";
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
        return (
            <div className="flex min-h-svh items-center justify-center">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    // Avoid flashing the empty state while redirecting to an existing entry.
    if (documents.data?.length) {
        return null;
    }

    return <Splash />;
}

function Splash() {
    const navigate = useNavigate();
    const track = useAnalytics();
    const { plan, isLoaded: isPlanLoaded } = usePlan();
    const documents = useDocumentsQuery();
    const createDocument = useCreateDocumentMutation();
    const selectDocument = useDocumentPreferences((state) => state.selectDocument);
    const today = useToday();

    async function startWriting() {
        if (!isPlanLoaded || createDocument.isPending) {
            return;
        }

        if (plan === "free" && createdEntryToday(documents.data ?? [])) {
            toastManager.add({
                type: "error",
                title: "You have already created an entry today"
            });
            return;
        }

        try {
            const { document } = await createDocument.mutateAsync();
            selectDocument(document.id);
            track("document_created");
            await navigate({ to: "/entry/$id", params: { id: document.id } });
        } catch (error) {
            toastManager.add({
                type: "error",
                title: "Error creating document",
                description: error instanceof Error ? error.message : "Please try again."
            });
        }
    }

    return (
        <div className="flex min-h-svh select-none items-center justify-center px-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="flex flex-col"
            >
                <p className="text-foreground/25 font-serif text-sm italic">{today}</p>
                <h1 className="text-foreground/60 mt-1 font-serif text-lg">Nothing open.</h1>

                <div className="mt-6 flex flex-col gap-2.5">
                    <Row label="New entry" onClick={startWriting} />
                    <Row label="Past entries live in the menu, top left" />
                </div>
            </motion.div>
        </div>
    );
}

function Row({ label, onClick }: { label: string; onClick?: () => void }) {
    return (
        <div className="flex items-baseline justify-between gap-10 text-sm">
            {onClick ? (
                <button
                    type="button"
                    onClick={onClick}
                    className="text-foreground/50 hover:text-foreground/80 cursor-pointer text-left transition-colors duration-150"
                >
                    {label}
                </button>
            ) : (
                <span className="text-foreground/40">{label}</span>
            )}
        </div>
    );
}

// Format the local date after mount to avoid a hydration mismatch.
function useToday() {
    const [today, setToday] = useState("Today");

    useEffect(() => {
        setToday(
            new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            })
        );
    }, []);

    return today;
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
