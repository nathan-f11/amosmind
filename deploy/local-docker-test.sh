#!/usr/bin/env bash
# 本地预发布 Docker 构建门禁（通过后再上服务器 deploy）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-deploy/.env.prod.local}"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[local-docker-test] 缺少 $ENV_FILE"
  echo "可复制: cp deploy/.env.prod.example deploy/.env.prod.local"
  exit 1
fi

echo "[1/4] pnpm build（源码编译门禁）"
pnpm build

echo "[2/4] compose config 语法检查"
"${COMPOSE[@]}" config --quiet

echo "[3/4] 构建 api + web 镜像（不启动）"
"${COMPOSE[@]}" build

echo "[4/4] 可选：启动全栈并验收"
echo "  ${COMPOSE[*]} up -d"
echo "  curl http://127.0.0.1/api/health"
echo
echo "[local-docker-test] 构建门禁通过"
