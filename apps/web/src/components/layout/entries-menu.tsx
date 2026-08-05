import type { DocumentSummary } from "@diary/contracts";
import { useNavigate } from "@tanstack/react-router";
import { MenuIcon, PinIcon, PlusIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AccountDropdown from "@/components/account/account-dropdown";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { usePlan } from "@/features/auth/queries";
import { useCreateDocumentMutation, useDocumentsQuery } from "@/features/documents/queries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAnalytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useDocumentPreferences } from "@/stores/document-preferences";

interface EntriesMenuProps {
    dimmed?: boolean;
}

export default function EntriesMenu({ dimmed = false }: EntriesMenuProps) {
    const navigate = useNavigate();
    const track = useAnalytics();
    const { plan, isLoaded: isPlanLoaded } = usePlan();
    const documentsQuery = useDocumentsQuery();
    const createDocument = useCreateDocumentMutation();
    const selectedDocumentId = useDocumentPreferences((state) => state.selectedDocumentId);
    const selectDocument = useDocumentPreferences((state) => state.selectDocument);
    const isMobile = useMediaQuery("max-md");
    const [openMobile, setOpenMobile] = useState(false);
    const [pinned, setPinned] = useState(false);
    const documents = documentsQuery.data ?? [];
    const months = useMemo(() => groupByMonth(documents), [documents]);
    const today = useToday();

    // Mobile has no pointer movement to bring a faded menu back.
    const faded = dimmed && !pinned && !isMobile;

    useEffect(() => {
        if (documentsQuery.error) {
            toastManager.add({
                type: "error",
                title: "Could not load entries",
                description: documentsQuery.error.message
            });
        }
    }, [documentsQuery.error]);

    async function createEntry() {
        if (plan === "free" && createdEntryToday(documents)) {
            toastManager.add({
                type: "error",
                title: "You have already created an entry today"
            });
            return;
        }

        try {
            const { document } = await createDocument.mutateAsync();
            selectDocument(document.id);
            setOpenMobile(false);
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
        <>
            <Button
                aria-expanded={openMobile}
                aria-label={openMobile ? "Close entries" : "Entries"}
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setOpenMobile((value) => !value)}
            >
                {openMobile ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
            </Button>

            <aside
                aria-label="Entries"
                className={cn(
                    "relative mt-2 w-56 flex-col rounded-xl border bg-card p-px text-card-foreground shadow-lg/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-xl)-1px)] before:bg-muted/72 before:shadow-[0_1px_--theme(--color-black/4%)] md:mt-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                    "transition-opacity ease-out motion-reduce:transition-none",
                    faded
                        ? "pointer-events-none opacity-0 duration-200"
                        : "opacity-100 duration-100",
                    openMobile ? "flex" : "hidden md:flex"
                )}
            >
                <div className="relative flex min-h-0 flex-col rounded-lg border bg-popover bg-clip-padding p-2 text-popover-foreground shadow-xs/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]">
                    <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-2">
                        <p className="min-w-0 truncate font-serif text-sm italic text-muted-foreground">
                            {today}
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="-mr-1 hidden md:inline-flex"
                            aria-label={pinned ? "Unpin entries" : "Pin entries"}
                            aria-pressed={pinned}
                            onClick={() => setPinned((value) => !value)}
                        >
                            <PinIcon
                                aria-hidden="true"
                                className={pinned ? "fill-current" : "text-muted-foreground"}
                            />
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        className="w-full justify-start font-normal"
                        disabled={createDocument.isPending || !isPlanLoaded}
                        onClick={createEntry}
                    >
                        <PlusIcon aria-hidden="true" />
                        New entry
                    </Button>

                    <div className="mt-1 max-h-[55vh] overflow-y-auto">
                        {documents.length === 0 ? (
                            <p className="px-2 py-3 text-xs text-muted-foreground">
                                Nothing written yet.
                            </p>
                        ) : (
                            months.map((month) => (
                                <section key={month.label}>
                                    <h2 className="px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground">
                                        {month.label}
                                    </h2>
                                    {month.documents.map((document) => (
                                        <EntryRow
                                            key={document.id}
                                            document={document}
                                            active={selectedDocumentId === document.id}
                                            onSelect={async () => {
                                                selectDocument(document.id);
                                                setOpenMobile(false);
                                                await navigate({
                                                    to: "/entry/$id",
                                                    params: { id: document.id }
                                                });
                                            }}
                                        />
                                    ))}
                                </section>
                            ))
                        )}
                    </div>
                </div>

                <div className="relative mt-1 px-1 py-0.5">
                    <AccountDropdown />
                </div>
            </aside>
        </>
    );
}

function EntryRow({
    document,
    active,
    onSelect
}: {
    document: DocumentSummary;
    active: boolean;
    onSelect(): void;
}) {
    const created = new Date(document.created_at * 1000);
    const title = document.title || "Untitled";
    const weekday = created.toLocaleDateString("en-US", { weekday: "long" });
    const isDateTitle = title === created.toLocaleDateString("en-US");

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "group flex w-full items-baseline gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
        >
            <span
                className={cn(
                    "w-4 shrink-0 tabular-nums",
                    active ? "text-foreground/70" : "text-muted-foreground/60"
                )}
            >
                {created.getDate()}
            </span>
            <span className="truncate">{isDateTitle ? weekday : title}</span>
        </button>
    );
}

function groupByMonth(documents: DocumentSummary[]) {
    const months: { label: string; documents: DocumentSummary[] }[] = [];

    for (const document of documents) {
        const label = new Date(document.created_at * 1000).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
        });
        const current = months.at(-1);
        if (current?.label === label) {
            current.documents.push(document);
        } else {
            months.push({ label, documents: [document] });
        }
    }

    return months;
}

// Format the local date after mount to avoid a hydration mismatch.
function useToday() {
    const [today, setToday] = useState("Today");

    useEffect(() => {
        const now = new Date();
        setToday(
            now.toLocaleDateString("en-US", {
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
