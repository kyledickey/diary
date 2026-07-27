import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownKeymap } from "@codemirror/lang-markdown";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Compartment } from "@codemirror/state";
import { drawSelection, EditorView, keymap, placeholder } from "@codemirror/view";
import type { DocumentMetadata } from "@diary/contracts";
import { useEffect, useRef } from "react";
import { toggleMarkdownMark } from "@/lib/markdown-formatting";
import { createMarkdownEditorTheme, markdownLivePreview } from "@/lib/markdown-live-preview";

interface EditorProps {
    content: string;
    setContent(content: string): void;
    isBlurred: boolean;
    metadata: DocumentMetadata;
}

const formatKeymap = [
    { key: "Mod-b", run: toggleMarkdownMark("**") },
    { key: "Mod-i", run: toggleMarkdownMark("_") }
];

export default function Editor({ content, setContent, isBlurred, metadata }: EditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<EditorView>(null);
    const onChangeRef = useRef(setContent);
    const themeCompartmentRef = useRef(new Compartment());
    const initialContentRef = useRef(content);
    const initialMetadataRef = useRef(metadata);
    onChangeRef.current = setContent;

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const view = new EditorView({
            parent: containerRef.current,
            doc: initialContentRef.current,
            extensions: [
                history(),
                drawSelection(),
                markdown({
                    completeHTMLTags: false,
                    pasteURLAsLink: false
                }),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                markdownLivePreview,
                EditorView.lineWrapping,
                placeholder("Start writing…"),
                keymap.of([
                    ...formatKeymap,
                    ...markdownKeymap,
                    indentWithTab,
                    ...defaultKeymap,
                    ...historyKeymap
                ]),
                EditorView.contentAttributes.of({
                    "aria-label": "Document content",
                    spellcheck: "true"
                }),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChangeRef.current(update.state.doc.toString());
                    }
                }),
                themeCompartmentRef.current.of(
                    createMarkdownEditorTheme(initialMetadataRef.current)
                )
            ]
        });

        editorRef.current = view;
        return () => {
            editorRef.current = null;
            view.destroy();
        };
    }, []);

    useEffect(() => {
        const view = editorRef.current;
        if (!view || view.state.doc.toString() === content) {
            return;
        }

        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: content }
        });
    }, [content]);

    useEffect(() => {
        editorRef.current?.dispatch({
            effects: themeCompartmentRef.current.reconfigure(createMarkdownEditorTheme(metadata))
        });
    }, [metadata]);

    return (
        <div
            ref={containerRef}
            className={`h-fit w-full border-0 p-0 font-light shadow-none ${
                isBlurred ? "blur-[8px]" : ""
            } ${
                metadata.font === "serif"
                    ? "font-serif"
                    : metadata.font === "sans"
                      ? "font-sans"
                      : "font-mono"
            }`}
        />
    );
}
