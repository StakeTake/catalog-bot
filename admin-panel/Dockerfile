# admin-panel/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Копируем файлы с зависимостями
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Собираем проект Next.js
RUN npm run build

# Открываем порт 3000 для сервера Next.js
EXPOSE 3000

# Запускаем сервер Next.js
CMD ["npm", "start"]

