FROM node:22-alpine

WORKDIR /app

# Build deps
RUN apk add --no-cache python3 make g++ curl

# Install deps
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build
COPY . .
RUN pnpm build

# Copy POS UI (built separately by BevOne deployment)
COPY static/ ./static/

HEALTHCHECK --interval=30s --timeout=10s CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

CMD ["node", "dist/server/index.js"]
