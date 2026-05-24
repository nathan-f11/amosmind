#!/usr/bin/env bash
# 生产环境远程部署脚本（GitHub Actions CD 与服务器手动执行共用）
# 用法:
#   bash deploy/deploy-remote.sh [services] [run_migrate]
#   services: all | web | api | web,api
#   run_migrate: true | false（默认 false）
#
# 环境变量:
#   ENV_FILE   默认 deploy/.env.prod
#   PUBLIC_IP  设置后部署结束跑 verify-staging.sh
#   GIT_REF    默认 origin/main
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-deploy/.env.prod}"
SERVICES="${1:-all}"
RUN_MIGRATE="${2:-false}"
GIT_REF="${GIT_REF:-origin/main}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[deploy-remote] 缺少 $ENV_FILE"
  exit 1
fi

COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")

resolve_services() {
  case "$1" in
    all) echo "web api" ;;
    web) echo "web" ;;
    api) echo "api" ;;
    web,api | api,web) echo "web api" ;;
    *)
      echo "[deploy-remote] 未知 services: $1（可选: all | web | api | web,api）"
      exit 1
      ;;
  esac
}

SVC="$(resolve_services "$SERVICES")"

echo "[deploy-remote] git sync → $GIT_REF"
git fetch origin main
git reset --hard "$GIT_REF"

echo "[deploy-remote] build: $SVC"
# shellcheck disable=SC2086
"${COMPOSE[@]}" build --no-cache $SVC

echo "[deploy-remote] up --force-recreate: $SVC"
# shellcheck disable=SC2086
"${COMPOSE[@]}" up -d --force-recreate $SVC

if [[ "$RUN_MIGRATE" == "true" ]]; then
  echo "[deploy-remote] prisma migrate deploy"
  "${COMPOSE[@]}" exec -T api npx prisma migrate deploy
fi

if [[ -n "${PUBLIC_IP:-}" ]]; then
  echo "[deploy-remote] verify staging"
  PUBLIC_IP="$PUBLIC_IP" bash deploy/verify-staging.sh
fi

echo "[deploy-remote] 部署完成"
