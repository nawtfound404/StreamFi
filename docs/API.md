# StreamFi API (MVP)

Base URL: /api

## Auth
- POST /auth/signup { name, email, password } -> { token, user }
- POST /auth/login { email, password } -> { token, user }
- GET /auth/me (Bearer) -> { user }

## Stream
- POST /stream/ingest (auth) -> { ingestUrl, streamKey }
- GET /stream/:id/hls -> { url } or 302 redirect depending on config

## Monetization
- GET /monetization/summary -> { totalDonationsUSD, totalNftSales, payoutsPendingUSD, sparkline }
- GET /monetization/donations -> Donation[]
- GET /monetization/payouts -> Payout[]
- GET /monetization/nfts -> NFTSale[]
- POST /monetization/payouts (auth) -> create payout

## NFTs
- POST /monetization/nft/mint (auth) { toWallet } -> { ok, tokenId }
- GET  /monetization/nft/:tokenId -> { tokenId, owner, tokenURI }
- GET  /monetization/nft/:tokenId/metadata -> { tokenId, tokenURI, metadata }
- GET  /monetization/nft/owner/:address?cursor=&limit= -> { items[], nextCursor }

## Payments
- POST /payments/stripe/create-payment-intent -> { clientSecret }
- POST /payments/stripe/webhook (Stripe) -> 200/204
- POST /payments/upi/intent -> { intentId, deeplink }
- POST /payments/paypal/intent -> { orderId, approveUrl }

## Admin
- POST /admin/mute { userId }
- POST /admin/ban  { userId }

## Yellow
- GET  /yellow/markets/:symbol
- POST /yellow/orders (auth) { symbol, side, price, size }

## Sockets
- Namespace "/" — query.streamId required. Events:
  - chat_message { streamId, text } -> broadcast chat_message
  - reaction { streamId, type } -> broadcast new_reaction
- Namespace "/mod/:streamId" — only owner of streamId or admin may connect.
  - mod_action { type, targetUserId } -> broadcast mod_event
