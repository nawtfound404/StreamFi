# Start from a clean Node.js 20 Alpine image
FROM node:20-alpine
WORKDIR /usr/src/app
RUN apk add --no-cache openssl
COPY packages/backend/package*.json ./
RUN npm install
COPY packages/backend/src ./src
COPY packages/backend/prisma ./prisma
COPY packages/backend/tsconfig.json ./
RUN mkdir -p src/lib/abi
COPY packages/foundry-contracts/out/Nitrolite.sol/Nitrolite.json ./src/lib/abi/Nitrolite.json
RUN npx prisma generate
RUN npm run build
EXPOSE 8000
CMD [ "node", "-r", "tsconfig-paths/register", "dist/server.js" ]
