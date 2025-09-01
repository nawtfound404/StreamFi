# Start from a clean Node.js 20 Alpine image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install system dependencies
RUN apk add --no-cache openssl

# Copy package files first to leverage Docker's build cache
# These paths are relative to the build context (the project root)
COPY packages/backend/package*.json ./
RUN npm install

# Copy the backend's source code
COPY packages/backend/src ./src
COPY packages/backend/prisma ./prisma
COPY packages/backend/tsconfig.json ./

# --- THE DEFINITIVE FIX ---
# Create a new directory for our contract ABIs inside the source code
RUN mkdir -p src/lib/abi
# Copy ONLY the essential Nitrolite.json file from the sibling contracts package
COPY packages/foundry-contracts/out/Nitrolite.sol/Nitrolite.json ./src/lib/abi/Nitrolite.json

# Generate Prisma client and build the TypeScript project
RUN npx prisma generate
RUN npm run build

# Expose the application port
EXPOSE 8000

# The final command to run the application
CMD [ "node", "-r", "tsconfig-paths/register", "dist/server.js" ]