# syntax=docker/dockerfile:1
# Agente em contêiner (Linux). Para enxergar o host, rode com:
#   --pid=host --network=host -v /sys:/sys:ro -v /etc/os-release:/etc/os-release:ro
# Mesmo assim, discos e alguns sensores refletem a visão do contêiner. O recomendado é rodar
# o agente direto no sistema (docs/agente.md).
# Build a partir da raiz do repositório:  docker build -f agent/Dockerfile -t stardew-agent .
FROM node:24-alpine
ENV NODE_ENV=production
RUN apk add --no-cache procps tini
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY database/package.json database/
COPY agent/package.json agent/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace agent --include-workspace-root=false --no-audit --no-fund && npm cache clean --force
COPY shared shared
COPY agent agent
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "agent/src/index.js"]
