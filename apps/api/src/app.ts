import { cors } from "@elysia/cors";
import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";
import type { Env } from "./config/env";
import { AppError } from "./lib/errors";
import type { Logger } from "./lib/logger";
import type { AuthService } from "./modules/auth/service";
import { documentRoutes } from "./modules/documents/routes";
import type { DocumentService } from "./modules/documents/service";

export interface AppDependencies {
    env: Env;
    logger: Logger;
    auth: AuthService;
    documents: DocumentService;
}

export function createApp(dependencies: AppDependencies) {
    return new Elysia()
        .use(
            cors({
                origin: dependencies.env.webUrl,
                allowedHeaders: ["Content-Type"],
                methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                credentials: true,
                maxAge: 86_400
            })
        )
        .use(
            openapi({
                documentation: {
                    info: {
                        title: "Diary API",
                        version: "2.0.0",
                        description: "Private journal document and billing API"
                    }
                }
            })
        )
        .onError(({ code, error, set, request }) => {
            const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
            set.headers["x-request-id"] = requestId;

            if (error instanceof AppError) {
                set.status = error.status;
                return {
                    error: {
                        code: error.code,
                        message: error.message,
                        requestId
                    }
                };
            }

            if (code === "VALIDATION") {
                set.status = 422;
                return {
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "The request did not match the expected schema",
                        requestId
                    }
                };
            }

            dependencies.logger.error("Unhandled API error", error, {
                requestId,
                method: request.method,
                path: new URL(request.url).pathname
            });
            set.status = 500;
            return {
                error: {
                    code: "INTERNAL_ERROR",
                    message: "An unexpected error occurred",
                    requestId
                }
            };
        })
        .get("/", () => ({
            name: "Diary API",
            version: "2.0.0"
        }))
        .get("/health", () => ({
            status: "ok",
            timestamp: new Date().toISOString()
        }))
        .mount(dependencies.auth.auth.handler)
        .use(documentRoutes(dependencies.auth, dependencies.documents));
}
