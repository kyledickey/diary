import { stripeClient } from "@better-auth/stripe/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export const authClient = createAuthClient({
    baseURL: apiUrl,
    fetchOptions: {
        credentials: "include"
    },
    plugins: [emailOTPClient(), stripeClient({ subscription: true })]
});
