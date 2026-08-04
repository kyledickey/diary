import { parse } from "csv-parse/sync";

export interface ClerkImportUser {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    username: string | null;
    createdAt: Date;
}

type ClerkCsvRow = Record<string, string | undefined>;

export function parseClerkUsers(csv: string): ClerkImportUser[] {
    const rows = parse(csv, {
        bom: true,
        columns: true,
        skipEmptyLines: true,
        trim: true
    }) as ClerkCsvRow[];
    const users = rows.map(parseClerkUser);
    const ids = new Set<string>();
    const emails = new Map<string, string>();

    for (const user of users) {
        if (ids.has(user.id)) {
            throw new Error(`The Clerk export contains duplicate user ID ${user.id}`);
        }
        ids.add(user.id);

        const previousId = emails.get(user.email);
        if (previousId && previousId !== user.id) {
            throw new Error(`The Clerk export assigns ${user.email} to more than one user`);
        }
        emails.set(user.email, user.id);
    }

    return users;
}

function parseClerkUser(row: ClerkCsvRow): ClerkImportUser {
    const id = required(row, "id");
    const email = required(row, "primary_email_address").toLowerCase();
    const username = clean(row.username);
    const firstName = clean(row.first_name);
    const lastName = clean(row.last_name);
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const name = fullName || username || email.split("@")[0] || "Diary user";
    const verifiedEmails = row.verified_email_addresses?.toLowerCase() ?? "";
    const createdAt = parseDate(row.created_at);

    return {
        id,
        email,
        emailVerified: verifiedEmails.includes(email),
        name,
        username,
        createdAt
    };
}

function required(row: ClerkCsvRow, field: string) {
    const value = clean(row[field]);
    if (!value) {
        throw new Error(`The Clerk export is missing ${field}`);
    }
    return value;
}

function clean(value: string | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
}

function parseDate(value: string | undefined) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
        throw new Error(`The Clerk export contains an invalid created_at value: ${value}`);
    }
    return date;
}
