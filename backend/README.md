StreamFi Backend Service
The StreamFi Backend powers the StreamFi platform — a Web3 streaming and monetization service.
It is built with Node.js, TypeScript, Express, and Socket.IO to handle API requests, user management, real-time interactions, and business logic.

🚀 Features
Modular Architecture – Organized by feature modules (Auth, Monetization, Streams, etc.).

RESTful API – Comprehensive endpoints for all platform features.

Real-time Communication – Live stream interactions (e.g., reactions) via Socket.IO.

Database Integration – Uses Prisma ORM with PostgreSQL.

Type-Safe Development – Fully written in TypeScript.

Containerized – Ready for deployment with Docker & Docker Compose.

Linting & Formatting – Ensures clean, consistent code using ESLint & Prettier.

🛠 Tech Stack
Runtime: Node.js (v20)

Language: TypeScript

Framework: Express.js

Real-time Engine: Socket.IO

Database: PostgreSQL

ORM: Prisma

Containerization: Docker & Docker Compose

Tooling: ESLint & Prettier

⚡ Getting Started
Prerequisites
Docker installed and running

Docker Compose (comes with Docker Desktop)

1. Environment Setup
Create a .env file inside the streamfi-backend/ directory:

bash
Copy code
cp .env.example .env
Update the .env file with your database credentials (these should match the db service in your root docker-compose.yml):

env
Copy code
PORT=8000
DATABASE_URL="postgresql://user:password@db:5432/streamfi?schema=public"
2. Run the Application
From the project root (where the main docker-compose.yml lives), run:

bash
Copy code
docker compose up --build
This will:

Build and start all services

Expose the backend service on the configured PORT (default: 8000)

Stream logs to your terminal

🗄 Database Management with Prisma
StreamFi uses Prisma Migrate for database schema changes.

Create a New Migration
Ensure Docker containers are running:

bash
Copy code
docker compose up
In a new terminal, run:

bash
Copy code
docker compose exec backend npx prisma migrate dev --name <migration-name>
Replace <migration-name> with something descriptive, e.g., add-stream-thumbnail.

Seed the Database
To populate the database with initial data:

bash
Copy code
docker compose exec backend npx prisma db seed