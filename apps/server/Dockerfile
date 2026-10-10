# Build từ GỐC repo (monorepo):  docker build -f apps/server/Dockerfile -t 24h-server .
# Chạy:                           docker run -p 8080:8080 -e PORT=8080 -e CORS_ORIGINS=https://ten-game.vercel.app 24h-server

# ---- build: biên dịch @24h/domain rồi @24h/server (tsc) ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/domain/package.json packages/domain/
COPY packages/protocol/package.json packages/protocol/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci -w @24h/domain -w @24h/protocol -w @24h/server --include-workspace-root
COPY packages/domain packages/domain
COPY packages/protocol packages/protocol
COPY apps/server apps/server
RUN npm run build -w @24h/domain && npm run build -w @24h/protocol && npm run build -w @24h/server

# ---- runtime: chỉ dependency production + dist ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/
COPY packages/protocol/package.json packages/protocol/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev -w @24h/domain -w @24h/protocol -w @24h/server
COPY --from=build /app/packages/domain/dist packages/domain/dist
COPY --from=build /app/packages/protocol/dist packages/protocol/dist
COPY --from=build /app/apps/server/dist apps/server/dist

USER node
EXPOSE 8080
ENV PORT=8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/server/dist/index.js"]
