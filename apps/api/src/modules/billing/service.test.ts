import { describe, expect, test } from "bun:test";
import type Stripe from "stripe";
import type { AuthService } from "../auth/service";
import type { UserService } from "../users/service";
import { BillingService } from "./service";

describe("BillingService", () => {
    test("reconciles the subscription and Clerk metadata for an existing customer", async () => {
        const subscriptionCalls: Stripe.SubscriptionCreateParams[] = [];
        const metadataCalls: Array<[string, string, "free"]> = [];
        const users = {
            find: () =>
                Promise.resolve({
                    id: "user_123",
                    email: "person@example.com",
                    image_url: null,
                    username: null,
                    stripe_customer_id: "cus_existing",
                    created_at: 1,
                    updated_at: 1
                }),
            setStripeCustomerId: () => {
                throw new Error("The existing customer ID should not be stored again");
            }
        } as unknown as UserService;
        const auth = {
            updateBillingMetadata: (userId: string, customerId: string, plan: "free") => {
                metadataCalls.push([userId, customerId, plan]);
                return Promise.resolve();
            }
        } as unknown as AuthService;
        const service = new BillingService(
            {
                secretKey: "sk_test_example",
                freePriceId: "price_free",
                plusPriceId: "price_plus",
                webhookSecret: "whsec_example"
            },
            "https://diary.example",
            auth,
            users
        );

        Object.defineProperty(service, "stripe", {
            value: {
                customers: {
                    create: () => {
                        throw new Error("An existing customer should not be recreated");
                    }
                },
                subscriptions: {
                    create: (params: Stripe.SubscriptionCreateParams) => {
                        subscriptionCalls.push(params);
                        return Promise.resolve({});
                    }
                }
            }
        });

        await expect(service.provisionFreePlan("user_123", "person@example.com")).resolves.toBe(
            "cus_existing"
        );
        expect(subscriptionCalls).toEqual([
            {
                customer: "cus_existing",
                items: [{ price: "price_free", quantity: 1 }]
            }
        ]);
        expect(metadataCalls).toEqual([["user_123", "cus_existing", "free"]]);
    });
});
