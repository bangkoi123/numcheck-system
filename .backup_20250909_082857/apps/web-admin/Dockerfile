FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=development

# install deps untuk service ini
COPY package.json package-lock.json* pnpm-lock.yaml* .npmrc* ./ 2>/dev/null || true
COPY apps/web-admin/package*.json ./ 2>/dev/null || true
RUN \
  if [ -f package-lock.json ] || [ -f apps/web-admin/package-lock.json ]; then \
    npm ci || npm install; \
  else \
    npm install; \
  fi

# sumber aplikasi
COPY apps/web-admin/ ./

EXPOSE 3002
CMD ["npm","run","dev"]
