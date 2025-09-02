"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
require("dotenv/config"); // Ensures .env file is loaded and available to process.env
/**
 * Defines the schema for all environment variables used by the application.
 * This provides validation and type safety. The application will fail to start
 * if any required variables are missing or have the wrong type, preventing
 * misconfiguration errors in production.
 */
const envSchema = zod_1.z.object({
    // --- Core & Database ---
    PORT: zod_1.z.coerce.number().default(8000),
    DATABASE_URL: zod_1.z.string().url('DATABASE_URL must be a valid PostgreSQL connection string.'),
    // --- Authentication ---
    JWT_SECRET: zod_1.z.string().min(1, 'JWT_SECRET is a required environment variable.'),
    JWT_EXPIRES_IN: zod_1.z.string().default('1d'),
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional(),
    // --- Blockchain (Web3) ---
    JSON_RPC_PROVIDER: zod_1.z.string().url('JSON_RPC_PROVIDER must be a valid RPC URL.'),
    CREATOR_VAULT_ADDRESS: zod_1.z.string().startsWith('0x', 'Contract address must be a valid hex string.'),
    ADMIN_PRIVATE_KEY: zod_1.z.string().startsWith('0x', 'Admin private key must be a valid hex string.'),
    // Optional contract deploy block to bound event scans
    NITROLITE_DEPLOY_BLOCK: zod_1.z.coerce.number().optional(),
    // --- Payments ---
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    // --- Yellow SDK / API ---
    YELLOW_API_KEY: zod_1.z.string().min(1, 'YELLOW_API_KEY is required.'),
    YELLOW_ENVIRONMENT: zod_1.z.enum(['mainnet', 'testnet']).default('testnet'),
    // --- CORS / Frontend ---
    CORS_ORIGIN: zod_1.z.string().optional(),
    // --- Node Media Server (Streaming) ---
    NMS_RTMP_URL: zod_1.z.string().url().default('rtmp://localhost:1935/live'),
    NMS_HLS_BASE: zod_1.z.string().url().default('http://localhost:8001'),
    NMS_HLS_TEMPLATE: zod_1.z.string().default('/live/{key}/index.m3u8'),
    // --- Indexer & Metadata ---
    IPFS_GATEWAY: zod_1.z.string().url().optional(),
    INDEXER_BATCH_SIZE: zod_1.z.coerce.number().optional(),
    INDEXER_REORG_DEPTH: zod_1.z.coerce.number().optional(),
    // --- Optional pinning (Pinata) ---
    PINATA_JWT: zod_1.z.string().optional(),
    PIN_ON_METADATA_FETCH: zod_1.z.enum(['true', 'false']).optional(),
});
// Parse and validate the environment variables from `process.env`
const parsedEnv = envSchema.parse(process.env);
// Export a structured, type-safe object that mirrors your original structure for easy access
exports.env = {
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
    ipfsGateway: parsedEnv.IPFS_GATEWAY || 'https://ipfs.io',
    indexer: {
        batchSize: parsedEnv.INDEXER_BATCH_SIZE ?? 5000,
        reorgDepth: parsedEnv.INDEXER_REORG_DEPTH ?? 6,
    },
    pinata: {
        jwt: parsedEnv.PINATA_JWT,
        pinOnMetadataFetch: parsedEnv.PIN_ON_METADATA_FETCH === 'true',
    },
};
//# sourceMappingURL=environment.js.map