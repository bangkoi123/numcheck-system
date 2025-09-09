FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=development

COPY package.json package-lock.json* pnpm-lock.yaml* .npmrc* ./ 2>/dev/null || true
COPY services/aggregator/package*.json ./ 2>/dev/null || true
RUN \
  if [ -f package-lock.json ] || [ -f services/aggregator/package-lock.json ]; then \
    npm ci || npm install; \
  else \
    npm install; \
  fi

COPY services/aggregator/ ./

CMD ["npm","run","dev"]
