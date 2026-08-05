import { syntaxTree } from "@codemirror/language";
import {
    type EditorState,
    type Extension,
    type Range,
    StateEffect,
    StateField
} from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import type { DocumentMetadata } from "@diary/contracts";

const setEditorFocused = StateEffect.define<boolean>();

class BulletWidget extends WidgetType {
    toDOM(): HTMLElement {
        const bullet = document.createElement("span");
        bullet.className = "cm-live-bullet";
        bullet.textContent = "•";
        return bullet;
    }
}

const livePreviewField = StateField.define<{
    decorations: DecorationSet;
    focused: boolean;
}>({
    create(state) {
        return {
            decorations: buildLivePreview(state, false),
            focused: false
        };
    },
    update(value, transaction) {
        let focused = value.focused;
        for (const effect of transaction.effects) {
            if (effect.is(setEditorFocused)) {
                focused = effect.value;
            }
        }

        if (transaction.docChanged || transaction.selection || focused !== value.focused) {
            return {
                decorations: buildLivePreview(transaction.state, focused),
                focused
            };
        }
        return value;
    },
    provide: (field) => EditorView.decorations.from(field, (value) => value.decorations)
});

export const markdownLivePreview: Extension = [
    livePreviewField,
    EditorView.domEventHandlers({
        focus(_event, view) {
            view.dispatch({ effects: setEditorFocused.of(true) });
        },
        blur(_event, view) {
            view.dispatch({ effects: setEditorFocused.of(false) });
        },
        mousedown(event) {
            const link = getLivePreviewLink(event.target);
            if (!link || (!event.metaKey && !event.ctrlKey)) {
                return false;
            }

            event.preventDefault();
            window.open(link.href, "_blank", "noopener,noreferrer");
            return true;
        }
    })
];

export function createMarkdownEditorTheme(metadata: DocumentMetadata): Extension {
    return EditorView.theme({
        "&": {
            width: "100%",
            backgroundColor: "transparent",
            color: "var(--foreground)",
            fontFamily: "inherit",
            fontSize: `${metadata.font_size}px`
        },
        "&.cm-focused": {
            outline: "none"
        },
        ".cm-scroller": {
            overflow: "visible",
            fontFamily: "inherit",
            lineHeight: "1.9"
        },
        ".cm-content": {
            minHeight: "84vh",
            padding: "0",
            caretColor: "currentColor"
        },
        ".cm-line": {
            padding: "0"
        },
        ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: "currentColor"
        },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
            backgroundColor: "color-mix(in srgb, var(--primary) 18%, transparent)"
        },
        ".cm-placeholder": {
            color: "color-mix(in srgb, var(--foreground) 35%, transparent)",
            fontStyle: "normal"
        },
        ".cm-live-heading": {
            color: "var(--foreground)",
            fontWeight: "700",
            lineHeight: "1.35",
            paddingTop: "0.35em"
        },
        ".cm-live-heading *": {
            textDecoration: "none"
        },
        ".cm-live-heading-1": {
            fontSize: "1.8em"
        },
        ".cm-live-heading-2": {
            fontSize: "1.5em"
        },
        ".cm-live-heading-3": {
            fontSize: "1.25em"
        },
        ".cm-live-heading-4, .cm-live-heading-5, .cm-live-heading-6": {
            fontSize: "1.1em"
        },
        ".cm-live-strong": {
            fontWeight: "700"
        },
        ".cm-live-emphasis": {
            fontStyle: "italic"
        },
        ".cm-live-marker": {
            color: "color-mix(in srgb, var(--foreground) 35%, transparent)"
        },
        ".cm-live-link": {
            color: "var(--foreground)",
            cursor: "pointer",
            textDecoration: "underline",
            textDecorationColor: "color-mix(in srgb, var(--foreground) 40%, transparent)",
            textUnderlineOffset: "0.16em"
        },
        ".cm-live-url, .cm-live-url *": {
            color: "color-mix(in srgb, var(--foreground) 72%, transparent) !important"
        },
        ".cm-live-bullet": {
            display: "inline-block",
            width: "1ch",
            color: "color-mix(in srgb, var(--foreground) 70%, transparent)"
        },
        ".cm-live-quote": {
            borderLeft: "2px solid color-mix(in srgb, var(--primary) 40%, transparent)",
            paddingLeft: "0.75rem",
            color: "color-mix(in srgb, var(--foreground) 65%, transparent)",
            fontStyle: "italic"
        }
    });
}

function buildLivePreview(state: EditorState, focused: boolean): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const decoratedLines = new Set<string>();

    syntaxTree(state).iterate({
        enter(node) {
            const { name } = node.type;
            // Keep markdown syntax visible while the cursor is inside it.
            const activeRange =
                name === "Link" || name === "Autolink" ? node.node : (node.node.parent ?? node);
            const active =
                focused &&
                state.selection.ranges.some(
                    (range) => range.from <= activeRange.to && range.to >= activeRange.from
                );

            if (name.startsWith("ATXHeading")) {
                const level = Number(name.at(-1));
                addLineDecoration(
                    state,
                    node.from,
                    `cm-live-heading cm-live-heading-${level}`,
                    decoratedLines,
                    decorations
                );
            } else if (name === "StrongEmphasis") {
                decorations.push(
                    Decoration.mark({ class: "cm-live-strong" }).range(node.from, node.to)
                );
            } else if (name === "Emphasis") {
                decorations.push(
                    Decoration.mark({ class: "cm-live-emphasis" }).range(node.from, node.to)
                );
            } else if (name === "Blockquote") {
                addBlockLineDecorations(
                    state,
                    node.from,
                    node.to,
                    "cm-live-quote",
                    decoratedLines,
                    decorations
                );
            } else if ((name === "Link" || name === "Autolink") && !active) {
                addLinkDecorations(state, node.node, decorations);
            } else if (name === "URL") {
                decorations.push(
                    Decoration.mark({ class: "cm-live-url" }).range(node.from, node.to)
                );
            } else if (name === "ListMark") {
                const marker = state.sliceDoc(node.from, node.to).trim();
                if (!active && ["-", "*", "+"].includes(marker)) {
                    decorations.push(
                        Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to)
                    );
                } else {
                    decorations.push(
                        Decoration.mark({ class: "cm-live-marker" }).range(node.from, node.to)
                    );
                }
            } else if (
                !active &&
                (name === "HeaderMark" || name === "QuoteMark" || name === "EmphasisMark")
            ) {
                decorations.push(Decoration.replace({}).range(node.from, node.to));
            } else if (name === "HeaderMark" || name === "QuoteMark" || name === "EmphasisMark") {
                decorations.push(
                    Decoration.mark({ class: "cm-live-marker" }).range(node.from, node.to)
                );
            }
        }
    });

    return Decoration.set(decorations, true);
}

function addLinkDecorations(
    state: EditorState,
    linkNode: ReturnType<typeof syntaxTree>["topNode"],
    decorations: Range<Decoration>[]
) {
    const marks: { from: number; to: number }[] = [];
    let urlRange: { from: number; to: number } | undefined;

    for (let child = linkNode.firstChild; child; child = child.nextSibling) {
        if (child.type.name === "LinkMark") {
            marks.push({ from: child.from, to: child.to });
        } else if (child.type.name === "URL") {
            urlRange = { from: child.from, to: child.to };
        }
    }

    if (!urlRange) {
        return;
    }

    const href = safeLinkHref(state.sliceDoc(urlRange.from, urlRange.to));
    if (!href) {
        return;
    }

    const isAutolink = linkNode.type.name === "Autolink";
    const labelFrom = isAutolink ? urlRange.from : marks[0]?.to;
    const labelTo = isAutolink ? urlRange.to : marks[1]?.from;
    if (labelFrom === undefined || labelTo === undefined || labelFrom >= labelTo) {
        return;
    }

    if (linkNode.from < labelFrom) {
        decorations.push(Decoration.replace({}).range(linkNode.from, labelFrom));
    }
    if (labelTo < linkNode.to) {
        decorations.push(Decoration.replace({}).range(labelTo, linkNode.to));
    }
    decorations.push(
        Decoration.mark({
            tagName: "a",
            class: "cm-live-link",
            attributes: {
                href,
                rel: "noopener noreferrer",
                target: "_blank",
                title: "Cmd/Ctrl-click to open link"
            }
        }).range(labelFrom, labelTo)
    );
}

function safeLinkHref(value: string): string | undefined {
    const href = value.trim();
    // Do not turn scriptable URL schemes into clickable links.
    if (
        /^(?:https?:|mailto:)/i.test(href) ||
        href.startsWith("/") ||
        href.startsWith("./") ||
        href.startsWith("../") ||
        href.startsWith("#") ||
        href.startsWith("?")
    ) {
        return href;
    }
    return undefined;
}

function getLivePreviewLink(target: EventTarget | null): HTMLAnchorElement | null {
    return target instanceof Element ? target.closest<HTMLAnchorElement>("a.cm-live-link") : null;
}

function addBlockLineDecorations(
    state: EditorState,
    from: number,
    to: number,
    className: string,
    decoratedLines: Set<string>,
    decorations: Range<Decoration>[]
) {
    const firstLine = state.doc.lineAt(from).number;
    const lastLine = state.doc.lineAt(to).number;
    for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber += 1) {
        addLineDecoration(
            state,
            state.doc.line(lineNumber).from,
            className,
            decoratedLines,
            decorations
        );
    }
}

function addLineDecoration(
    state: EditorState,
    position: number,
    className: string,
    decoratedLines: Set<string>,
    decorations: Range<Decoration>[]
) {
    const lineStart = state.doc.lineAt(position).from;
    const key = `${lineStart}:${className}`;
    if (decoratedLines.has(key)) {
        return;
    }

    decoratedLines.add(key);
    decorations.push(Decoration.line({ class: className }).range(lineStart));
}
