FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=optional || true
COPY server.js ./
COPY src ./src
EXPOSE 3000
CMD ["node","server.js"]
