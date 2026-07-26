export type AppErrorCode =
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL_ERROR";

export class AppError extends Error {
    constructor(
        readonly status: 400 | 401 | 403 | 404 | 409 | 500,
        readonly code: AppErrorCode,
        message: string,
        options?: ErrorOptions
    ) {
        super(message, options);
        this.name = "AppError";
    }
}

export const badRequest = (message: string, options?: ErrorOptions) =>
    new AppError(400, "BAD_REQUEST", message, options);

export const unauthorized = () => new AppError(401, "UNAUTHORIZED", "Authentication is required");

export const forbidden = (message = "You do not have access to this resource") =>
    new AppError(403, "FORBIDDEN", message);

export const notFound = (resource: string) =>
    new AppError(404, "NOT_FOUND", `${resource} was not found`);
