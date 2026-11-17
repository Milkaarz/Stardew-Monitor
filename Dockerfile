# syntax=docker/dockerfile:1
# Servidor central do Stardew Monitor (API + painel).
# Observação: dentro de um contêiner, o "monitor local" enxerga o contêiner/host do Docker.
# Para monitorar o seu PC, rode o agente nele (docs/agente.md).

# ---------- build da interface ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY database/package.json database/
COPY agent/package.json agent/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --no-audit --no-fund
COPY shared shared
COPY frontend frontend
RUN npm run build

# ---------- imagem final ----------
FROM node:24-alpine AS runtime
# HOST=0.0.0.0 é necessário DENTRO do contêiner; o docker-compose publica a porta só em 127.0.0.1
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    DATA_DIR=/app/data
# procps: "ps" completo (lista de processos do systeminformation)
RUN apk add --no-cache procps tini
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY database/package.json database/
COPY agent/package.json agent/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY shared shared
COPY database database
COPY agent agent
COPY backend backend
COPY --from=build /app/frontend/dist frontend/dist
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/src/index.js"]
