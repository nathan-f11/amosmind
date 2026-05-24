#!/usr/bin/env bash
# AmosMind 预发布验收脚本（curl 检查）
set -euo pipefail

BASE="${PUBLIC_IP:?请设置 PUBLIC_IP，例如: PUBLIC_IP=1.2.3.4 bash deploy/verify-staging.sh}"
ORIGIN="http://${BASE}"
API="${ORIGIN}/api"

pass=0
fail=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd"; then
    echo "[OK] $name"
    pass=$((pass + 1))
  else
    echo "[FAIL] $name"
    fail=$((fail + 1))
  fi
}

echo "=== AmosMind staging verify ==="
echo "Origin: $ORIGIN"
echo "API:    $API"
echo

check "health" "curl -sf '${API}/health' | grep -q '\"ok\":true'"
check "web_home" "curl -sf -o /dev/null -w '%{http_code}' '${ORIGIN}/' | grep -q '200'"
check "cors_header" "curl -sf -I -H 'Origin: ${ORIGIN}' '${API}/health' | grep -qi 'access-control-allow-origin'"

echo
echo "=== 需人工在浏览器验证 ==="
echo "- 使用 SEED_EMAIL / SEED_PASSWORD 登录"
echo "- 文生图任务 succeeded，图片可打开"
echo "- /projects 列表与缩略图正常"
echo "- /assets/outputs/... 返回 200"
echo

if [ "$fail" -gt 0 ]; then
  echo "自动检查: ${pass} 通过, ${fail} 失败"
  exit 1
fi

echo "自动检查: ${pass} 项全部通过"
