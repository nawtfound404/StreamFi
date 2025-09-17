# ------------------------
# Stage 1: Build
# ------------------------
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install system dependencies needed for build
RUN apk add --no-cache openssl curl

# Install all dependencies (including dev) for build
COPY package*.json ./
RUN npm install

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ------------------------
# Stage 2: Runtime
# ------------------------
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

# Install system dependencies needed at runtime
RUN apk add --no-cache openssl curl

# Install only production deps
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled app from builder
COPY --from=builder /usr/src/app/dist ./dist

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh \
    && chmod +x ./docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
