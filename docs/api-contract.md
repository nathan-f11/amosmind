# API 契约

Base URL: `http://localhost:3001`

## 公开

### `GET /health`

```json
{ "ok": true, "service": "amosmind-api" }
```

### `POST /auth/login`

Body:

```json
{ "email": "dev@amosmind.local", "password": "dev123456" }
```

Response:

```json
{
  "accessToken": "jwt...",
  "user": { "id": "uuid", "email": "...", "creditBalance": 98775 }
}
```

## 需 JWT：`Authorization: Bearer <token>`

### `GET /users/me`

当前用户与积分余额。

### `GET /users/me/credits/ledger`

当前用户积分流水（按时间倒序）。

Query:

- `limit`（可选，默认 20，最大 100）
- `cursor`（可选，上一页最后一条 `id`，用于加载更多）

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "amount": -10,
      "reason": "generation",
      "taskId": "uuid",
      "createdAt": "2026-05-24T09:00:00.000Z",
      "task": {
        "type": "text2img",
        "status": "succeeded",
        "prompt": "a cat in space"
      }
    }
  ],
  "nextCursor": "uuid-or-null"
}
```

`amount` 负数表示扣费；`reason` 当前主要为 `generation`（生成任务扣费）。

### `POST /tasks`

Body:

```json
{
  "type": "text2img",
  "prompt": "a cat in space",
  "style": "free",
  "aspectRatio": "1:1",
  "projectId": "optional-uuid",
  "idempotencyKey": "optional-string"
}
```

`type`: `text2img` | `img2prompt` | `resize`

### `POST /tasks/upload`

`multipart/form-data`:

- `file`: 图片（img2prompt / resize 必填）
- `type`, `aspectRatio`, `style`, `prompt`（可选）

### `GET /tasks/:id`

任务详情（含 status、resultUrl、resultText、error）。

### `GET /tasks?projectId=`

任务列表，最近 50 条。

### `GET /projects` / `POST /projects`

项目管理。POST body: `{ "name": "项目名称" }`

## 错误码

| HTTP | 说明 |
|------|------|
| 401 | 未登录或 token 无效 |
| 402 | 积分不足 `INSUFFICIENT_CREDITS` |
| 400 | 参数校验失败 |
| 404 | 任务不存在 |
