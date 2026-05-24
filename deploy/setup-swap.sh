#!/usr/bin/env bash
# 为 2GB 轻量服务器添加 2GB swap，降低 OOM 风险
set -euo pipefail

SWAP_FILE=/swapfile
SWAP_SIZE=${SWAP_SIZE:-2G}

if swapon --show | grep -q "$SWAP_FILE"; then
  echo "[swap] 已存在 $SWAP_FILE"
  swapon --show
  exit 0
fi

echo "[swap] 创建 $SWAP_SIZE swap at $SWAP_FILE"
sudo fallocate -l "$SWAP_SIZE" "$SWAP_FILE" || sudo dd if=/dev/zero of="$SWAP_FILE" bs=1M count=2048 status=progress
sudo chmod 600 "$SWAP_FILE"
sudo mkswap "$SWAP_FILE"
sudo swapon "$SWAP_FILE"

if ! grep -q "$SWAP_FILE" /etc/fstab; then
  echo "$SWAP_FILE none swap sw 0 0" | sudo tee -a /etc/fstab
fi

echo "[swap] 完成"
free -h
