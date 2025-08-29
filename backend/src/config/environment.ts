import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: process.env.PORT || 8000,
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  blockchain: {
    rpcProvider: process.env.JSON_RPC_PROVIDER,
    contractAddress: process.env.STREAMFI_CONTRACT_ADDRESS,
    adminPrivateKey: process.env.ADMIN_PRIVATE_KEY,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
  },
};
