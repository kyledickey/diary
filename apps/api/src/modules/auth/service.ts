import type { Plan } from "@diary/contracts";
import { type Database, subscriptions } from "@diary/database";
import { and, eq, inArray } from "drizzle-orm";
import { unauthorized } from "../../lib/errors";
import type { Auth } from "./auth";

export interface AuthenticatedUser {
    id: string;
    email: string;
    name: string;
}

export class AuthService {
    constructor(
        readonly auth: Auth,
        private readonly db: Database
    ) {}

    async requireUser(request: Request): Promise<AuthenticatedUser> {
        const session = await this.auth.api.getSession({
            headers: request.headers
        });

        if (!session) {
            throw unauthorized();
        }

        return {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name
        };
    }

    async getPlan(userId: string): Promise<Plan> {
        const [activeSubscription] = await this.db
            .select({ id: subscriptions.id })
            .from(subscriptions)
            .where(
                and(
                    eq(subscriptions.referenceId, userId),
                    eq(subscriptions.plan, "plus"),
                    inArray(subscriptions.status, ["active", "trialing"])
                )
            )
            .limit(1);

        return activeSubscription ? "plus" : "free";
    }
}
