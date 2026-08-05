# Migrating from Clerk

This is the one-time cutover guide for an existing Diary deployment. It is not
part of normal setup or operation; new deployments should follow
[Getting started](./getting-started.md).

The migration preserves every existing user ID so `documents.owner_id` remains
valid. Password hashes and sessions are intentionally not transferred. After
cutover, users enter the email already associated with their account and sign
in with the six-digit code sent through Resend.

## What the command changes

`bun run migrate:clerk -- <csv>` performs the complete cutover:

1. recognizes and records the original Diary schema when it predates Drizzle's
   migration journal;
2. applies the Better Auth and subscription schema migration;
3. validates the export for missing fields, duplicate IDs, and duplicate email
   addresses;
4. upserts users with their existing IDs, normalized primary email, verification
   state, name, username, and creation date;
5. preserves existing `stripe_customer_id` values;
6. writes Diary ownership metadata onto existing Stripe customers;
7. imports existing Plus subscriptions into Better Auth's `subscriptions`
   table; and
8. optionally cancels the old Stripe free-plan subscriptions.

The command stops if an email belongs to a different database user or if an
existing database user is absent from the export. It is safe to rerun before
new Better Auth-only users are created.

## 1. Export users

Export the instance's users as CSV from the Clerk dashboard. Use the standard
user export containing at least:

```text
id
first_name
last_name
username
primary_email_address
verified_email_addresses
created_at
```

The password columns may remain in the file, but Diary ignores them. Do not
edit IDs or email addresses after export.

## 2. Configure the new runtime

Set these API variables in the target environment:

```dotenv
API_URL=https://<api-domain>
WEB_URL=https://<web-domain>
BETTER_AUTH_SECRET=<stable high-entropy secret of at least 32 characters>
RESEND_API_KEY=<server-side Resend key>
AUTH_EMAIL_FROM=Diary <auth@mail.kyle.so>
STRIPE_SECRET_KEY=<existing Stripe account key>
STRIPE_PLUS_PRICE_ID=<existing Plus price>
STRIPE_WEBHOOK_SECRET=<new Better Auth endpoint signing secret>
```

Keep the existing `DB_URL` and `ENCRYPTION_KEY`. Verify `mail.kyle.so` in
Resend. Change Stripe's webhook destination to:

```text
https://<api-domain>/api/auth/stripe/webhook
```

If the old integration created Stripe subscriptions for free accounts, expose
that price only to the migration command:

```dotenv
STRIPE_FREE_PRICE_ID=<old free price>
```

It is not a runtime variable after cutover.

## 3. Run the cutover

Run from the repository root with the production API environment loaded:

```bash
bun run migrate:clerk -- /absolute/path/to/users.csv
```

Success prints three counts:

```text
users
importedPlusSubscriptions
canceledLegacyFreeSubscriptions
```

Do not remove the export until those counts have been reviewed. The migration
does not require a PostgreSQL backup as part of this cutover plan.

### Test the cutover in beta

Keep the Clerk export at `clerk-export.csv` in the repository root. The file is
ignored by Git because it contains credential fields even though Diary does not
import them. With beta's public PostgreSQL URL, run:

```bash
bun run test:migrate:clerk -- "<BETA_DB_URL>" --confirm-beta --rerun
```

The test runner validates the CSV, executes the real importer twice to check
idempotency, and verifies imported IDs and emails, the Drizzle migration
journal, document ownership, and subscription ownership. If the beta database
contains Stripe customer IDs, the runner requires a test-mode Stripe key and
refuses a live key. After it passes, verify OTP sign-in manually with an
imported email.

## 4. Verify before directing traffic

1. Confirm the imported user count matches the CSV.
2. Confirm existing document owners still join to `users.id`.
3. Request and verify a six-digit OTP for an imported email, then open an
   existing entry.
4. Confirm an existing Plus user has an active or trialing `plus`
   subscription row and retains Plus behavior.
5. Open `/billing` and confirm Stripe's customer portal loads.
6. Complete a test Plus checkout and confirm the new webhook updates
   `subscriptions`.
7. Confirm a free user has no recurring free subscription.

After these checks, remove the old provider's runtime secrets and webhooks and
revoke them in its dashboard. Keep this guide and the importer until the branch
has been deployed and verified; neither participates in normal requests.
