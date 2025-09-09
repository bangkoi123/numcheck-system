FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=development

COPY package.json package-lock.json* pnpm-lock.yaml* .npmrc* ./ 2>/dev/null || true
COPY services/worker-tg/package*.json ./ 2>/dev/null || true
RUN \
  if [ -f package-lock.json ] || [ -f services/worker-tg/package-lock.json ]; then \
    npm ci || npm install; \
  else \
    npm install; \
  fi

COPY services/worker-tg/ ./

# Worker tidak perlu expose port
CMD ["npm","run","dev"]
