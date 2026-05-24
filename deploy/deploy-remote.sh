#!/usr/bin/env bash
# 生产环境远程部署（拉取 GHCR 镜像，不在 VPS 上 build）
# 用法:
#   bash deploy/deploy-remote.sh [services] [run_migrate]
#   services: all | web | api | web,api
#   run_migrate: true | false（默认 false）
#
# 环境变量:
#   ENV_FILE        默认 deploy/.env.prod
#   IMAGE_REGISTRY  默认 ghcr.io/nathan-f11
#   IMAGE_TAG       默认 latest（回滚时设为历史 commit SHA）
#   GHCR_TOKEN      拉取私有包时必填（GitHub PAT read:packages）
#   GHCR_USER       docker login 用户名，默认 github
#   PUBLIC_IP       设置后部署结束跑 verify-staging.sh
#   GIT_REF         默认 origin/main（仅同步 compose/deploy 配置）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-deploy/.env.prod}"
SERVICES="${1:-all}"
RUN_MIGRATE="${2:-false}"
GIT_REF="${GIT_REF:-origin/main}"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io/nathan-f11}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[deploy-remote] 缺少 $ENV_FILE"
  exit 1
fi

export IMAGE_REGISTRY IMAGE_TAG

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

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "[deploy-remote] docker login ghcr.io"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin
fi

echo "[deploy-remote] git sync (compose/deploy only) → $GIT_REF"
git fetch origin main
git reset --hard "$GIT_REF"

echo "[deploy-remote] pull images tag=$IMAGE_TAG registry=$IMAGE_REGISTRY: $SVC"
echo "[deploy-remote] 提示: 国内 VPS 拉 GHCR 可能较慢，首次 pull 或需 30–60 分钟"
for svc in $SVC; do
  echo "[deploy-remote] $(date '+%H:%M:%S') pulling $svc ..."
  "${COMPOSE[@]}" pull "$svc" --quiet
  echo "[deploy-remote] $(date '+%H:%M:%S') pulled $svc"
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

echo "[deploy-remote] 部署完成 (IMAGE_TAG=$IMAGE_TAG)"
