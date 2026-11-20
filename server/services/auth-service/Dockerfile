# Multi-stage build for auth-service
FROM golang:alpine AS builder
ENV GOWORK=off
WORKDIR /build

COPY shared/ ./shared/
COPY services/auth-service/ ./services/auth-service/

WORKDIR /build/services/auth-service
RUN go build -o /app/auth-service ./cmd/api

# Final minimal production image (~15MB)
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/auth-service .
EXPOSE 8081
CMD ["./auth-service"]
