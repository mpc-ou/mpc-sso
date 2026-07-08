# syntax=docker/dockerfile:1

# ---- Builder: full install + build of both backend and web-ui ----
FROM node:22-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# Placeholder so `prisma generate` can parse the schema — it never connects to a real DB at build time.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/mpc_sso"

# Install deps first (cached layer, only re-runs when lockfile/package.json change).
# prisma/schema.prisma must be present before `pnpm install` because the postinstall
# hook runs `prisma generate`, which fails if the schema file isn't there yet.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web-ui/package.json ./web-ui/package.json
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma:generate
RUN pnpm --dir web-ui build
RUN pnpm build

# ---- Runtime: same base image as builder to avoid native-binding (argon2) ABI mismatches ----
FROM node:22-slim AS runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/web-ui/dist ./web-ui/dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/main.js"]
