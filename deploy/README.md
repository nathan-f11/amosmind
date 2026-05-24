# 腾讯云轻量 VPS 部署指南

AmosMind 预发布采用 **单机 Docker Compose**：Nginx + Web + API + Postgres + Redis + MinIO。

## 1. 安全组（控制台）

| 端口 | 用途 | 是否开放 |
|------|------|----------|
| 22 | SSH | 是 |
| 80 | HTTP（Nginx） | 是 |
| 443 | HTTPS（域名阶段再开） | 可选 |
| 5432 / 6379 / 9000 / 3000 / 3001 | 内网服务 | **否** |

## 2. SSH 登录后安装 Docker

```bash
# Ubuntu 22.04 示例（以官方文档为准）
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录 SSH 后验证
docker --version
docker compose version
```

## 3. 2GB 内存建议配置 Swap

```bash
sudo bash deploy/setup-swap.sh
```

## 4. 部署应用

```bash
git clone <你的仓库地址> amosmind
cd amosmind

cp deploy/.env.prod.example deploy/.env.prod
# 编辑 deploy/.env.prod：替换 YOUR_PUBLIC_IP、密码、MODEL_API_KEY

docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod up -d --build

# 首次：数据库迁移 + seed
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod exec api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod exec api pnpm db:seed:prod
```

浏览器访问：`http://YOUR_PUBLIC_IP`  
API 健康检查：`http://YOUR_PUBLIC_IP/api/health`

## 5. 常用运维命令

```bash
# 查看日志
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod logs -f api

# 重启
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod restart

# 停止
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod down
```

## 6. 后续：域名 + HTTPS

有域名后可将 DNS A 记录指向轻量 IP，把 `CORS_ORIGIN`、`NEXT_PUBLIC_API_URL`、`ASSET_PUBLIC_BASE_URL` 改为 `https://...`，并用 Caddy 或 Certbot 申请证书。

## 7. 验收

```bash
PUBLIC_IP=你的公网IP bash deploy/verify-staging.sh
```
