FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=optional || npm i --omit=optional

# source code
COPY server.js ./server.js
COPY src ./src

EXPOSE 3000
CMD ["node","server.js"]
