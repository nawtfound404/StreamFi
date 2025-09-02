StreamFi — Live Streaming + Web3 + Realtime MVP

Overview
StreamFi is an end-to-end MVP that brings together:

- User auth and roles (Streamer, Viewer, Admin)
- Streaming core (ingest via RTMP, HLS playback wiring)
- Realtime chat/reactions via Socket.IO
- Donations and Web3 NFT hooks
- Admin moderation
- Next.js frontend with a clean theme

What’s included
- Backend (Express + Prisma + Socket.IO)
	- /api/auth: signup/login/me with JWT
	- /api/stream: ingest details, status, HLS URL
	- /api/monetization: summary/donations/NFTs/payouts (MVP data)
	- /api/notifications: list/read (MVP)
	- /api/admin: mute/ban (MVP)
	- Socket.IO server for chat and reactions
- Frontend (Next.js App Router)
	- Wallet connect using RainbowKit + wagmi/viem
	- Viewer pages: live player (HLS.js), chat, donate, mint NFT
	- Dashboard/settings: generate ingest key demo
	- Admin page: mute/ban demo buttons

USP
- Unified stack: live streaming, realtime chat, and Web3 monetization in one codebase
- Modern, accessible UI paired with pragmatic backend wiring
- Extensible: swap RTMP/HLS backends or chain easily

Quick start
1) Prereqs
- Node 18+
- Docker (optional, for compose)

2) Env
- Copy packages/backend/.env.example to .env and fill:
	- DATABASE_URL
	- JWT_SECRET
	- JSON_RPC_PROVIDER, CREATOR_VAULT_ADDRESS, ADMIN_PRIVATE_KEY
	- YELLOW_API_KEY
- Frontend env (build-time):
	- NEXT_PUBLIC_API_BASE (e.g. http://localhost:8000/api)
	- NEXT_PUBLIC_WC_PROJECT_ID (WalletConnect / RainbowKit)
	- Optionally NEXT_PUBLIC_WS_BASE (e.g. ws://localhost:8000)

3) Run with Docker Compose
docker compose up --build

This will start:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- Postgres: localhost:5433 (inside compose network as db:5432)

Local dev (no Docker)
- Backend: cd packages/backend; npm i; npx prisma generate; npm run dev
- Frontend: cd packages/frontend; npm i; npm run dev

MVP walkthrough
- Login with email/password on /auth (JWT stored client-side via zustand)
- Settings → generate ingest to get RTMP URL/key demo
- Streams → select a live stream; HLS wired, chat via Socket.IO
- Donate/Mint NFT buttons call stubs ready to integrate with Stripe/Web3
- Admin page exposes mute/ban demo endpoints

Notes
- RTMP ingest and transcoding are stubbed; point to your NMS/OBS config and update HLS envs
- Chat uses Socket.IO room per stream (query streamId)
- Blockchain service listens to Deposit events (Nitrolite ABI), ensure your env is set

Next steps
- Replace ingest/HLS stubs with your Node Media Server or cloud provider
- Wire real donations (Stripe/UPI/PayPal) and NFT mint flows
- Add persistence for chat and notifications

Payments (Stripe)
- Backend: POST /api/payments/stripe/create-payment-intent returns a clientSecret. Configure STRIPE_SECRET_KEY in backend .env.
- Webhook: set STRIPE_WEBHOOK_SECRET and point Stripe to POST /api/payments/stripe/webhook. Successful payments are recorded in the Transaction table.
- Frontend: a minimal Stripe Elements page is available at /donate. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and NEXT_PUBLIC_API_BASE.
- Optional: use Stripe CLI for local webhook forwarding:
	- Powershell
		stripe listen --forward-to http://localhost:8000/api/payments/stripe/webhook