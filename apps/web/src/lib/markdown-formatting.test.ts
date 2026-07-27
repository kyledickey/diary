import { describe, expect, test } from "bun:test";
import { EditorState, type Transaction } from "@codemirror/state";
import { toggleMarkdownMark } from "./markdown-formatting";

describe("toggleMarkdownMark", () => {
    test("wraps and unwraps selected text with bold Markdown", () => {
        const initial = EditorState.create({
            doc: "Make this bold",
            selection: { anchor: 10, head: 14 }
        });
        const bold = runCommand(initial, toggleMarkdownMark("**"));

        expect(bold.doc.toString()).toBe("Make this **bold**");
        expect(bold.sliceDoc(bold.selection.main.from, bold.selection.main.to)).toBe("bold");

        const plain = runCommand(bold, toggleMarkdownMark("**"));
        expect(plain.doc.toString()).toBe("Make this bold");
        expect(plain.sliceDoc(plain.selection.main.from, plain.selection.main.to)).toBe("bold");
    });

    test("wraps selected text with italic Markdown", () => {
        const initial = EditorState.create({
            doc: "A quiet thought",
            selection: { anchor: 2, head: 7 }
        });
        const italic = runCommand(initial, toggleMarkdownMark("_"));

        expect(italic.doc.toString()).toBe("A _quiet_ thought");
        expect(italic.sliceDoc(italic.selection.main.from, italic.selection.main.to)).toBe("quiet");
    });

    test("inserts paired markers around an empty selection", () => {
        const initial = EditorState.create({
            doc: "Start ",
            selection: { anchor: 6 }
        });
        const next = runCommand(initial, toggleMarkdownMark("**"));

        expect(next.doc.toString()).toBe("Start ****");
        expect(next.selection.main.head).toBe(8);
    });
});

function runCommand(
    state: EditorState,
    command: ReturnType<typeof toggleMarkdownMark>
): EditorState {
    let transaction: Transaction | undefined;
    command({
        state,
        dispatch: (next) => {
            transaction = next;
        }
    });

    if (!transaction) {
        throw new Error("Formatting command did not dispatch a transaction");
    }
    return transaction.state;
}
