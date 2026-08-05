import { useEffect, useState } from "react";

/** Tracks typing so nearby controls can fade until the pointer moves. */
export function useTypingFocus(enabled = true): boolean {
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setIsTyping(false);
            return;
        }

        function handleKeyDown(event: KeyboardEvent): void {
            if (event.key === "Tab") {
                setIsTyping(false);
                return;
            }

            // Only keys that edit text should hide the controls.
            const writes =
                event.key.length === 1 || event.key === "Enter" || event.key === "Backspace";
            if (writes && !event.metaKey && !event.ctrlKey && !event.altKey) {
                setIsTyping(isEditable(event.target));
            }
        }

        function handleFocusIn(event: FocusEvent): void {
            if (!isEditable(event.target)) {
                setIsTyping(false);
            }
        }

        function wake(): void {
            setIsTyping(false);
        }

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("focusin", handleFocusIn);
        window.addEventListener("pointermove", wake, { passive: true });

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("focusin", handleFocusIn);
            window.removeEventListener("pointermove", wake);
        };
    }, [enabled]);

    return isTyping;
}

function isEditable(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
    );
}
