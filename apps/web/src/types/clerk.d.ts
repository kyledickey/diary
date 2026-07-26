export {};

declare global {
    interface UserPublicMetadata {
        plan?: "free" | "plus";
        stripeCustomerId?: string;
    }
}
