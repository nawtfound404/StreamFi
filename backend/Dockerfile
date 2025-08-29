FROM node:20-alpine
WORKDIR /usr/src/app

RUN apk add --no-cache openssl
# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy only necessary files for build
COPY prisma ./prisma/
COPY src ./src/
COPY tsconfig.json ./

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

EXPOSE 8000
CMD [ "npm", "start" ]