import type { Plan } from "@diary/contracts";
import Stripe from "stripe";
import type { Env } from "../../config/env";
import { notFound } from "../../lib/errors";
import type { AuthService } from "../auth/service";
import type { UserService } from "../users/service";

export class BillingService {
    readonly stripe: Stripe;

    constructor(
        private readonly config: Env["stripe"],
        private readonly webUrl: string,
        private readonly auth: AuthService,
        private readonly users: UserService
    ) {
        this.stripe = new Stripe(config.secretKey, {
            typescript: true
        });
    }

    async createPortal(userId: string): Promise<string> {
        const user = await this.users.find(userId);

        if (!user?.stripe_customer_id) {
            throw notFound("Billing customer");
        }

        const session = await this.stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: `${this.webUrl}/entry`
        });
        return session.url;
    }

    async provisionFreePlan(userId: string, email: string): Promise<string> {
        const existing = await this.users.find(userId);
        if (existing?.stripe_customer_id) {
            return existing.stripe_customer_id;
        }

        const customer = await this.stripe.customers.create(
            {
                email,
                metadata: { clerkUserId: userId }
            },
            { idempotencyKey: `diary-customer-${userId}` }
        );

        await this.stripe.subscriptions.create(
            {
                customer: customer.id,
                items: [{ price: this.config.freePriceId, quantity: 1 }]
            },
            { idempotencyKey: `diary-free-subscription-${userId}` }
        );

        await this.users.setStripeCustomerId(userId, customer.id);
        await this.auth.updateBillingMetadata(userId, customer.id, "free");
        return customer.id;
    }

    async deleteCustomer(customerId: string): Promise<void> {
        await this.stripe.customers.del(customerId);
    }

    constructWebhookEvent(payload: string | Buffer, signature: string) {
        return this.stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret);
    }

    async handleSubscription(subscription: Stripe.Subscription, forcedPlan?: Plan) {
        const customerId =
            typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer.id;
        const user = await this.users.findByStripeCustomerId(customerId);

        if (!user) {
            throw notFound("User");
        }

        const priceId = subscription.items.data[0]?.price.id;
        const plan: Plan = forcedPlan ?? (priceId === this.config.freePriceId ? "free" : "plus");
        await this.auth.updateBillingMetadata(user.id, customerId, plan);
    }
}
