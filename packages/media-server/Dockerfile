FROM node:18-bullseye

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

ENV FFMPEG_PATH=/usr/bin/ffmpeg
EXPOSE 1935 8001
CMD ["npm", "start"]
