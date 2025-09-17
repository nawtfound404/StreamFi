# StreamFi Backend — Sepolia On-chain Flow

This guide shows how to run the Nitrolite channel flow against Sepolia, producing real tx hashes visible in MetaMask and Etherscan.

## 1) Configure environment

Copy `.env.example` to `.env` and set:

- JSON_RPC_PROVIDER=https://sepolia.infura.io/v3/<your-key>
- ADMIN_PRIVATE_KEY=0x<funded-admin-key-on-sepolia>
- NITROLITE_* addresses (pre-filled for repo deployments)
- CREATOR_VAULT_ADDRESS=0x04bB... (pre-filled)

Ensure your admin key has ETH on Sepolia.

## 2) Start services

- Mongo and NMS via docker-compose up at repo root (optional for full stack)
- Or run backend only:

```
cd packages/backend
npm run dev
```

## 3) Execute E2E channel flow

In another terminal:
```
cd packages/backend
API_BASE=http://localhost:8000/api \
E2E_EMAIL="streamer+nitro@local" \
E2E_PASSWORD="nitro123" \
E2E_STREAMER_ADDRESS=0x<creator-address> \
E2E_VIEWER_PK=0x<viewer-private-key> \
JSON_RPC_PROVIDER="https://sepolia.infura.io/v3/<key>" \
E2E_ONCHAIN_OPEN=true \
E2E_VIEWER_CLOSE=true \
FORCE_NEW_CHANNEL=true \
E2E_DEPOSIT_WEI=400000000000000 \
node channel-flow.mjs
```

Optional: set `FORCE_SALT=0x1234abcd` to force a unique channel id.

## 4) Expected results

- `open` returns `openTxHash`
- `close` returns `settlementTx`
- Etherscan shows deposit from viewer, vault receives ETH, and settlement transaction

If you don’t see hashes, verify admin key funding and contract addresses.
