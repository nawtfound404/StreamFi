import { z } from 'zod';
import 'dotenv/config'; // Ensures .env file is loaded and available to process.env

/**
 * Defines the schema for all environment variables used by the application.
 * This provides validation and type safety. The application will fail to start
 * if any required variables are missing or have the wrong type, preventing
 * misconfiguration errors in production.
 */
const envSchema = z.object({
  // --- Core & Database ---
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string.'),
  
  // --- Authentication ---
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is a required environment variable.'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // --- Blockchain (Web3) ---
  JSON_RPC_PROVIDER: z.string().url('JSON_RPC_PROVIDER must be a valid RPC URL.'),
  CREATOR_VAULT_ADDRESS: z.string().startsWith('0x', 'Contract address must be a valid hex string.'),
  ADMIN_PRIVATE_KEY: z.string().startsWith('0x', 'Admin private key must be a valid hex string.'),
  // Optional contract deploy block to bound event scans
  NITROLITE_DEPLOY_BLOCK: z.coerce.number().optional(),

  // --- Payments ---
  STRIPE_SECRET_KEY: z.string().optional(),

  // --- Yellow SDK / API ---
  YELLOW_API_KEY: z.string().min(1, 'YELLOW_API_KEY is required.'),
  YELLOW_ENVIRONMENT: z.enum(['mainnet', 'testnet']).default('testnet'),

  // --- CORS / Frontend ---
  CORS_ORIGIN: z.string().optional(),

  // --- Node Media Server (Streaming) ---
  NMS_RTMP_URL: z.string().url().default('rtmp://localhost:1935/live'),
  NMS_HLS_BASE: z.string().url().default('http://localhost:8001'),
  NMS_HLS_TEMPLATE: z.string().default('/live/{key}/index.m3u8'),
});

// Parse and validate the environment variables from `process.env`
const parsedEnv = envSchema.parse(process.env);

// Export a structured, type-safe object that mirrors your original structure for easy access
export const env = {
  port: parsedEnv.PORT,
  databaseUrl: parsedEnv.DATABASE_URL,
  jwt: {
    secret: parsedEnv.JWT_SECRET,
    expiresIn: parsedEnv.JWT_EXPIRES_IN,
  },
  google: {
    clientId: parsedEnv.GOOGLE_CLIENT_ID,
    clientSecret: parsedEnv.GOOGLE_CLIENT_SECRET,
  },
  blockchain: {
    rpcProvider: parsedEnv.JSON_RPC_PROVIDER,
    creatorVaultAddress: parsedEnv.CREATOR_VAULT_ADDRESS,
    adminPrivateKey: parsedEnv.ADMIN_PRIVATE_KEY,
  deployFromBlock: parsedEnv.NITROLITE_DEPLOY_BLOCK ?? 0,
  },
  stripe: {
    secretKey: parsedEnv.STRIPE_SECRET_KEY,
  },
  yellow: {
    apiKey: parsedEnv.YELLOW_API_KEY,
    environment: parsedEnv.YELLOW_ENVIRONMENT,
  },
  corsOrigin: parsedEnv.CORS_ORIGIN,
  nms: {
    rtmpUrl: parsedEnv.NMS_RTMP_URL,
    hlsBase: parsedEnv.NMS_HLS_BASE,
    hlsTemplate: parsedEnv.NMS_HLS_TEMPLATE,
  },
};

