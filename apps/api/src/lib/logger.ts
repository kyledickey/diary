export interface Logger {
    info(message: string, context?: Record<string, unknown>): void;
    error(message: string, error: unknown, context?: Record<string, unknown>): void;
}

function write(level: "info" | "error", message: string, context?: Record<string, unknown>) {
    const entry = JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context
    });

    if (level === "error") {
        console.error(entry);
        return;
    }

    console.info(entry);
}

export const logger: Logger = {
    info: (message, context) => write("info", message, context),
    error: (message, error, context) =>
        write("error", message, {
            ...context,
            error: error instanceof Error ? error.message : String(error)
        })
};
