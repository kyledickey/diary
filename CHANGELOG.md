# Changelog

## Unreleased

### Added

-   Add passwordless sign-in and sign-up with six-digit email codes delivered
    through Resend, including resend cooldowns and a refreshed authentication
    flow.
-   Add a redesigned account menu and settings dialog for plan details, billing
    links, theme selection, sign-out, and permanent account deletion.
-   Add a responsive entries menu that groups entries by month, supports
    pinning, and provides a focused empty state for starting the first entry.
-   Add a Clerk CSV migration command and beta test runner that preserve user
    IDs, document ownership, Stripe customers, and Plus subscriptions.
-   Add a deployment guide for cutting existing Clerk installations over to
    Better Auth and Resend.

### Changed

-   Replace Clerk with Better Auth and HTTP-only, database-backed sessions
    shared directly between the web app and API.
-   Modernize Stripe billing around Better Auth's Stripe plugin and Stripe SDK
    22, with PostgreSQL as the subscription entitlement source of truth.
-   Rebuild the web interface on coss and Base UI with Tailwind CSS 4, updated
    design tokens, accessible overlays and controls, and responsive behavior.
-   Redesign the document editor with a quieter autosave indicator, a wider
    writing surface, inline title editing for Plus users, controls that fade
    while typing, and consolidated typography, privacy, entry details, and
    deletion controls.
-   Make rendered Markdown links interactive with `Cmd/Ctrl`-click while
    keeping unsafe URL schemes non-clickable.
-   Refresh the landing, pricing, billing, policy, error, and entry pages to
    match the new application shell and component system.
-   Move database setup to checked-in Drizzle migrations and automatically
    recognize legacy Compose databases that predate the migration journal.
-   Update local development, Docker, deployment, architecture, API, security,
    data model, and migration documentation for the new auth, billing, database,
    and web application flows.

### Fixed

-   Handle existing Diary databases that have the original tables but no
    Drizzle migration table without attempting to recreate their schema.

### Security

-   Hash one-time sign-in codes at rest, limit them to five attempts and a
    ten-minute lifetime, and rate-limit code delivery to once per minute.
-   Use secure, HTTP-only cookies in production with trusted-origin and CSRF
    checks at the Better Auth boundary.

### Removed

-   Remove Clerk runtime dependencies, middleware, webhooks, bearer-token
    plumbing, and free-plan Stripe subscriptions for new users.
-   Remove the legacy sidebar, standalone feedback dialog, Product Hunt embed,
    and superseded shadcn/Radix UI implementations.

## [v1.1.0](https://github.com/kyledickey/diary/releases/tag/v1.1.0) - July 27, 2026

### Added

-   Add Markdown live preview for headings, lists, blockquotes, bold, and
    italic while preserving Diary's distraction-free writing surface.
-   Add `Cmd/Ctrl+B` and `Cmd/Ctrl+I` formatting shortcuts and Markdown-aware
    continuation for lists and blockquotes.

### Changed

-   Replace the Plate and Slate editor stack with a focused CodeMirror Markdown
    input.
-   Use Markdown as the editor content format and lazily convert recognized
    legacy Plate JSON when an entry is opened, without rewriting stored content
    until the entry body is edited.

### Fixed

-   Preserve user-authored text that resembles Plate JSON after saving so the
    document does not remain dirty or repeatedly autosave.

## [v1.0.0](https://github.com/kyledickey/diary/releases/tag/v1.0.0) - July 25, 2026

### Added

-   Add shared contracts and database packages for consistent validation and
    types across the web app and API.
-   Add Docker images, a local Docker Compose stack, and Railway deployment
    configuration for the web app, API, and PostgreSQL.
-   Add automated tests for document encryption, document access, and billing.

### Changed

-   Migrate the web app from Next.js to TanStack Start and React while
    preserving the existing Diary experience.
-   Move browser API interactions to TanStack Query with shared Zod contracts.
-   Rebuild the API around focused authentication, user, document, billing, and
    webhook modules with structured errors.
-   Consolidate development into a Bun and Turbo monorepo with one lockfile,
    shared TypeScript configuration, and root workspace commands.
-   Redesign the landing page and move analytics to Visitors.now.
-   Standardize local ports on `3000` for the web app, `8080` for the API, and
    `5432` for PostgreSQL.

### Security

-   Scope document access and mutations to the authenticated owner.
-   Encrypt new entry content with AES-256-GCM and automatically upgrade legacy
    AES-256-CBC content when it is saved.
-   Create Stripe billing portal sessions from the authenticated user's stored
    customer ID.

### Removed

-   Remove the abandoned mobile app.
-   Remove LogSnag and the obsolete Fly.io deployment configuration.

## [v0.2.7-beta](https://github.com/dickeyy/diary/releases/tag/v0.2.7-beta) - July 27, 2024

### Added

-   Add a title edit feature to the entry page.
    ([`28e03cd`](https://github.com/dickeyy/diary/commit/28e03cd))
-   Add the one daily entry limit for Starter plan users.
    ([`28e03cd`](https://github.com/dickeyy/diary/commit/28e03cd))

### Changed

-   Change the entry page to use the new title edit feature.
    ([`28e03cd`](https://github.com/dickeyy/diary/commit/28e03cd))
-   Change the WS endpoint to use the new title edit feature.
    ([`28e03cd`](https://github.com/dickeyy/diary/commit/28e03cd)))
-   Change the "Coming Soon" features on the pricing page.
    ([`28e03cd`](https://github.com/dickeyy/diary/commit/28e03cd))

### Fixed

-   Fix a bug with the position of the user dropdown button on the sidebar.
    ([`28e03cd`](https://github.com/dickeyy/diary/commit/28e03cd))

## [v0.2.6-beta](https://github.com/dickeyy/diary/releases/tag/v0.2.6-beta) - June 6, 2024

### Added

-   Add Plausible for analytics tracking.
    ([`9684521`](https://github.com/dickeyy/diary/commit/9684521))
-   Add some animations on the home page.
    ([`307ca3b`](https://github.com/dickeyy/diary/commit/307ca3b))
    [`69268ee`](https://github.com/dickeyy/diary/commit/69268ee)

### Changed

-   Updated the privacy policy for the new analytics provider.
    ([`9684521`](https://github.com/dickeyy/diary/commit/9684521))

### Removed

-   Remove all `posthog` references and integrations.
    ([`9684521`](https://github.com/dickeyy/diary/commit/9684521))

## [v0.2.5-beta](https://github.com/dickeyy/diary/releases/tag/v0.2.5-beta) - June 5, 2024

### Added

-   Add a feedback dialog and form.
    ([`fbf9e6f`](https://github.com/dickeyy/diary/commit/fbf9e6f))
    ([`46029e7`](https://github.com/dickeyy/diary/commit/46029e7))
-   Add a PostHog event for feedback submission.
    ([`f94793f`](https://github.com/dickeyy/diary/commit/f94793f))

### Fixed

-   Fix a token `null` error when saving content via WS.
    ([`20f5838`](https://github.com/dickeyy/diary/commit/20f5838))
-   Fix a warning about a `ref` being passed to `PlateContent`.
    ([`d204386`](https://github.com/dickeyy/diary/commit/d204386))

## [v0.2.4-beta](https://github.com/dickeyy/diary/releases/tag/v0.2.4-beta) - June 4, 2024

### Added

-   Add document font options. ([`2a6a7ad`](https://github.com/dickeyy/diary/commit/2a6a7ad))
-   Add `metadata` field to document schema.
    ([`2a6a7ad`](https://github.com/dickeyy/diary/commit/2a6a7ad))
-   Add UI to change document font and size.
    ([`2a6a7ad`](https://github.com/dickeyy/diary/commit/2a6a7ad))

## [v0.2.3-beta](https://github.com/dickeyy/diary/releases/tag/v0.2.3-beta) - June 3, 2024

### Changed

-   Change content renderer from a `textarea` to [Plate](https://platejs.org/).
    ([`572005c`](https://github.com/dickeyy/diary/commit/572005c))
-   Change the backend to handle the new content renderer.
    ([`572005c`](https://github.com/dickeyy/diary/commit/572005c))
-   Change content to be stored as a JSON string in the database to support block architecture.
    ([`572005c`](https://github.com/dickeyy/diary/commit/572005c))
-   The `updateDocumentByID` function now properly returns a single document rather than an array.
    ([`572005c`](https://github.com/dickeyy/diary/commit/572005c))
-   Change `content-input.tsx` to `editor.tsx`.
    ([`572005c`](https://github.com/dickeyy/diary/commit/572005c))

### Fixed

-   Fix a bug where the sidebar sheet wouldn't dismiss when you selected a new entry (mobile).
    ([`572005c`](https://github.com/dickeyy/diary/commit/572005c))
-   Fix a z-index bug causing the document navbar to overlap the sidebar.
    ([`d54d904`](https://github.com/dickeyy/diary/commit/d54d904))

## [v0.2.2-beta](https://github.com/dickeyy/diary/releases/tag/v0.2.2-beta) - June 2, 2024

### Fixed

-   Fix a bug preventing the saving of empty strings.
    ([`4772a07`](https://github.com/dickeyy/diary/commit/4772a07))

### Removed

-   Remove test file `websockets.tsx`.
    ([`4772a07`](https://github.com/dickeyy/diary/commit/4772a07))

## [v0.2.1-beta](https://github.com/dickeyy/diary/releases/tag/v0.2.1-beta) - June 2, 2024

### Added

-   Add WebSocket functionality to the `/documents/` API endpoint.
    ([`e802a34`](https://github.com/dickeyy/diary/commit/e802a34))

### Changed

-   Update frontend to use WebSockets for entry content updates.
    ([`e802a34`](https://github.com/dickeyy/diary/commit/e802a34))
-   Cleaner error messages. ([`e802a34`](https://github.com/dickeyy/diary/commit/e802a34))
-   Move the toast location from the bottom-right to the top-right.
    ([`e802a34`](https://github.com/dickeyy/diary/commit/e802a34))

### Fixed

-   Fix the mobile landing navbar blur.
    ([`b526571`](https://github.com/dickeyy/diary/commit/b526571))

### Removed

-   Remove success toasts for entry creation and deletion.
    ([`e802a34`](https://github.com/dickeyy/diary/commit/e802a34))

## [v0.2.0-beta](https://github.com/dickeyy/diary/releases/tag/v0.2.0-beta) - June 1, 2024

### Added

-   Stripe integration. ([`e7ab9a1`](https://github.com/dickeyy/diary/commit/e7ab9a1))
-   Mobile support for entry pages. ([`e7ab9a1`](https://github.com/dickeyy/diary/commit/e7ab9a1))
-   Add pricing page. ([`e7ab9a1`](https://github.com/dickeyy/diary/commit/e7ab9a1))
-   Add landing page navbar. ([`e7ab9a1`](https://github.com/dickeyy/diary/commit/e7ab9a1))

### Fixed

-   Fix entry page layout. ([`5f36503`](https://github.com/dickeyy/diary/commit/5f36503))
-   Fix sidebar sizing. ([`e7ab9a1`](https://github.com/dickeyy/diary/commit/e7ab9a1))
-   Fix layouts and general containers for landing pages.
    ([`e7ab9a1`](https://github.com/dickeyy/diary/commit/e7ab9a1))
-   General bug fixes. ([`e7ab9a1`](https://github.com/dickeyy/diary/commit/e7ab9a1))

## [v0.1.0-beta](https://github.com/dickeyy/diary/releases/tag/Beta) - May 31, 2024

_First release._ ([`55087c2`](https://github.com/dickeyy/diary/commit/55087c2))
