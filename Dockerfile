FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git docker-cli

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && (npm ci || npm install)

COPY tsconfig.json ./
COPY src ./src
COPY frontend ./frontend

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]


