# StreamFi Frontend

A modern, modular Next.js app for live streaming with realtime interactions, web3-ready monetization, and a clean UI using shadcn/ui and Tailwind CSS.

## Overview
- Framework: Next.js (App Router)
- Language: TypeScript + React
- Styling: Tailwind CSS (v4) + CSS variables
- UI Library: shadcn/ui
- State: Zustand (persisted auth session)
- Video: hls.js (HLS playback)
- Architecture: Module-based under `modules/*`, App Router under `app/*`

## Folder structure (frontend)
- `app/`
  - `layout.tsx` — App shell with ThemeProvider, SidebarProvider, AppSidebar, Breadcrumbs, and global `AuthGate` for route protection.
  - `page.tsx` — Landing / Home.
  - `auth/page.tsx` — Login (full-screen overlay) using `LoginForm`.
  - `signup/page.tsx` — Signup (full-screen overlay) with session creation.
  - `dashboard/page.tsx` — Overview dashboard (KPIs, live viewers chart, recent donations, quick actions, checklist).
  - `dashboard/monetization/page.tsx` — Monetization hub (donations, NFT sales, payouts, filters, search, sparkline, CSV export).
  - `dashboard/settings/page.tsx` — Profile/payout settings, stream key generation and reveal/hide, ingest status.
  - `dashboard/analytics/page.tsx` — Analytics scaffold.
  - `dashboard/notifications/page.tsx` — Notifications scaffold.
  - `streams/page.tsx` — Streams index or player entry.
  - `streams/[id]/page.tsx` — HLS player page with quality selector and chat placeholder.
- `components/`
  - `app-sidebar.tsx` — Collapsible sidebar navigation (sidebar-07 pattern) with user dropdown and logout.
  - `breadcrumbs.tsx` — Breadcrumbs in header.
  - `login-form.tsx` — Email/password login with error feedback and link to signup.
  - `auth-gate.tsx` — Client-side route guard; centralizes redirects between public/protected pages.
  - `ui/*` — shadcn/ui primitives (sidebar, button, input, card, etc.).
- `lib/`
  - `config.ts` — Build HLS and Chat endpoints via environment config.
  - `utils.ts` — General utilities.
- `modules/`
  - `auth/index.ts` — `signIn`, `signUp` (demo), `getSession` stubs.
  - `streaming/index.ts` — `createIngest` to generate demo ingest URL and stream key.
  - `monetization/index.ts` — Types and data access (API-aware with fallback demo data), summary aggregation.
- `stores/`
  - `auth-store.ts` — Zustand store with `persist` for session, `setSession`, and `signOut`.
- `public/` — Assets (icons, images).

Note: Some files may be stubs/placeholders ready for backend wiring.

## Routing map
- Public
  - `/` — Landing
  - `/auth` — Login (redirects to `/dashboard` if already signed in)
  - `/signup` — Signup (redirects to `/dashboard` if already signed in)
  - `/streams` and `/streams/[id]` — Viewer pages (player + chat placeholder)
- Protected (via `AuthGate` + persisted session)
  - `/dashboard` — Overview
  - `/dashboard/monetization`
  - `/dashboard/analytics`
  - `/dashboard/notifications`
  - `/dashboard/settings`
  - `/admin` (if present)

`AuthGate` ensures:
- Unauthenticated access to protected pages redirects to `/auth`.
- Authenticated access to `/auth` or `/signup` redirects to `/dashboard`.

## Global layout and navigation
- `ThemeProvider` for theme context.
- `SidebarProvider` with `AppSidebar` implementing shadcn sidebar-07 pattern.
- Header includes `SidebarTrigger`, `Separator`, and `AppBreadcrumbs`.
- Page content renders inside `SidebarInset`.

## Authentication
- Store: `stores/auth-store.ts` with Zustand + `persist` (localStorage).
- Login: `components/login-form.tsx` calls `modules/auth.signIn`; shows error on invalid credentials.
- Signup: `app/signup/page.tsx` calls `modules/auth.signUp` (demo), sets session, redirects to dashboard.
- Guard: `components/auth-gate.tsx` runs globally (client) to centralize redirects.
- Demo credentials included in the Login form for quick access.

## Streaming
- Player: HLS playback with `hls.js` on `/streams/[id]`.
- Quality selector UI and viewer stats (demo) on player page.
- Chat: Placeholder UI wired for future WebSocket backend.
- Ingest: `modules/streaming.createIngest()` returns a demo ingest URL and stream key.
- Settings page supports stream key generation and reveal/hide; shows ingest status.

## Monetization
- Data types: `Donation`, `NFTSale`, `Payout` in `modules/monetization`.
- API-aware fetchers using `NEXT_PUBLIC_API_BASE` with graceful fallback to demo data.
- KPIs/Summary: Aggregated totals for donations, NFTs, and payouts.
- Filters: Date ranges (Today / 7d / 30d).
- Search: Global search across monetization items.
- Sparkline: Lightweight inline SVG chart for trend.
- CSV export: Download CSV for donations, NFT sales, and payouts.

## Dashboard
- KPIs: Donations, NFT sales, payouts summary.
- Live viewers: Mini bar chart (demo data).
- Recent donations list (demo or API when available).
- Quick actions: Common tasks (e.g., generate stream key, go to monetization).
- Streaming checklist: Friendly guidance to go live.

## UI and design system
- shadcn/ui primitives used (non-exhaustive):
  - Sidebar, Breadcrumb, Button, Input, Card, Avatar, Badge
  - Scroll-area, Dialog, Sheet, Tooltip, Separator
  - Collapsible, Dropdown-menu, Skeleton, Label
- Tailwind v4 with CSS variables; modern, clean design.

## State management
- Auth session persisted with Zustand `persist` under key `streamfi-auth`.
- Components read session via the store selector; sidebar user dropdown supports `signOut`.

## Configuration
- `lib/config.ts` exposes:
  - `HLS_BASE`, `HLS_PATH_TEMPLATE`, and helpers to build stream URLs.
  - `CHAT_WS_BASE` and helpers for WebSocket URL.
- Environment variables (frontend):
  - `NEXT_PUBLIC_API_BASE` — Optional API endpoint to pull real monetization data.
  - `NEXT_PUBLIC_HLS_BASE` — Optional base URL for HLS origin.
  - `NEXT_PUBLIC_CHAT_WS_BASE` — Optional base URL for chat WebSocket.

## Data and API integration
- Monetization module tries API first when `NEXT_PUBLIC_API_BASE` is set; otherwise uses demo data.
- Future integrations (planned):
  - Payments (Stripe/UPI/PayPal) and Web3 SDK for NFTs.
  - Realtime chat backend and analytics streams.

## Development
- From the `frontend/` folder:
  - `npm install`
  - `npm run dev`
  - `npm run build`
  - `npm start`
  - `npm run lint`

## Accessibility and performance
- Forms and labels follow basic a11y patterns.
- Kept charts lightweight (inline SVG) to minimize bundle size.
- Sidebar collapses to icons for compact navigation.

## Known limitations / next steps
- Replace demo data with real API responses for monetization and analytics.
- Wire realtime chat backend and HLS origin credentials.
- Add “Go Live” controls (start/stop), OBS instructions, and stream status polling.
- Persist settings to backend and add field-level validation with toasts.

## Ownership and conventions
- Module-based structure under `modules/*` to keep domain logic isolated.
- App Router pages under `app/*` with client/server components as needed.
- UI components under `components/*` with shadcn primitives in `components/ui/*`.
- Keep public APIs stable; document changes here when adding routes or modules.

---
If you need additional sections (API contracts, design tokens, or component inventories), we can expand this document as features are wired to real services.

## Proposed API contracts (for backend wiring)

Note: These are suggested shapes from the frontend’s perspective. Adjust as needed during backend implementation.

- Auth
  - POST `/api/auth/login` { email, password } -> { token, user: { id, name, email, role } }
  - POST `/api/auth/signup` { email, password, name } -> { token, user }
  - GET `/api/auth/me` (Bearer token) -> { user }

- Streaming
  - POST `/api/stream/ingest` -> { ingestUrl: string, streamKey: string, status: 'idle'|'live'|'error' }
  - GET `/api/stream/:id/status` -> { id, status, viewers, startedAt? }
  - GET `/api/stream/:id/hls` -> { hlsUrl: string }

- Monetization
  - GET `/api/monetization/summary?range=today|7d|30d` -> { totalDonations, totalNftSales, totalPayouts }
  - GET `/api/monetization/donations?range=...&q=...` -> Donation[]
  - GET `/api/monetization/nfts?range=...&q=...` -> NFTSale[]
  - GET `/api/monetization/payouts?range=...&q=...` -> Payout[]

- Notifications
  - GET `/api/notifications` -> { items: Array<{ id, type, title, body, createdAt, read: boolean }> }
  - POST `/api/notifications/read` { ids: string[] } -> { ok: true }

- Settings
  - GET `/api/settings` -> { displayName, payoutEmail, about }
  - POST `/api/settings` { displayName, payoutEmail, about } -> { ok: true }

Types used in frontend (abridged):
- Donation: { id, amount: number, currency: string, donor: string, message?: string, createdAt: string }
- NFTSale: { id, tokenId: string|number, price: number, currency: string, buyer: string, createdAt: string }
- Payout: { id, amount: number, currency: string, provider: string, status: 'pending'|'paid'|'failed', createdAt: string }

Auth is currently demo-only; when backend is ready, wire `modules/auth` and `stores/auth-store` to use JWT cookies or Bearer tokens.

## Design tokens and UI conventions

- Colors and theme
  - Use shadcn/ui CSS variables (e.g., `--background`, `--foreground`, `--muted`, `--primary`) and Tailwind utilities.
  - Light/Dark handled by ThemeProvider; prefer semantic classes like `text-muted-foreground`, `bg-card`.

- Spacing and layout
  - Consistent spacing via Tailwind scale (e.g., `p-4`, `gap-4`, `space-y-4`).
  - Sidebar header height ~64px (`h-16`); content area uses `min-h-[calc(100dvh-64px)]`.

- Typography
  - Geist Sans/Mono loaded at root; default body font is Geist Sans.
  - Headings in cards use `text-sm font-medium text-muted-foreground` or `text-xl font-semibold` depending on hierarchy.

- Components
  - Prefer shadcn primitives: Button, Input, Card, Separator, Tooltip, Dialog, Dropdown, Skeleton.
  - Keep charts light; use inline SVG for small sparkline/mini bar charts.

- Accessibility
  - Always pair inputs with Label; include `aria-*` where applicable.
  - Ensure focus states visible with `focus-visible` utilities.

- Naming
  - Modules for domain logic under `modules/*`.
  - UI-only, reusable elements in `components/*`; primitives under `components/ui/*`.
  - Environment-driven config in `lib/config.ts`.

