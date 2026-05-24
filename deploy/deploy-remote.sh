#!/usr/bin/env bash
# 生产环境远程部署（VPS 本地 docker build，适合国内机器，无需拉 GHCR）
# 用法:
#   bash deploy/deploy-remote.sh [services] [run_migrate]
#   services: all | web | api | web,api
#   run_migrate: true | false（默认 false）
#
# 环境变量:
#   ENV_FILE   默认 deploy/.env.prod
#   GIT_REF    默认 origin/main（回滚: 填 origin/main~1 或 commit SHA）
#   PUBLIC_IP  设置后部署结束跑 verify-staging.sh
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

echo "[deploy-remote] build (使用 Docker 层缓存): $SVC"
for svc in $SVC; do
  echo "[deploy-remote] $(date '+%H:%M:%S') building $svc ..."
  "${COMPOSE[@]}" build "$svc"
  echo "[deploy-remote] $(date '+%H:%M:%S') built $svc"
done

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

echo "[deploy-remote] 部署完成 ($GIT_REF)"
