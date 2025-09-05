FROM node:18-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

ENV FFMPEG_PATH=/usr/bin/ffmpeg
EXPOSE 1935 8080
CMD ["npm", "start"]
