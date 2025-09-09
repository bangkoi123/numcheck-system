FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=development
COPY services/aggregator/package*.json ./
RUN npm ci || npm install
COPY services/aggregator/ ./
CMD ["npm","run","dev"]
