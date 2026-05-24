# 无 Docker 本地启动（macOS + Homebrew）

适用于 `docker: command not found` 或不想装 Docker Desktop 的情况。

## 1. 安装并启动服务

```bash
brew install postgresql@16 redis minio/stable/minio

brew services start postgresql@16
brew services start redis

# MinIO 需单独终端常驻（见下文）
mkdir -p ~/minio-data
minio server ~/minio-data --console-address ":9001"
```

## 2. 创建数据库

```bash
export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
createdb amosmind
```

（Apple Silicon 常见路径为 `/opt/homebrew/opt/postgresql@16/bin`）

## 3. 修改 `apps/api/.env`

Docker 默认：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/amosmind?schema=public"
```

Homebrew PostgreSQL 通常改为（把 `你的用户名` 换成 `whoami` 输出）：

```env
DATABASE_URL="postgresql://你的用户名@localhost:5432/amosmind?schema=public"
```

## 4. 迁移与启动

```bash
cd /Users/iwalking11/AI/amosmind
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## 自检

```bash
redis-cli ping          # PONG
curl http://localhost:3001/health
```
