streamfi/
│── README.md                # Project overview, setup instructions
│── package.json             # Root-level dependencies & scripts
│── .gitignore
│── .env.example             # Example env variables
│── docs/                    # Documentation (design, API contracts, etc.)
│   ├── SRS.pdf
│   ├── architecture.png
│   └── API_DOCS.md
│
├── backend/                 # Node.js backend (Express/Nest.js)
│   ├── package.json
│   ├── src/
│   │   ├── index.js         # Server entry point
│   │   ├── config/          # Env, database, API keys
│   │   ├── modules/         # Domain-wise modules
│   │   │   ├── auth/        # Authentication (JWT, OAuth)
│   │   │   ├── user/        # User (Streamer & Audience profiles)
│   │   │   ├── wallet/      # Blockchain wallet integration
│   │   │   ├── stream/      # Stream sessions, overlays
│   │   │   ├── credits/     # Token/credit mgmt
│   │   │   └── payments/    # Monetization rules & settlements
│   │   ├── middlewares/
│   │   ├── utils/
│   │   └── routes/
│   └── tests/               # Backend tests
│
├── frontend/                # Next.js frontend
│   ├── package.json
│   ├── next.config.js
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── pages/           # Next.js pages
│   │   │   ├── index.js     # Landing page
│   │   │   ├── dashboard/   # Streamer dashboard
│   │   │   ├── live/        # Audience live screen
│   │   │   └── overlay/     # Stream overlay UI
│   │   ├── components/      # Shared React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API calls (axios/fetch)
│   │   ├── store/           # State mgmt (Redux/Zustand)
│   │   └── utils/
│   └── tests/               # Frontend tests
│
├── overlay-plugin/          # Lightweight overlay plugin
│   ├── manifest.json        # Browser extension manifest
│   ├── src/
│   │   ├── index.js         # Overlay injector
│   │   ├── content.js       # Injected into YouTube/Twitch DOM
│   │   └── ui/              # Overlay UI (React)
│
├── blockchain/              # Smart contracts + blockchain logic
│   ├── contracts/           # Solidity / PyTeal contracts
│   ├── scripts/             # Deployment scripts
│   ├── test/                # Contract tests
│   └── package.json
│
├── devops/                  # CI/CD, Docker, Deployment
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── k8s/                 # Kubernetes manifests
│   └── workflows/           # GitHub Actions / CI configs
│
└── scripts/                 # Automation scripts
    ├── seed.js              # DB seeding
    └── cleanup.js
