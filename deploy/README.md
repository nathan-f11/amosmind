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

## 8. CI / CD（GitHub Actions）

### CI（自动）

推送或 PR 到 `main` 时触发 [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)，通过 `dorny/paths-filter` **自动识别**变更范围：

| 变更路径 | 触发的 Job |
|----------|------------|
| `apps/web/**` | CI Web（build + lint） |
| `apps/api/**` | CI API（prisma generate + build） |
| `packages/shared/**` | Web + API 都跑 |
| `pnpm-lock.yaml`、Dockerfile、workflow 等 | + CI Infra（compose config） |

仅改 `docs/**` 时 job 会 skip，workflow 仍视为通过。

**说明**：生产镜像在 **VPS 本地 `docker build`**（Dockerfile 已配置 npmmirror 国内源），不从 GHCR 拉取，避免跨境下载过慢。

### CD（手动）

GitHub → **Actions** → **Deploy Production** → **Run workflow**

| 参数 | 说明 |
|------|------|
| `services` | `all` / `web` / `api` / `web,api` |
| `git_ref` | 默认 `origin/main`；回滚填旧 **commit SHA** |
| `run_migrate` | 是否在部署后执行 `prisma migrate deploy` |

部署流程：`git sync` → `docker compose build`（带层缓存）→ `up -d`。首次或全量构建可能需 **20–40 分钟**（2GB 轻量机），SSH 超时 90 分钟。

### Repository Secrets（CD 必填）

| Secret | 示例 |
|--------|------|
| `DEPLOY_HOST` | 公网 IP |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | SSH 私钥 |
| `DEPLOY_PATH` | `/root/amosmind` |
| `DEPLOY_PUBLIC_IP` | 公网 IP（可选，跑验收脚本） |

`.env.prod` 只保留在服务器，**不要**提交到 Git。

### 回滚

**Deploy Production** → `git_ref` 填要回退的 commit SHA（如 `a1b2c3d4e5f6...`）→ Run workflow（会在 VPS 上 checkout 该版本并重新 build）。

### 服务器手动部署（与 CD 相同脚本）

```bash
cd /root/amosmind
git pull origin main
PUBLIC_IP=你的IP bash deploy/deploy-remote.sh all false
# 回滚: GIT_REF=<旧commit SHA> bash deploy/deploy-remote.sh all false
# 有 schema 变更: bash deploy/deploy-remote.sh all true
```

### Branch Protection 建议

`main` 分支启用：**Require status checks to pass** → 勾选 `CI Web` / `CI API`（或整个 CI workflow）。
