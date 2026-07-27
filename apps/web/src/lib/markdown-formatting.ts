import { EditorSelection, type StateCommand } from "@codemirror/state";

export function toggleMarkdownMark(marker: string): StateCommand {
    return ({ state, dispatch }) => {
        const markerLength = marker.length;
        const transaction = state.changeByRange((range) => {
            if (range.empty) {
                return {
                    changes: { from: range.from, insert: marker + marker },
                    range: EditorSelection.cursor(range.from + markerLength)
                };
            }

            const selectedText = state.sliceDoc(range.from, range.to);
            const hasOuterMarkers =
                range.from >= markerLength &&
                range.to + markerLength <= state.doc.length &&
                state.sliceDoc(range.from - markerLength, range.from) === marker &&
                state.sliceDoc(range.to, range.to + markerLength) === marker;

            if (hasOuterMarkers) {
                return {
                    changes: [
                        { from: range.from - markerLength, to: range.from },
                        { from: range.to, to: range.to + markerLength }
                    ],
                    range: EditorSelection.range(range.from - markerLength, range.to - markerLength)
                };
            }

            return {
                changes: {
                    from: range.from,
                    to: range.to,
                    insert: `${marker}${selectedText}${marker}`
                },
                range: EditorSelection.range(range.from + markerLength, range.to + markerLength)
            };
        });

        dispatch(state.update(transaction, { scrollIntoView: true }));
        return true;
    };
}
