FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=optional || npm i --omit=optional
COPY server.js ./server.js
EXPOSE 3000
CMD ["node","server.js"]
