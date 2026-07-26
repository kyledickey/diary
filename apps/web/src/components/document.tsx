import { useUser } from "@clerk/tanstack-react-start";
import type {
    Document,
    DocumentMetadata,
    DocumentSummary,
    UpdateDocumentRequest
} from "@diary/contracts";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon, Trash2Icon } from "lucide-react";
import ms from "ms";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    documentKeys,
    useDeleteDocumentMutation,
    useUpdateDocumentMutation
} from "@/features/documents/queries";
import { useAnalytics } from "@/lib/analytics";
import { useDocumentPreferences } from "@/stores/document-preferences";
import Editor from "./editor";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "./ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import Spinner from "./ui/spinner";

interface DocumentEditorProps {
    document: Document;
}

interface Draft {
    title: string;
    content: string;
    metadata: DocumentMetadata;
}

export default function DocumentEditor({ document }: DocumentEditorProps) {
    const { user } = useUser();
    const track = useAnalytics();
    const updateDocument = useUpdateDocumentMutation(document.id);
    const initialDraft = useMemo(() => toDraft(document), [document]);
    const lastSaved = useRef(initialDraft);
    const [draft, setDraft] = useState(initialDraft);
    const [updatedAt, setUpdatedAt] = useState(document.updated_at);
    const [isBlurred, setIsBlurred] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [, forceClockUpdate] = useState(0);

    const changes = useMemo(() => getChanges(lastSaved.current, draft), [draft]);
    const isDirty = Object.keys(changes).length > 0;

    useEffect(() => {
        if (!isDirty) {
            return;
        }

        const timer = window.setTimeout(async () => {
            try {
                const { document: saved } = await updateDocument.mutateAsync(changes);
                lastSaved.current = toDraft(saved);
                setUpdatedAt(saved.updated_at);
            } catch (error) {
                toast.error("Error saving document", {
                    description: error instanceof Error ? error.message : "Please try again."
                });
            }
        }, 650);

        return () => window.clearTimeout(timer);
    }, [changes, isDirty, updateDocument.mutateAsync]);

    useEffect(() => {
        const timer = window.setInterval(() => forceClockUpdate((value) => value + 1), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    const wordCount = useMemo(() => countWords(draft.content), [draft.content]);
    const sinceUpdate = relativeTime(updatedAt);
    const sinceCreate = relativeTime(document.created_at);

    return (
        <div className="col-span-1 flex min-h-screen w-full flex-col items-start justify-start pt-4">
            <nav className="bg-background fixed left-0 top-0 z-10 flex w-full items-center justify-end gap-4 px-8 py-2">
                {isDirty || updateDocument.isPending ? (
                    <div className="flex items-center gap-2">
                        <Spinner className="fill-foreground/60 h-3 w-3" />
                        <p className="text-foreground/60 text-xs font-medium">Saving</p>
                    </div>
                ) : (
                    <p className="text-foreground/60 text-xs font-medium">Edited {sinceUpdate}</p>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-fit w-fit px-2 py-1">
                            <DotsHorizontalIcon className="fill-foreground/60 h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="mr-8 w-fit">
                        <TypographyControls
                            metadata={draft.metadata}
                            onChange={(metadata) =>
                                setDraft((current) => ({ ...current, metadata }))
                            }
                        />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={() => {
                                setIsBlurred((value) => !value);
                                track("document_blur");
                            }}
                        >
                            {isBlurred ? (
                                <EyeIcon className="mr-2 h-4 w-4" />
                            ) : (
                                <EyeOffIcon className="mr-2 h-4 w-4" />
                            )}
                            {isBlurred ? "Unhide" : "Hide"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="focus:bg-red-500/20"
                            onSelect={() => setDeleteDialogOpen(true)}
                        >
                            <Trash2Icon className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="flex w-full flex-col items-start gap-1 px-2 py-2 text-left">
                            <p className="text-foreground/40 text-xs font-medium">
                                Word count: {wordCount.toLocaleString()}
                            </p>
                            <p className="text-foreground/40 text-xs font-medium">
                                Created {sinceCreate}
                            </p>
                            <p className="text-foreground/40 text-xs font-medium">
                                Last edited {sinceUpdate}
                            </p>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </nav>

            <div className="mt-8 flex w-full flex-col items-start justify-start md:mx-auto md:w-full md:max-w-full lg:max-w-[50rem] 2xl:max-w-[60rem]">
                {user?.publicMetadata.plan === "free" ? (
                    <p className="text-foreground/60 text-md mb-4 flex-wrap text-left font-mono font-medium">
                        {draft.title}
                    </p>
                ) : (
                    <Input
                        placeholder="Title"
                        value={draft.title}
                        onChange={(event) =>
                            setDraft((current) => ({
                                ...current,
                                title: event.target.value
                            }))
                        }
                        className="text-md text-foreground/60 mb-4 w-full flex-wrap border-0 p-0 text-left font-mono font-medium shadow-none focus-visible:ring-0"
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

            <ConfirmDeleteDialog
                document={document}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            />
        </div>
    );
}

function TypographyControls({
    metadata,
    onChange
}: {
    metadata: DocumentMetadata;
    onChange(metadata: DocumentMetadata): void;
}) {
    const track = useAnalytics();
    const fonts = ["serif", "sans", "mono"] as const;

    return (
        <div className="flex w-full flex-col items-start p-1">
            <p className="text-foreground/40 text-xs font-medium">Font Family</p>
            <DropdownMenuSeparator />
            <div className="flex w-full items-start justify-between gap-1">
                {fonts.map((font) => (
                    <Button
                        key={font}
                        variant={metadata.font === font ? "outline" : "ghost"}
                        className="h-fit w-full border py-2"
                        onClick={() => {
                            track("document_font_family_change");
                            onChange({ ...metadata, font });
                        }}
                    >
                        <span className="flex flex-col items-center">
                            <span
                                className={
                                    font === "serif"
                                        ? "font-serif text-xl font-medium"
                                        : font === "sans"
                                          ? "font-sans text-xl font-medium"
                                          : "font-mono text-xl font-medium"
                                }
                            >
                                Ag
                            </span>
                            <span className="text-foreground/40 text-xs font-medium capitalize">
                                {font}
                            </span>
                        </span>
                    </Button>
                ))}
            </div>

            <p className="text-foreground/40 mb-2 mt-3 text-xs font-medium">Font Size</p>
            <div className="flex w-full items-center justify-between gap-1 rounded border">
                <Button
                    variant="ghost"
                    disabled={metadata.font_size <= 12}
                    onClick={() => {
                        track("document_font_size_change");
                        onChange({
                            ...metadata,
                            font_size: metadata.font_size - 1
                        });
                    }}
                >
                    -
                </Button>
                <p className="text-foreground text-sm font-medium">{metadata.font_size} px</p>
                <Button
                    variant="ghost"
                    disabled={metadata.font_size >= 48}
                    onClick={() => {
                        track("document_font_size_change");
                        onChange({
                            ...metadata,
                            font_size: metadata.font_size + 1
                        });
                    }}
                >
                    +
                </Button>
            </div>
        </div>
    );
}

function ConfirmDeleteDialog({
    document,
    open,
    onOpenChange
}: {
    document: Document;
    open: boolean;
    onOpenChange(open: boolean): void;
}) {
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
            toast.error("Error deleting document", {
                description: error instanceof Error ? error.message : "Please try again."
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        Are you sure you want to delete this entry?
                    </DialogTitle>
                    <DialogDescription>This action cannot be undone.</DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-8 gap-2">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        className="w-full"
                        disabled={deleteDocument.isPending}
                        onClick={confirmDelete}
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function toDraft(document: Document): Draft {
    return {
        title: document.title ?? "Untitled",
        content: document.content ?? "",
        metadata: document.metadata
    };
}

function getChanges(saved: Draft, draft: Draft): UpdateDocumentRequest {
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

    try {
        const blocks = JSON.parse(content) as Array<{
            children?: Array<{ text?: string }>;
        }>;
        const text = blocks
            .flatMap((block) => block.children ?? [])
            .map((child) => child.text ?? "")
            .join(" ")
            .trim();
        return text ? text.split(/\s+/).length : 0;
    } catch {
        return content.trim() ? content.trim().split(/\s+/).length : 0;
    }
}

function relativeTime(timestamp: number): string {
    const elapsed = Math.max(0, Date.now() - timestamp * 1000);
    return elapsed < 10_000 ? "just now" : `${ms(elapsed)} ago`;
}
