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
    // --- Payments ---
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    // --- Yellow SDK / API ---
    YELLOW_API_KEY: zod_1.z.string().min(1, 'YELLOW_API_KEY is required.'),
    YELLOW_ENVIRONMENT: zod_1.z.enum(['mainnet', 'testnet']).default('testnet'),
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
    },
    stripe: {
        secretKey: parsedEnv.STRIPE_SECRET_KEY,
    },
    yellow: {
        apiKey: parsedEnv.YELLOW_API_KEY,
        environment: parsedEnv.YELLOW_ENVIRONMENT,
    },
};
//# sourceMappingURL=environment.js.map