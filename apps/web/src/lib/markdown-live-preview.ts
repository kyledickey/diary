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
        }
    })
];

export function createMarkdownEditorTheme(metadata: DocumentMetadata): Extension {
    return EditorView.theme({
        "&": {
            width: "100%",
            backgroundColor: "transparent",
            color: "inherit",
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
            backgroundColor: "hsl(var(--primary) / 0.18)"
        },
        ".cm-placeholder": {
            color: "hsl(var(--foreground) / 0.35)",
            fontStyle: "normal"
        },
        ".cm-live-heading": {
            color: "hsl(var(--foreground))",
            fontWeight: "700",
            lineHeight: "1.35",
            paddingTop: "0.35em"
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
            color: "hsl(var(--foreground) / 0.35)"
        },
        ".cm-live-bullet": {
            display: "inline-block",
            width: "1ch",
            color: "hsl(var(--foreground) / 0.7)"
        },
        ".cm-live-quote": {
            borderLeft: "2px solid hsl(var(--primary) / 0.4)",
            paddingLeft: "0.75rem",
            color: "hsl(var(--foreground) / 0.65)",
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
            const activeRange = node.node.parent ?? node;
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
