import type { User } from "@diary/contracts";
import type { UserRepository } from "./repository";

interface ClerkWebhookUserData {
    id: string;
    email_addresses: Array<{
        id: string;
        email_address: string;
    }>;
    primary_email_address_id: string | null;
    image_url: string | null;
    username: string | null;
    created_at: number;
    updated_at: number;
}

export class UserService {
    constructor(private readonly repository: UserRepository) {}

    find(id: string) {
        return this.repository.find(id);
    }

    findByStripeCustomerId(customerId: string) {
        return this.repository.findByStripeCustomerId(customerId);
    }

    async sync(data: ClerkWebhookUserData): Promise<User> {
        const primaryEmail =
            data.email_addresses.find((address) => address.id === data.primary_email_address_id) ??
            data.email_addresses[0];

        if (!primaryEmail) {
            throw new Error(`Clerk user ${data.id} has no email address`);
        }

        const existing = await this.repository.find(data.id);
        return this.repository.upsert({
            id: data.id,
            email: primaryEmail.email_address,
            image_url: data.image_url ?? null,
            username: data.username ?? null,
            stripe_customer_id: existing?.stripe_customer_id ?? null,
            created_at: data.created_at,
            updated_at: data.updated_at
        });
    }

    setStripeCustomerId(userId: string, customerId: string) {
        return this.repository.setStripeCustomerId(userId, customerId);
    }

    delete(userId: string) {
        return this.repository.delete(userId);
    }
}
