FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build

FROM node:16-alpine
WORKDIR /app

# Устанавливаем зависимости для работы с Postgres
RUN apk add --no-cache postgresql-client bash

# Копируем только необходимые файлы
COPY --from=builder /app/package*.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/postgres/migrations ./dist/postgres/migrations
COPY --from=builder /app/src/postgres/seeds ./dist/postgres/seeds

# Используем bash для лучшей обработки сигналов
CMD ["sh", "-c", "node dist/wait-for-db.js && node dist/index.js"]