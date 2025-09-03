#!/bin/bash
set -e

# ==============================================================================
#  Definitive Setup & Run Script for the StreamFi Project
#  This script resets all configurations to a known-good state and launches
#  the entire application stack. This is the single source of truth.
# ==============================================================================

echo "--- Starting the Definitive Reset for StreamFi ---"

# --- PART 1: FILE SYSTEM CORRECTION ---
# We will now programmatically create every file that has been a problem.

# 1. Create the definitive Frontend Dockerfile
echo "[1/8] Creating definitive frontend Dockerfile..."
cat << 'EOF' > ./packages/frontend/Dockerfile
# --- STAGE 1: The "Workbench" (Builder) ---
# Use a full, stable Debian-based Node.js image to prevent low-level system errors.
FROM node:18-bullseye AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# --- STAGE 2: The "Showroom" (Final Production Image) ---
# Use a small, efficient Alpine-based image for the final result.
FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
EOF
echo "Frontend Dockerfile... DONE."

# 2. Create the definitive Backend Dockerfile
echo "[2/8] Creating definitive backend Dockerfile..."
cat << 'EOF' > ./packages/backend/Dockerfile
# Start from a clean Node.js 20 Alpine image
FROM node:20-alpine
WORKDIR /usr/src/app
RUN apk add --no-cache openssl
COPY packages/backend/package*.json ./
RUN npm install
COPY packages/backend/src ./src
COPY packages/backend/prisma ./prisma
COPY packages/backend/tsconfig.json ./
RUN mkdir -p src/lib/abi
COPY packages/foundry-contracts/out/Nitrolite.sol/Nitrolite.json ./src/lib/abi/Nitrolite.json
RUN npx prisma generate
RUN npm run build
EXPOSE 8000
CMD [ "node", "-r", "tsconfig-paths/register", "dist/server.js" ]
EOF
echo "Backend Dockerfile... DONE."

# 3. Create the definitive docker-compose.yml
echo "[3/8] Creating definitive docker-compose.yml..."
cat << 'EOF' > ./docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: ./packages/backend/Dockerfile
    ports:
      - "8000:8000"
      - "5555:5555" # For Prisma Studio
    env_file:
      - ./packages/backend/.env
    depends_on:
      - db
    networks:
      - streamfi-net

  frontend:
    build:
      context: ./packages/frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    networks:
      - streamfi-net

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: streamfi
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - streamfi-net

volumes:
  postgres_data:

networks:
  streamfi-net:
    driver: bridge
EOF
echo "docker-compose.yml... DONE."

# 4. Create the missing auth.dto.ts file
echo "[4/8] Creating missing auth.dto.ts..."
cat << 'EOF' > ./packages/backend/src/modules/auth/auth.dto.ts
import { User } from '@prisma/client';
export type CreateUserDto = Pick<User, 'name' | 'email' | 'password'>;
EOF
echo "auth.dto.ts... DONE."

# 5. Correct the auth.service.ts file
echo "[5/8] Correcting auth.service.ts..."
cat << 'EOF' > ./packages/backend/src/modules/auth/auth.service.ts
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/environment';
import { User } from '@prisma/client';
import { CreateUserDto } from './auth.dto';

const generateToken = (user: User) => {
  const payload = { id: user.id, role: user.role };
  const secret = env.jwt.secret;
  const options: SignOptions = { expiresIn: env.jwt.expiresIn };
  if (!secret) throw new Error('JWT_SECRET is not defined.');
  return jwt.sign(payload, secret, options);
};

export const signupUser = async (userData: CreateUserDto) => {
  const { email, password, name } = userData;
  if (!email || !password || !name) throw new Error('Name, email, and password are required.');
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error('An account with this email already exists.');
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: 'STREAMER' },
  });
  const token = generateToken(user);
  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};

export const loginUser = async (email: string, password: string) => {
  if (!email || !password) throw new Error('Email and password are required.');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid email or password.');
  }
  const token = generateToken(user);
  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
EOF
echo "auth.service.ts... DONE."

# 6. Correct the auth.middleware.ts file
echo "[6/8] Correcting auth.middleware.ts..."
cat << 'EOF' > ./packages/backend/src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { User } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: { id: string; role: User['role'] };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwt.secret) as { id: string; role: User['role'] };
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    logger.error({ err: error }, 'Invalid token');
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
EOF
echo "auth.middleware.ts... DONE."

# 7. Correct the blockchain.service.ts file
echo "[7/8] Correcting blockchain.service.ts..."
cat << 'EOF' > ./packages/backend/src/services/blockchain.service.ts
import { ethers, Log, EventLog } from 'ethers';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import NitroliteABI from '../lib/abi/Nitrolite.json';

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private registryContract: ethers.Contract;
  private adminWallet: ethers.Wallet;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.blockchain.rpcProvider);
    this.adminWallet = new ethers.Wallet(env.blockchain.adminPrivateKey, this.provider);
    this.registryContract = new ethers.Contract(
      env.blockchain.creatorVaultAddress,
      NitroliteABI.abi,
      this.adminWallet
    );
    logger.info('Blockchain service initialized.');
  }

  public async createVaultForUser(userWalletAddress: string): Promise<bigint> {
    try {
      logger.info(`Sending transaction to create vault for owner: ${userWalletAddress}`);
      const tx = await this.registryContract.createVault(userWalletAddress);
      logger.info(`Transaction sent. Hash: ${tx.hash}. Waiting for confirmation...`);
      const receipt = await tx.wait(1);
      for (const log of receipt.logs as Log[]) {
        try {
          const parsedLog = this.registryContract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'VaultCreated') {
            const vaultId = parsedLog.args.vaultId;
            logger.info(`Transaction confirmed. New Vault ID: ${vaultId.toString()}`);
            return vaultId;
          }
        } catch (error) {}
      }
      throw new Error('VaultCreated event not found in transaction receipt.');
    } catch (error) {
      logger.error({ err: error }, 'Failed to create on-chain vault');
      throw new Error('On-chain vault creation failed.');
    }
  }

  public listenForDonations() {
    const contractAddress = env.blockchain.creatorVaultAddress;
    logger.info(`👂 Listening for Deposit events on contract: ${contractAddress}`);
    this.registryContract.on('Deposit', (vaultId, donor, amount, event: EventLog) => {
      logger.info('🎉 New On-Chain Donation Received!');
      logger.info(`  -> Vault ID: ${vaultId.toString()}`);
      logger.info(`  -> From: ${donor}`);
      logger.info(`  -> Amount: ${ethers.formatEther(amount)} ETH`);
      logger.info(`  -> Transaction: https://sepolia.etherscan.io/tx/${event.transactionHash}`);
    });
  }
}

export const blockchainService = new BlockchainService();
EOF
echo "blockchain.service.ts... DONE."

# --- PART 2: THE BUILD & RUN SEQUENCE ---

# 8. Build the contract ABIs
echo "[8/8] Building smart contract ABIs..."
(cd ./packages/foundry-contracts && forge build)
echo "Contract ABIs built."

# 9. Clean up old Docker resources to ensure a fresh start
echo "Cleaning up old Docker containers and volumes..."
docker compose down --volumes --remove-orphans

# 10. Build and launch the entire stack
echo "Building and starting all services..."
docker compose up --build -d

# 11. Apply the database migrations
echo "Applying database migrations..."
# Wait a few seconds for the database to be ready
sleep 10
docker compose exec backend npx prisma migrate dev --name init

echo "---"
echo "✅ SUCCESS! Your StreamFi platform is now running."
echo "Frontend is available at: http://localhost:3000"
echo "Backend is running on port 8000"
echo "You can view live logs with: docker compose logs -f"
echo "---"
