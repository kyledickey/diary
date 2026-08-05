import type { Document, UpdateDocumentRequest } from "@diary/contracts";
import {
    CheckCircle2Icon,
    EllipsisIcon,
    EyeIcon,
    EyeOffIcon,
    PinIcon,
    Trash2Icon
} from "lucide-react";
import ms from "ms";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { usePlan } from "@/features/auth/queries";
import { useUpdateDocumentMutation } from "@/features/documents/queries";
import { useAnalytics } from "@/lib/analytics";
import {
    createInitialDocumentDraft,
    type DocumentDraft,
    reconcileSavedDocumentDraft
} from "@/lib/document-draft";
import DeleteDocumentDialog from "./delete-document-dialog";
import Editor from "./editor";
import TypographyControls from "./typography-controls";

interface DocumentEditorProps {
    document: Document;
}

export default function DocumentEditor({ document }: DocumentEditorProps) {
    const { plan } = usePlan();
    const track = useAnalytics();
    const updateDocument = useUpdateDocumentMutation(document.id);
    const initialDraft = useMemo(() => createInitialDocumentDraft(document), [document]);
    const [lastSaved, setLastSaved] = useState(initialDraft);
    const [draft, setDraft] = useState(initialDraft);
    const [saveAttempt, setSaveAttempt] = useState(0);
    const [updatedAt, setUpdatedAt] = useState(document.updated_at);
    const [isBlurred, setIsBlurred] = useState(false);
    const [entryOptionsOpen, setEntryOptionsOpen] = useState(false);
    const [entryOptionsPinned, setEntryOptionsPinned] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [, forceClockUpdate] = useState(0);

    const changes = useMemo(() => getChanges(lastSaved, draft), [draft, lastSaved]);
    const isDirty = Object.keys(changes).length > 0;

    useEffect(() => {
        if (!isDirty) {
            return;
        }

        const timer = window.setTimeout(
            async () => {
                try {
                    const { document: saved } = await updateDocument.mutateAsync(changes);
                    setLastSaved((current) =>
                        reconcileSavedDocumentDraft(current, saved, changes.content !== undefined)
                    );
                    setSaveAttempt(0);
                    setUpdatedAt(saved.updated_at);
                } catch (error) {
                    setSaveAttempt((attempt) => attempt + 1);
                    toastManager.add({
                        type: "error",
                        title: "Error saving document",
                        description: error instanceof Error ? error.message : "Please try again."
                    });
                }
            },
            Math.min(650 * 2 ** saveAttempt, 10_000)
        );

        return () => window.clearTimeout(timer);
    }, [changes, isDirty, saveAttempt, updateDocument.mutateAsync]);

    useEffect(() => {
        const timer = window.setInterval(() => forceClockUpdate((value) => value + 1), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    const wordCount = useMemo(() => countWords(draft.content), [draft.content]);
    const sinceUpdate = relativeTime(updatedAt);
    const sinceCreate = relativeTime(document.created_at);

    return (
        <div className="col-span-1 flex min-h-screen w-full flex-col items-start justify-start">
            <nav className="sticky top-0 z-10 flex w-full items-center justify-end gap-4 bg-background px-6 py-2 md:px-8">
                <div className="flex items-center gap-4">
                    <div className="group relative size-3 shrink-0 text-foreground/60">
                        {isDirty || updateDocument.isPending ? (
                            <Spinner aria-hidden="true" className="size-3" />
                        ) : (
                            <>
                                <CheckCircle2Icon className="size-3" aria-hidden="true" />
                                <span className="pointer-events-none absolute top-1/2 right-full mr-1.5 -translate-y-1/2 whitespace-nowrap text-xs opacity-0 transition-opacity group-hover:opacity-100">
                                    Saved
                                </span>
                            </>
                        )}
                    </div>

                    <Popover
                        open={entryOptionsOpen}
                        onOpenChange={(open, eventDetails) => {
                            if (
                                entryOptionsPinned &&
                                !open &&
                                (eventDetails.reason === "outside-press" ||
                                    eventDetails.reason === "focus-out")
                            ) {
                                return;
                            }
                            setEntryOptionsOpen(open);
                        }}
                    >
                        <PopoverTrigger
                            render={
                                <Button aria-label="Entry options" variant="ghost" size="icon-sm" />
                            }
                        >
                            <EllipsisIcon aria-hidden="true" />
                        </PopoverTrigger>
                        <PopoverPopup align="end" className="w-64">
                            <PopoverTitle className="sr-only">Entry options</PopoverTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="absolute top-2 right-2 z-10"
                                aria-label={
                                    entryOptionsPinned ? "Unpin entry options" : "Pin entry options"
                                }
                                aria-pressed={entryOptionsPinned}
                                onClick={() => setEntryOptionsPinned((pinned) => !pinned)}
                            >
                                <PinIcon
                                    aria-hidden="true"
                                    className={entryOptionsPinned ? "fill-current" : undefined}
                                />
                            </Button>
                            <TypographyControls
                                metadata={draft.metadata}
                                onChange={(metadata) =>
                                    setDraft((current) => ({ ...current, metadata }))
                                }
                            />
                            <div className="my-3 h-px bg-border" />
                            <Button
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => {
                                    setIsBlurred((value) => !value);
                                    track("document_blur");
                                }}
                            >
                                {isBlurred ? (
                                    <EyeIcon aria-hidden="true" />
                                ) : (
                                    <EyeOffIcon aria-hidden="true" />
                                )}
                                {isBlurred ? "Unhide" : "Hide"}
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-destructive-foreground hover:bg-destructive/4"
                                onClick={() => {
                                    setEntryOptionsOpen(false);
                                    setDeleteDialogOpen(true);
                                }}
                            >
                                <Trash2Icon aria-hidden="true" />
                                Delete
                            </Button>
                            <div className="mt-3 flex w-full flex-col items-start gap-1 border-t px-2 pt-3 text-left">
                                <p className="text-xs text-muted-foreground">
                                    Word count: {wordCount.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Created {sinceCreate}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Last edited {sinceUpdate}
                                </p>
                            </div>
                        </PopoverPopup>
                    </Popover>
                </div>
            </nav>

            <div className="mx-auto mt-4 flex w-full max-w-[50rem] flex-col items-start justify-start px-6 md:px-8 2xl:max-w-[60rem]">
                {plan === "free" ? (
                    <p className="text-md mb-4 flex-wrap text-left font-mono font-medium text-muted-foreground">
                        {draft.title}
                    </p>
                ) : (
                    <Input
                        type="text"
                        unstyled
                        placeholder="Title"
                        value={draft.title}
                        onChange={(event) =>
                            setDraft((current) => ({
                                ...current,
                                title: event.target.value
                            }))
                        }
                        className="text-md mb-4 w-full flex-wrap text-left font-mono font-medium [&_input]:h-auto [&_input]:p-0 [&_input]:text-muted-foreground"
                    />
                )}
                <Editor
                    key={document.id}
                    content={draft.content}
                    setContent={(content) => setDraft((current) => ({ ...current, content }))}
                    isBlurred={isBlurred}
                    metadata={draft.metadata}
                />
            </div>

            <DeleteDocumentDialog
                document={document}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            />
        </div>
    );
}

function getChanges(saved: DocumentDraft, draft: DocumentDraft): UpdateDocumentRequest {
    const changes: UpdateDocumentRequest = {};
    if (draft.content !== saved.content) {
        changes.content = draft.content;
    }
    if (draft.title !== saved.title) {
        changes.title = draft.title;
    }
    if (
        draft.metadata.font !== saved.metadata.font ||
        draft.metadata.font_size !== saved.metadata.font_size
    ) {
        changes.metadata = draft.metadata;
    }
    return changes;
}

function countWords(content: string): number {
    if (!content) {
        return 0;
    }

    const text = content
        .replaceAll(/!\[[^\]]*]\([^)]*\)/g, " ")
        .replaceAll(/\[([^\]]+)]\([^)]*\)/g, "$1")
        .replaceAll(/^[\s]*(?:#{1,6}|>|[-+*]|\d+[.)])[\s]+/gm, "")
        .replaceAll(/[*_~`]/g, "")
        .trim();
    return text ? text.split(/\s+/).length : 0;
}

function relativeTime(timestamp: number): string {
    const elapsed = Math.max(0, Date.now() - timestamp * 1000);
    return elapsed < 10_000 ? "just now" : `${ms(elapsed)} ago`;
}
