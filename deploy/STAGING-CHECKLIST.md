# 预发布验收清单

部署到腾讯云轻量后，按顺序执行。

## 代码验证（本地已完成）

| 检查项 | 命令 | 结果 |
|--------|------|------|
| 全量构建 | `pnpm build` | API + Web 构建通过 |
| Compose 语法 | `docker compose -f docker-compose.prod.yml config` | 配置有效 |
| Linter | auth / login 相关组件 | 无错误 |

## 服务器自动检查

```bash
PUBLIC_IP=你的公网IP bash deploy/verify-staging.sh
```

| # | 检查 | 预期 |
|---|------|------|
| 1 | `GET /api/health` | `{"ok":true}` |
| 2 | Web 首页 | HTTP 200 |
| 3 | CORS | `Access-Control-Allow-Origin` 含你的 origin |

## 浏览器人工验收

| # | 操作 | 预期 |
|---|------|------|
| 1 | 打开 `http://公网IP` | 显示登录页（非自动登录） |
| 2 | 用 `SEED_EMAIL` / `SEED_PASSWORD` 登录 | 积分显示，可进入首页 |
| 3 | 文生图 | 任务 succeeded，图片可打开 |
| 4 | 图片 URL | `http://公网IP/api/assets/outputs/xxx.png` 返回 200 |
| 5 | `/projects` | 列表与缩略图正常 |
| 6 | 反推 / 改比例 | upload + 任务成功 |

## 回归建议

- [ ] 刷新页面后 JWT 仍有效
- [ ] 登出后需重新登录（若已实现登出按钮）
- [ ] 错误密码登录失败提示清晰
