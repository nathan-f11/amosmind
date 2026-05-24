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

# 首次需先在 GitHub Actions 跑通 Build Images，或本地 build 后 push 到 GHCR
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod pull
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod up -d

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

## 8. CI / CD（GitHub Actions）

### CI（自动）

推送或 PR 到 `main` 时触发 [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)，通过 `dorny/paths-filter` **自动识别**变更范围：

| 变更路径 | 触发的 Job |
|----------|------------|
| `apps/web/**` | CI Web（build + lint） |
| `apps/api/**` | CI API（prisma generate + build） |
| `packages/shared/**` | Web + API 都跑 |
| `pnpm-lock.yaml`、Dockerfile、workflow 等 | Web + API + CI Infra（compose config） |

仅改 `docs/**` 时构建 job 会 skip，workflow 仍视为通过。

### Build Images（push main 自动）

[`.github/workflows/build-images.yml`](../.github/workflows/build-images.yml) 在 **push `main`** 时构建并推送镜像到 GHCR：

| 镜像 | 标签 |
|------|------|
| `ghcr.io/nathan-f11/amosmind-api` | `${{ github.sha }}`、`latest` |
| `ghcr.io/nathan-f11/amosmind-web` | `${{ github.sha }}`、`latest` |

Web 镜像构建时的 `NEXT_PUBLIC_API_URL` 优先级：

1. Repository **Variable** `NEXT_PUBLIC_API_URL`（推荐 `http://你的公网IP/api`）
2. 否则 Secret `DEPLOY_PUBLIC_IP` → `http://<IP>/api`
3. 否则 `http://localhost/api`

首次 push 后，在 GitHub **Packages** 中将对应包设为 **Public**，或在 VPS 配置 `GHCR_READ_TOKEN` 拉取私有包。

### CD（手动，只拉镜像不编译）

GitHub → **Actions** → **Deploy Production** → **Run workflow**

| 参数 | 说明 |
|------|------|
| `services` | `all` / `web` / `api` / `web,api` |
| `image_tag` | `latest` 或某次构建的 **commit SHA**（回滚时填旧 SHA） |
| `run_migrate` | 是否在部署后执行 `prisma migrate deploy` |

部署流程：`git sync`（仅更新 compose/deploy）→ `docker compose pull` → `up -d`（通常在数分钟内完成）。

### Repository Secrets（CD）

| Secret | 必填 | 说明 |
|--------|------|------|
| `DEPLOY_HOST` | 是 | VPS 公网 IP |
| `DEPLOY_USER` | 是 | SSH 用户（如 `root`） |
| `DEPLOY_SSH_KEY` | 是 | SSH 私钥 |
| `DEPLOY_PATH` | 是 | 仓库路径（如 `/root/amosmind`） |
| `DEPLOY_PUBLIC_IP` | 否 | 部署后跑验收脚本 |
| `GHCR_READ_TOKEN` | 私有包时 | PAT，`read:packages`，用于 VPS `docker pull` |

服务器 `deploy/.env.prod` 需包含（见 `.env.prod.example`）：

```bash
IMAGE_REGISTRY=ghcr.io/nathan-f11
IMAGE_TAG=latest   # 手动部署时可 export IMAGE_TAG=<sha>
```

`.env.prod` 只保留在服务器，**不要**提交到 Git。

### 回滚

1. 在 GitHub **Actions → Build Images** 历史 run 中找到要回退的 commit SHA。
2. **Deploy Production** → `image_tag` 填该 SHA → Run workflow。

### 服务器手动部署（与 CD 相同脚本）

```bash
cd /root/amosmind
export IMAGE_TAG=latest          # 或指定 SHA 回滚
export GHCR_TOKEN=ghp_xxx        # 私有包时
git pull origin main
PUBLIC_IP=你的IP bash deploy/deploy-remote.sh all false
# 有 schema 变更: bash deploy/deploy-remote.sh all true
# 只部署 web: IMAGE_TAG=abc1234 bash deploy/deploy-remote.sh web false
```

### Branch Protection 建议

`main` 分支启用：**Require status checks to pass** → 勾选 `CI Web` / `CI API`（或整个 CI workflow）。
