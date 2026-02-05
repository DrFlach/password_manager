# Stage 1: Build
FROM golang:1.21-alpine AS builder


RUN apk add --no-cache git


WORKDIR /build


COPY backend/go.mod ./

RUN go mod download

COPY backend/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o password-manager .

# Stage 2: Production
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /build/password-manager .

COPY frontend/ ./frontend/

EXPOSE 8080

CMD ["./password-manager"]
