import type { DocumentMetadata } from "@diary/contracts";
import { Plate, PlateContent } from "@udecode/plate-common";

interface EditorProps {
    content: string;
    setContent(content: string): void;
    isBlurred: boolean;
    metadata: DocumentMetadata;
}

export default function Editor({ content, setContent, isBlurred, metadata }: EditorProps) {
    return (
        <Plate
            initialValue={content ? JSON.parse(content) : undefined}
            onChange={(value) => setContent(JSON.stringify(value))}
        >
            <PlateContent
                className={`h-fit w-full border-0 p-0 font-light leading-loose shadow-none focus:outline-none focus-visible:border-0 focus-visible:ring-0 ${
                    isBlurred ? "blur-[8px]" : ""
                } ${
                    metadata.font === "serif"
                        ? "font-serif"
                        : metadata.font === "sans"
                          ? "font-sans"
                          : "font-mono"
                }`}
                style={{ fontSize: `${metadata.font_size}px` }}
            />
        </Plate>
    );
}
