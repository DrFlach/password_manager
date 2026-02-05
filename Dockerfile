# Multi-stage build для оптимизации размера образа

# Stage 1: Build
FROM golang:1.21-alpine AS builder

# Установка необходимых инструментов
RUN apk add --no-cache git

# Рабочая директория
WORKDIR /build

# Копируем go.mod и go.sum (если есть)
COPY backend/go.mod ./

# Скачиваем зависимости
RUN go mod download

# Копируем исходный код backend
COPY backend/ ./

# Собираем приложение
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o password-manager .

# Stage 2: Production
FROM alpine:latest

# Установка CA certificates для HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Копируем скомпилированный бинарник из builder
COPY --from=builder /build/password-manager .

# Копируем frontend файлы
COPY frontend/ ./frontend/

# Expose порт (Render будет использовать переменную окружения PORT)
EXPOSE 8080

# Запуск приложения
CMD ["./password-manager"]
