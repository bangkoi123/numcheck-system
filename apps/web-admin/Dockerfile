FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=development
COPY apps/web-admin/package*.json ./
RUN npm ci || npm install
COPY apps/web-admin/ ./
EXPOSE 3002
CMD ["npm","run","dev"]
