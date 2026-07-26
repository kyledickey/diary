import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const CURRENT_VERSION = "v2";
const IV_BYTES = 12;

export class DocumentCipher {
    private readonly key: Buffer;

    constructor(secret: string) {
        this.key = createHash("sha256").update(secret).digest();
    }

    encrypt(plaintext: string): string {
        const iv = randomBytes(IV_BYTES);
        const cipher = createCipheriv("aes-256-gcm", this.key, iv);
        const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

        return [
            CURRENT_VERSION,
            iv.toString("hex"),
            cipher.getAuthTag().toString("hex"),
            ciphertext.toString("hex")
        ].join(":");
    }

    decrypt(value: string): string {
        if (value.startsWith(`${CURRENT_VERSION}:`)) {
            return this.decryptCurrent(value);
        }

        return this.decryptLegacy(value);
    }

    private decryptCurrent(value: string): string {
        const [, ivHex, authTagHex, ciphertextHex] = value.split(":");

        if (!ivHex || !authTagHex || ciphertextHex === undefined) {
            throw new Error("Encrypted document has an invalid v2 payload");
        }

        const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(ivHex, "hex"));
        decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

        return Buffer.concat([
            decipher.update(Buffer.from(ciphertextHex, "hex")),
            decipher.final()
        ]).toString("utf8");
    }

    private decryptLegacy(value: string): string {
        const [ivHex, ciphertextHex] = value.split(":");

        if (!ivHex || ciphertextHex === undefined) {
            throw new Error("Encrypted document has an invalid legacy payload");
        }

        const decipher = createDecipheriv("aes-256-cbc", this.key, Buffer.from(ivHex, "hex"));

        return Buffer.concat([
            decipher.update(Buffer.from(ciphertextHex, "hex")),
            decipher.final()
        ]).toString("utf8");
    }
}
