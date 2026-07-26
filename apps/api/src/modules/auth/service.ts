import { type ClerkClient, createClerkClient, type User } from "@clerk/backend";
import type { Plan } from "@diary/contracts";
import type { Env } from "../../config/env";
import { unauthorized } from "../../lib/errors";

export interface AuthenticatedUser {
    id: string;
}

export class AuthService {
    readonly client: ClerkClient;

    constructor(private readonly config: Env["clerk"]) {
        this.client = createClerkClient({
            publishableKey: config.publishableKey,
            secretKey: config.secretKey
        });
    }

    async requireUser(request: Request): Promise<AuthenticatedUser> {
        const state = await this.client.authenticateRequest(request, {
            acceptsToken: "session_token",
            authorizedParties: this.config.authorizedParties,
            jwtKey: this.config.jwtKey
        });

        if (!state.isAuthenticated) {
            throw unauthorized();
        }

        return { id: state.toAuth().userId };
    }

    async getUser(userId: string): Promise<User> {
        return this.client.users.getUser(userId);
    }

    async getPlan(userId: string): Promise<Plan> {
        const user = await this.getUser(userId);
        return user.publicMetadata.plan === "plus" ? "plus" : "free";
    }

    async updateBillingMetadata(userId: string, stripeCustomerId: string, plan: Plan) {
        await this.client.users.updateUserMetadata(userId, {
            publicMetadata: {
                stripeCustomerId,
                plan
            }
        });
    }
}
