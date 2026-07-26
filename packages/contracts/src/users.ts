import { z } from "zod";

export const planSchema = z.enum(["free", "plus"]);

export const userSchema = z.object({
    id: z.string().min(1),
    email: z.email(),
    image_url: z.string().nullable(),
    username: z.string().nullable(),
    stripe_customer_id: z.string().nullable(),
    created_at: z.number().int().nonnegative(),
    updated_at: z.number().int().nonnegative()
});

export const billingPortalResponseSchema = z.object({
    url: z.url()
});

export type Plan = z.infer<typeof planSchema>;
export type User = z.infer<typeof userSchema>;
