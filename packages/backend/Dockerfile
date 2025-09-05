# Start from a clean Node.js 20 Alpine image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install system dependencies
RUN apk add --no-cache openssl

# Copy package files first to leverage Docker's build cache
# Build context is packages/backend
COPY package*.json ./
RUN npm ci || npm install

# Copy the backend's source code and config
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client and build the TypeScript project
RUN npx prisma generate
RUN npm run build

# Ensure JSON ABI is available at runtime (TS can emit require for JSON)
# ABI is a TS module and will be compiled into dist

# Copy entrypoint to run migrations on startup
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Expose the application port
EXPOSE 8000

# Run migrations and start the app
ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]