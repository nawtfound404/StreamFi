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
