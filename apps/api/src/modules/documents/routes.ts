import {
    createDocumentRequestSchema,
    documentIdParamsSchema,
    updateDocumentContentRequestSchema,
    updateDocumentRequestSchema
} from "@diary/contracts";
import { Elysia } from "elysia";
import type { AuthService } from "../auth/service";
import type { DocumentService } from "./service";

export function documentRoutes(auth: AuthService, documents: DocumentService) {
    const list = async (request: Request) => {
        const user = await auth.requireUser(request);
        return { documents: await documents.list(user.id) };
    };

    return new Elysia({ prefix: "/documents" })
        .get("/", ({ request }) => list(request), {
            detail: { summary: "List the signed-in user's entries" }
        })
        .get("/all", ({ request }) => list(request), {
            detail: {
                summary: "List entries (legacy-compatible path)",
                deprecated: true
            }
        })
        .post(
            "/",
            async ({ request, body }) => {
                const user = await auth.requireUser(request);
                const plan = await auth.getPlan(user.id);
                return {
                    document: await documents.create(user.id, body, plan)
                };
            },
            {
                body: createDocumentRequestSchema,
                detail: { summary: "Create an entry" }
            }
        )
        .get(
            "/:id",
            async ({ request, params }) => {
                const user = await auth.requireUser(request);
                return {
                    document: await documents.get(user.id, params.id)
                };
            },
            {
                params: documentIdParamsSchema,
                detail: { summary: "Get an entry" }
            }
        )
        .patch(
            "/:id",
            async ({ request, params, body }) => {
                const user = await auth.requireUser(request);
                const plan = body.title === undefined ? "plus" : await auth.getPlan(user.id);
                return {
                    document: await documents.update(user.id, params.id, body, plan)
                };
            },
            {
                params: documentIdParamsSchema,
                body: updateDocumentRequestSchema,
                detail: { summary: "Update an entry" }
            }
        )
        .post(
            "/:id",
            async ({ request, params, body }) => {
                const user = await auth.requireUser(request);
                return {
                    document: await documents.update(user.id, params.id, body, "plus")
                };
            },
            {
                params: documentIdParamsSchema,
                body: updateDocumentContentRequestSchema,
                detail: {
                    summary: "Update entry content (legacy-compatible path)",
                    deprecated: true
                }
            }
        )
        .delete(
            "/:id",
            async ({ request, params }) => {
                const user = await auth.requireUser(request);
                await documents.delete(user.id, params.id);
                return { success: true as const };
            },
            {
                params: documentIdParamsSchema,
                detail: { summary: "Delete an entry" }
            }
        );
}
