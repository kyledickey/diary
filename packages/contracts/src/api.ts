import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
    "BAD_REQUEST",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "CONFLICT",
    "VALIDATION_ERROR",
    "INTERNAL_ERROR"
]);

export const apiErrorSchema = z.object({
    error: z.object({
        code: apiErrorCodeSchema,
        message: z.string(),
        requestId: z.string().optional()
    })
});

export const messageResponseSchema = z.object({
    message: z.string()
});

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
