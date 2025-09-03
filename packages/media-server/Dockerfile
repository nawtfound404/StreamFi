# --- Stage 1: ffmpeg builder ---
FROM debian:bullseye-slim AS ffmpeg-builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*


# --- Stage 2: Node Media Server ---
FROM node:18-bullseye-slim

# Copy ffmpeg binary + its libraries from builder stage
COPY --from=ffmpeg-builder /usr/bin/ffmpeg /usr/bin/ffmpeg
COPY --from=ffmpeg-builder /usr/lib/x86_64-linux-gnu /usr/lib/x86_64-linux-gnu

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy app code
COPY server.js ./

ENV FFMPEG_PATH=/usr/bin/ffmpeg

EXPOSE 1935 8001

CMD ["npm", "start"]
