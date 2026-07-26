# Web application

`apps/web` is a TanStack Start application: file-based routing, React 19, SSR
rendered by Bun in production. It renders the UI and calls the API from the
browser; it does not proxy or own data.

## Entry points

| File | Role |
| --- | --- |
| `src/routes/` | File-based routes. `routeTree.gen.ts` is generated — never edit it, and it is excluded from Biome. |
| `src/router.tsx` | Creates the router and the `QueryClient`, and wires SSR/query integration |
| `src/start.ts` | `createStart()` with `clerkMiddleware()` in the request pipeline |
| `src/routes/__root.tsx` | HTML shell, `<head>` metadata, fonts, providers, theme, toaster |
| `server.ts` | Production Bun server: serves `dist/client` assets, then hands everything else to the SSR handler |
| `vite.config.ts` | TanStack Start, SVGR, and React plugins; `@/*` path alias from `tsconfig.json` |

`server.ts` only exists in production (`bun --filter @diary/web start`). It
serves files under `dist/client` with `Cache-Control: immutable` for `/assets/*`
and one hour for everything else, and rejects path segments of `.` or `..`
before touching the filesystem. In development Vite handles all of this.

## Routes

| Path | Component | Notes |
| --- | --- | --- |
| `/` | `LandingPage` | Marketing landing page |
| `/home` | `HomePage` | Titled "Diary - About" |
| `/pricing` | `PricingPage` | Plan comparison; the Plus action links to `/upgrade` |
| `/entry` | `EntryLayout` | Signed-in shell with the sidebar; signed-out visitors get a sign-in prompt |
| `/entry/` | `EntryIndexPage` | Redirects to the last selected entry, or the newest one |
| `/entry/$id` | `EntryDocumentPage` | The editor |
| `/billing` | `BillingPage` | Redirects to the Stripe portal |
| `/upgrade` | `BillingPage` | Same component as `/billing` |
| `/changelog` | `PolicyPage` | Renders the repository `CHANGELOG.md` |
| `/privacy` | `PolicyPage` | Renders `src/policies/privacy.md` |
| `/terms` | `PolicyPage` | Renders `src/policies/terms.md` |
| `/sign-in/$` | Clerk `<SignIn>` | Path-based routing |
| `/sign-up/$` | Clerk `<SignUp>` | Path-based routing |

`PolicyPage` imports Markdown with Vite's `?raw` suffix and renders it through
`marked` with `dangerouslySetInnerHTML`. That is safe only because the source is
repository-owned static content — never route user input through it.

Because `/changelog` imports `../../../../CHANGELOG.md`, the root changelog is a
**build input for the web app**. `apps/web/Dockerfile` copies it explicitly and
`apps/web/railway.json` watches it, so editing the changelog triggers a web
redeploy.

## Data layer

`src/lib/api-client.ts` is the only place that calls `fetch`. Every method takes
a `TokenGetter` (Clerk's `getToken`), attaches `Authorization: Bearer …`, throws
`ApiClientError` with the API's status and code on failure, and parses success
responses through the matching `@diary/contracts` schema. A missing token throws
`401 UNAUTHORIZED` locally without a network round trip.

`src/features/<domain>/queries.ts` wraps that client in TanStack Query:

- `documentKeys.all` → `["documents"]`, `documentKeys.detail(id)` →
  `["documents", id]`.
- `documentsQueryOptions` / `documentQueryOptions` are exported separately from
  the hooks so routes can prefetch with the same key and function.
- Queries are `enabled` only when Clerk reports `isSignedIn === true`.
- Mutations update the cache directly in `onSuccess` — create prepends a summary
  and seeds the detail cache, update rewrites both the detail entry and the
  matching list row, delete removes both — so the sidebar reacts without a
  refetch.
- `useUpdateDocumentMutation` sets `scope: { id: "document-<id>" }`, which
  serializes concurrent saves for the same entry.

Client defaults (`src/router.tsx`): 30 s `staleTime`, one retry, no refetch on
window focus.

## The editor

`src/components/document.tsx` holds the autosave logic and is the most
behaviour-dense file in the app.

- Local state is a `Draft` of `{ title, content, metadata }`, compared against
  `lastSaved` to compute the minimal `UpdateDocumentRequest`.
- Saves are debounced at `min(650 * 2 ** saveAttempt, 10_000)` ms. Each failure
  increments `saveAttempt`, so a broken connection backs off to ten seconds; a
  success resets it to 650 ms.
- The header shows a spinner and "Saving" while dirty or in flight, otherwise
  "Edited <relative time>". A 30 s interval re-renders so that relative time
  stays honest.
- The overflow menu holds typography controls (font family, and font size
  clamped to 12–48 to match the contract), a blur toggle for shoulder surfing,
  delete, and word/date statistics.
- Free-plan users get a static title; Plus users get an editable `Input`. The
  API enforces the same rule — the UI is a courtesy, not the control.

`src/components/editor.tsx` is a thin Plate wrapper. Content is stored as a
JSON-serialized Slate value, so `content` is a JSON string end to end, not
Markdown or HTML.

## Client state

- **Server state** — TanStack Query, keyed as above.
- **Selected entry** — `src/stores/document-preferences.ts`, a Zustand store
  persisted to `localStorage` under `document-preferences`. It only holds
  `selectedDocumentId`, which is what lets `/entry/` restore the last entry you
  were reading across sessions.
- **Theme** — `next-themes` with `attribute="class"`, defaulting to dark with
  system detection.
- **Auth and plan** — read from Clerk hooks (`useAuth`, `useUser`). Plan checks
  read `user.publicMetadata.plan`.

The sidebar also pre-checks the free-plan daily limit client-side
(`createdEntryToday`) to show a toast instead of a round trip, but the
authoritative check is the API's `409`.

## Styling and components

Tailwind 3 with CSS variables and shadcn/ui ("new-york", base color zinc,
`components.json`). Primitives live in `src/components/ui/`; add more with:

```bash
bun --filter @diary/web ui:add <component>
```

Fonts are self-hosted through Fontsource and exposed as `--font-sans` (Inter),
`--font-serif` (Averia Serif Libre), and `--font-mono` (JetBrains Mono), which
is what the editor's `metadata.font` selects between.

## Analytics

`src/lib/analytics.ts` wraps a `window.visitors.track` global loaded from the
Visitors.now script tag in `__root.tsx`. Event names are a closed union — add to
`AnalyticsEvent` before calling `trackAnalytics`, and the call is a no-op when
the script has not loaded.

## Feedback

`src/components/feedback-dialog.tsx` composes a `mailto:` link rather than
posting to the API. There is no feedback endpoint.
