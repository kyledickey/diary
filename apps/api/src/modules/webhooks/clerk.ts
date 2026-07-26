import { verifyWebhook } from "@clerk/backend/webhooks";
import { Elysia } from "elysia";
import type { Env } from "../../config/env";
import { badRequest } from "../../lib/errors";
import type { BillingService } from "../billing/service";
import type { UserService } from "../users/service";

export function clerkWebhookRoutes(
    signingSecret: Env["clerk"]["webhookSecret"],
    users: UserService,
    billing: BillingService
) {
    return new Elysia({ prefix: "/auth" }).post(
        "/webhook/user",
        async ({ request }) => {
            const event = await verifyClerkWebhook(request, signingSecret);

            if (event.type === "user.created") {
                const user = await users.sync(event.data);
                await billing.provisionFreePlan(user.id, user.email);
            }

            if (event.type === "user.updated") {
                await users.sync(event.data);
            }

            if (event.type === "user.deleted" && event.data.id) {
                const user = await users.find(event.data.id);
                if (user) {
                    if (user.stripe_customer_id) {
                        await billing.deleteCustomer(user.stripe_customer_id);
                    }
                    await users.delete(user.id);
                }
            }

            return { message: "Webhook received" };
        },
        {
            parse: "none",
            detail: { summary: "Receive Clerk user webhooks" }
        }
    );
}

async function verifyClerkWebhook(request: Request, signingSecret: string) {
    try {
        return await verifyWebhook(request, { signingSecret });
    } catch (error) {
        throw badRequest("Clerk webhook verification failed", { cause: error });
    }
}
