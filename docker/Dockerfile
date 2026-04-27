FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

COPY package*.json ./
COPY native/ native/
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY prisma/ prisma/
RUN npx prisma generate

COPY src/ src/
RUN npm run build

# ─── Production image ────────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache chromium

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/main"]
