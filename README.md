# AmosMind — 全栈学习项目

复刻 AmosMind Beta 0.1：文生图、反推提示词、图片改比例、积分与异步任务队列。

## 技术栈

- **Web**: Next.js 15 + Tailwind CSS 4
- **API**: NestJS 11 + Prisma + PostgreSQL
- **队列**: BullMQ + Redis
- **存储**: MinIO (S3 兼容)
- **模型**: `mock`（默认）| `siliconflow` | `dashscope`

## 快速开始

### 1. 启动基础设施

```bash
cd /Users/iwalking11/AI/amosmind
docker compose up -d
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 数据库

```bash
cp .env.example apps/api/.env   # 若尚未有 apps/api/.env
pnpm db:migrate
pnpm db:seed
```

### 4. 启动开发服务

```bash
pnpm dev
```

- 前端: http://localhost:3000
- API: http://localhost:3001
- 健康检查: http://localhost:3001/health
- MinIO 控制台: http://localhost:9001（minioadmin / minioadmin）

### 默认账号

- 邮箱: `dev@amosmind.local`
- 密码: `dev123456`
- 积分: `98775`（种子数据）

前端会自动尝试 dev 登录。

## 环境变量

见 [.env.example](.env.example)。国内 API 示例：

```env
MODEL_PROVIDER=siliconflow
MODEL_API_KEY=你的密钥
```

## 项目结构

```text
apps/api     NestJS 后端
apps/web     Next.js 前端
packages/shared  任务状态枚举
docs/        架构与学习清单
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 并行启动 API + Web（也可用 `pnpm dev:api` / `pnpm dev:web` 分开启动） |
| `pnpm db:migrate` | Prisma 迁移 |
| `pnpm db:seed` | 种子用户 |
| `pnpm db:studio` | Prisma Studio |

## 学习路径

阅读 [docs/learning-checklist.md](docs/learning-checklist.md) 并按章节实践。
