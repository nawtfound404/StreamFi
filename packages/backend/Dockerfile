# Start from a clean Node.js 20 Alpine image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install system dependencies
RUN apk add --no-cache openssl curl

# Copy package files first to leverage Docker's build cache
# Build context is packages/backend
COPY package*.json ./
# Remove any residual prisma artifacts before installing
RUN rm -rf prisma && npm install && npm prune --production=false && npm cache clean --force

COPY src ./src
COPY tsconfig.json ./
# Double ensure prisma not copied back in (in case of stale host dir)
RUN rm -rf prisma src/lib/prisma.ts || true

# ABI is in src/services/abi/Nitrolite.ts, no external copy needed

# Build the TypeScript project
RUN npm run build \
	&& rm -f dist/lib/prisma.js dist/lib/prisma.js.map || true

# Expose the application port
EXPOSE 8000

# Copy entrypoint and run it (no prisma migrate for Mongo)
COPY docker-entrypoint.sh ./docker-entrypoint.sh
# Normalize line endings to avoid CRLF issues on Alpine, then make executable
RUN sed -i 's/\r$//' ./docker-entrypoint.sh \
	&& chmod +x ./docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]