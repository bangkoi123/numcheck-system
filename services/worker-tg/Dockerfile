FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=development
COPY services/worker-tg/package*.json ./
RUN npm ci || npm install
COPY services/worker-tg/ ./
CMD ["npm","run","dev"]
