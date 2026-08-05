import { z } from "zod";

export const planSchema = z.enum(["free", "plus"]);

export type Plan = z.infer<typeof planSchema>;
