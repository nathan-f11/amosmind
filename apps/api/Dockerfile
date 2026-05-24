FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm config set registry https://registry.npmmirror.com \
  && corepack enable \
  && corepack prepare pnpm@9.14.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @amosmind/api --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npx prisma generate
# deps 阶段用了 --ignore-scripts，需在此编译 bcrypt 等原生模块
RUN apk add --no-cache python3 make g++
WORKDIR /app
RUN pnpm rebuild bcrypt --filter @amosmind/api
WORKDIR /app/apps/api
RUN pnpm build
RUN npx tsc prisma/seed.ts --module commonjs --esModuleInterop --target ES2022 --skipLibCheck --outDir prisma

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/api

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/api/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/main.js"]
