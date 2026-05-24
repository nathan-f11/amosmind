FROM node:20-alpine AS base
# 国内 VPS 构建时 Alpine 官方源极慢，改用阿里云镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
  && apk add --no-cache libc6-compat
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
