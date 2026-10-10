# Triển khai server multiplayer (apps/server)

Web chạy tĩnh trên Vercel; server Colyseus (WebSocket, giữ phòng trong bộ nhớ) chạy ở nơi có tiến trình sống lâu: Fly.io hoặc Railway.

## Biến môi trường

| Biến | Nơi | Ý nghĩa |
|---|---|---|
| `PORT` | server | Cổng lắng nghe (mặc định 2567; Fly/Railway tự đặt) |
| `CORS_ORIGINS` | server | Origin của frontend được gọi HTTP matchmaking, ngăn cách bằng dấu phẩy. Trống hoặc `*` = mọi origin (chỉ dev) |
| `VITE_SERVER_URL` | web | Địa chỉ server cho client, ví dụ `wss://twentyfour-hour-life-server.fly.dev` |

Mẫu: `apps/server/.env.example`, `apps/web/.env.example`.

## Chạy cục bộ

```bash
npm install
npm run dev:all        # web :3000 + server :2567 song song (concurrently)
```

## Docker

Build từ **gốc repo** (monorepo):

```bash
docker build -f apps/server/Dockerfile -t 24h-server .
docker run --rm -p 8080:8080 -e CORS_ORIGINS=http://localhost:3000 24h-server
curl localhost:8080/health   # {"status":"ok",...}
```

## Fly.io

```bash
fly launch --no-deploy --copy-config --config apps/server/fly.toml --dockerfile apps/server/Dockerfile
fly secrets set CORS_ORIGINS=https://<ten-game>.vercel.app --config apps/server/fly.toml
fly deploy --config apps/server/fly.toml --dockerfile apps/server/Dockerfile
```

Rồi trong Vercel (Project → Settings → Environment Variables) đặt `VITE_SERVER_URL=wss://<app>.fly.dev` và redeploy web.

Lưu ý:
- Phòng nằm trong bộ nhớ của tiến trình nên `fly.toml` chạy **một máy**, không tự tắt. Muốn nhiều máy phải thêm Redis presence/driver của Colyseus.
- Mỗi lần deploy lại, các phòng đang chơi bị đóng (client sẽ phải vào lại bằng mã mới).

## Railway

New Project → Deploy from GitHub repo → Settings: **Dockerfile Path** = `apps/server/Dockerfile`, build context là gốc repo. Đặt `CORS_ORIGINS`; Railway tự đặt `PORT`.
