import type { DocumentMetadata } from "@diary/contracts";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAnalytics } from "@/lib/analytics";

const FONT_CLASS = {
    serif: "font-serif",
    sans: "font-sans",
    mono: "font-mono"
} as const;

interface TypographyControlsProps {
    metadata: DocumentMetadata;
    onChange(metadata: DocumentMetadata): void;
}

export default function TypographyControls({ metadata, onChange }: TypographyControlsProps) {
    const track = useAnalytics();
    const fonts = ["serif", "sans", "mono"] as const;

    return (
        <div className="flex w-full flex-col items-start">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Font family</p>
            <ToggleGroup
                aria-label="Font family"
                value={[metadata.font]}
                variant="outline"
                className="w-full"
                onValueChange={(value) => {
                    const font = value[0] as DocumentMetadata["font"] | undefined;
                    if (!font || font === metadata.font) {
                        return;
                    }
                    track("document_font_family_change");
                    onChange({ ...metadata, font });
                }}
            >
                {fonts.map((font) => (
                    <ToggleGroupItem
                        key={font}
                        value={font}
                        aria-label={`Use ${font} font`}
                        // Override both heights so the two-line label fits.
                        className="h-auto min-w-0 flex-1 flex-col gap-1 px-2 py-2.5 sm:h-auto sm:min-w-0"
                    >
                        <span className={`${FONT_CLASS[font]} text-xl leading-tight`}>Ag</span>
                        <span className="text-xs capitalize leading-none text-muted-foreground">
                            {font}
                        </span>
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>

            <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">Font size</p>
            <div className="flex w-full items-center justify-between rounded-lg border p-1">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={metadata.font_size <= 12}
                    onClick={() => {
                        track("document_font_size_change");
                        onChange({ ...metadata, font_size: metadata.font_size - 1 });
                    }}
                >
                    <MinusIcon aria-hidden="true" />
                </Button>
                <p className="text-sm font-medium tabular-nums">{metadata.font_size} px</p>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={metadata.font_size >= 48}
                    onClick={() => {
                        track("document_font_size_change");
                        onChange({ ...metadata, font_size: metadata.font_size + 1 });
                    }}
                >
                    <PlusIcon aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}
