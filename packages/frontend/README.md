## StreamFi Frontend

Next.js 15 + React 19 app for the StreamFi platform. HLS playback with quality selector, realtime chat, donations, NFTs, and admin tools.

### Features
- HLS player (hls.js) with retry/backoff and manual quality select
- Wallet connect (RainbowKit/wagmi), basic web3 hooks
- Dashboard: monetization views, payouts, settings
- Admin: moderation actions

### Setup
1) Copy env

```bash
cp .env.example .env.local
```

2) Edit `.env.local`:
- `NEXT_PUBLIC_API_BASE=http://localhost:8000/api`
- `NEXT_PUBLIC_WC_PROJECT_ID=your-walletconnect-id`
- Optional: `NEXT_PUBLIC_HLS_BASE`, `NEXT_PUBLIC_HLS_PATH_TEMPLATE`, `NEXT_PUBLIC_CHAT_WS_BASE`
- Optional: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

3) Install & run

```bash
npm install
npm run dev
```

Visit http://localhost:3000

### Build
```bash
npm run build
```
