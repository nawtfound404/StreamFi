# Start from a clean Node.js 20 Alpine image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install system dependencies
RUN apk add --no-cache openssl

# Copy package files first to leverage Docker's build cache
# Build context is packages/backend
COPY package*.json ./
RUN npm install

# Copy the backend's source code
COPY src ./src
COPY tsconfig.json ./

# ABI is in src/services/abi/Nitrolite.ts, no external copy needed

# Build the TypeScript project
RUN npm run build

# Expose the application port
EXPOSE 8000

# Copy entrypoint and run it (no prisma migrate for Mongo)
COPY docker-entrypoint.sh ./docker-entrypoint.sh
# Normalize line endings to avoid CRLF issues on Alpine, then make executable
RUN sed -i 's/\r$//' ./docker-entrypoint.sh \
	&& chmod +x ./docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]