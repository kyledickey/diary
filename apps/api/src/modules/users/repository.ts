import type { User } from "@diary/contracts";
import { type Database, documents, users } from "@diary/database";
import { eq } from "drizzle-orm";

export class UserRepository {
    constructor(private readonly db: Database) {}

    async find(id: string): Promise<User | null> {
        const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
        return user ?? null;
    }

    async findByStripeCustomerId(customerId: string): Promise<User | null> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.stripe_customer_id, customerId))
            .limit(1);
        return user ?? null;
    }

    async upsert(user: User): Promise<User> {
        const [saved] = await this.db
            .insert(users)
            .values(user)
            .onConflictDoUpdate({
                target: users.id,
                set: {
                    email: user.email,
                    image_url: user.image_url,
                    username: user.username,
                    updated_at: user.updated_at
                }
            })
            .returning();

        if (!saved) {
            throw new Error("Database did not return the saved user");
        }

        return saved;
    }

    async setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
        await this.db
            .update(users)
            .set({ stripe_customer_id: stripeCustomerId })
            .where(eq(users.id, userId));
    }

    async delete(userId: string): Promise<void> {
        await this.db.transaction(async (transaction) => {
            await transaction.delete(documents).where(eq(documents.owner_id, userId));
            await transaction.delete(users).where(eq(users.id, userId));
        });
    }
}
