# StreamFi Backend

A modern, modular Node.js backend for the **StreamFi** platform, built with **TypeScript, Express, Mongoose (MongoDB), and Socket.IO**.
It provides a robust API for authentication, stream management, monetization, and delivers real-time events for an interactive user experience.

---

## 📝 Overview

* **Runtime:** Node.js (v18+)
* **Language:** TypeScript
* **Framework:** Express.js
* **Database ORM:** Mongoose
* **Real-time:** Socket.IO
* **Database:** MongoDB
* **Containerization:** Docker & Docker Compose
* **Architecture:** Feature-based modules under `src/modules/*`

---

## 📂 Folder Structure

```
backend/
├── prisma/ (deprecated)
│   └── README.md              # Prisma removed; using MongoDB via Mongoose
├── src/
│   ├── app.ts                 # Express app setup and middleware
│   ├── server.ts              # Main entry point
│   ├── config/
│   │   └── environment.ts     # Environment variables validation
│   ├── lib/
│   │   └── mongo.ts           # Mongoose connection & models
│   ├── modules/
│   │   ├── auth/              # User registration and login
│   │   ├── monetization/      # Donations, NFT sales, and payouts
│   │   ├── notifications/     # User notifications
│   │   ├── stream/            # Stream key generation and management
│   │   └── users/             # User profile management
│   ├── routes/
│   │   └── index.ts           # Centralized API routes
│   └── utils/                 # Helper utilities
├── tests/                     # Unit and integration tests
├── .env.example               # Example environment variables
├── Dockerfile                 # Docker image build file
├── docker-compose.yml         # Orchestration for services
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/streamfi-backend.git
cd streamfi-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Copy `.env.example` → `.env` and configure (see also `src/config/environment.ts` for required keys):

```bash
cp .env.example .env
```

Required: `DATABASE_URL`, `JWT_SECRET`, `JSON_RPC_PROVIDER`, `CREATOR_VAULT_ADDRESS`, `ADMIN_PRIVATE_KEY`, `YELLOW_API_KEY`.

### 4. Database

This project uses MongoDB. Ensure your `DATABASE_URL` points to a MongoDB instance (e.g., mongodb://localhost:27017/streamfi).

### 5. Start the Development Server

```bash
npm run dev
```

---

## 🛠️ Available Scripts

* `npm run dev` – Start in development mode with hot reload
* `npm run build` – Build TypeScript code for production
* `npm run start` – Start compiled production server
* `npm run lint` – Run ESLint checks
* `npm run test` – Run tests

---

## 🔑 Core Features

* **Authentication & Authorization** – Secure login/registration with JWT
* **Stream Management** – Stream key generation, session handling
* **Real-Time Events** – Live chat and notifications via Socket.IO
* **Monetization** – Support for donations, NFT-based monetization
* **User Profiles** – Manage accounts, settings, and metadata

---

## 🐳 Docker Setup

Build and run using Docker Compose:

```bash
docker-compose up --build
```

---

## 📖 API Documentation

The backend exposes REST + WebSocket APIs.
Detailed Swagger/OpenAPI docs are available at:

```
http://localhost:4000/api/docs
```

---

## ✅ Testing

Run tests with:

```bash
npm run test
```

Tests include:

* Unit tests (Jest)
* Integration tests with Supertest

---

## 🤝 Contributing

1. Fork the repo
2. Create a new branch (`feature/your-feature`)
3. Commit your changes
4. Push to your fork
5. Open a PR

---

## 📜 License

This project is licensed under the MIT License.
