import { describe, expect, test } from "bun:test";
import { parseClerkUsers } from "./clerk-import";

describe("parseClerkUsers", () => {
    test("imports Clerk identities without passwords", () => {
        const csv = [
            "id,first_name,last_name,username,primary_email_address,verified_email_addresses,password_digest,created_at",
            'user_123,Kyle,Dickey,kyle,kyle@example.com,"kyle@example.com,other@example.com",ignored,2024-06-01T05:34:22Z'
        ].join("\n");

        expect(parseClerkUsers(csv)).toEqual([
            {
                id: "user_123",
                email: "kyle@example.com",
                emailVerified: true,
                name: "Kyle Dickey",
                username: "kyle",
                createdAt: new Date("2024-06-01T05:34:22Z")
            }
        ]);
    });

    test("rejects duplicate primary emails", () => {
        const csv = [
            "id,primary_email_address",
            "user_1,same@example.com",
            "user_2,same@example.com"
        ].join("\n");

        expect(() => parseClerkUsers(csv)).toThrow("more than one user");
    });
});
