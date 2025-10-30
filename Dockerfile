# syntax=docker/dockerfile:1
FROM node:20-slim AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

COPY package.json pnpm-workspace.yaml ./
COPY apps/agent/package.json apps/agent/
COPY apps/ui/package.json apps/ui/
COPY packages/mcp-server/package.json packages/mcp-server/

RUN pnpm install --frozen-lockfile || pnpm install

COPY . .

# Build apps (UI build optional for dev, but we include for production)
RUN pnpm --filter agent-service build && pnpm --filter mcp-server build && pnpm --filter ui build || true

ENV AGENT_PORT=4111 MCP_PORT=4122 UI_PORT=3000 NODE_ENV=production

EXPOSE 3000 4111 4122

CMD sh -c "node apps/agent/dist/index.js & node packages/mcp-server/dist/server.js & next start apps/ui -p $UI_PORT && wait"
