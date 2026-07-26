import { describe, expect, it } from "bun:test";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { DocumentCipher } from "./cipher";

describe("DocumentCipher", () => {
    it("round-trips authenticated ciphertext", () => {
        const cipher = new DocumentCipher("test-secret");
        const encrypted = cipher.encrypt("private thoughts");

        expect(encrypted).toStartWith("v2:");
        expect(cipher.decrypt(encrypted)).toBe("private thoughts");
    });

    it("still decrypts legacy AES-CBC documents", () => {
        const secret = "legacy-secret";
        const key = createHash("sha256").update(secret).digest();
        const iv = randomBytes(16);
        const legacyCipher = createCipheriv("aes-256-cbc", key, iv);
        const encrypted = Buffer.concat([
            legacyCipher.update("old entry", "utf8"),
            legacyCipher.final()
        ]);
        const payload = `${iv.toString("hex")}:${encrypted.toString("hex")}`;

        expect(new DocumentCipher(secret).decrypt(payload)).toBe("old entry");
    });

    it("rejects tampered authenticated ciphertext", () => {
        const cipher = new DocumentCipher("test-secret");
        const encrypted = cipher.encrypt("private thoughts");
        const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("0") ? "1" : "0"}`;

        expect(() => cipher.decrypt(tampered)).toThrow();
    });
});
