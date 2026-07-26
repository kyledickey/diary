import { billingPortalResponseSchema } from "@diary/contracts";
import { Elysia, t } from "elysia";
import { badRequest } from "../../lib/errors";
import type { AuthService } from "../auth/service";
import type { BillingService } from "./service";

export function billingRoutes(auth: AuthService, billing: BillingService) {
    return new Elysia({ prefix: "/billing" }).post(
        "/portal",
        async ({ request }) => {
            const user = await auth.requireUser(request);
            return { url: await billing.createPortal(user.id) };
        },
        {
            response: { 200: billingPortalResponseSchema },
            detail: { summary: "Create a Stripe billing portal session" }
        }
    );
}

export function stripeWebhookRoutes(billing: BillingService) {
    return new Elysia({ prefix: "/stripe" }).post(
        "/webhook",
        async ({ request, headers, status }) => {
            const signature = headers["stripe-signature"];
            if (!signature) {
                return status(400, { message: "Missing Stripe signature" });
            }

            const payload = Buffer.from(await request.arrayBuffer());
            const event = (() => {
                try {
                    return billing.constructWebhookEvent(payload, signature);
                } catch (error) {
                    throw badRequest("Stripe webhook verification failed", { cause: error });
                }
            })();

            if (
                event.type === "customer.subscription.updated" ||
                event.type === "customer.subscription.deleted"
            ) {
                await billing.handleSubscription(
                    event.data.object,
                    event.type === "customer.subscription.deleted" ? "free" : undefined
                );
            }

            return { message: "Webhook received" };
        },
        {
            headers: t.Object({
                "stripe-signature": t.String()
            }),
            parse: "none",
            detail: { summary: "Receive Stripe subscription webhooks" }
        }
    );
}
