# Multi-stage build for product-service
FROM golang:alpine AS builder
ENV GOWORK=off
WORKDIR /build

COPY shared/ ./shared/
COPY services/product-service/ ./services/product-service/

WORKDIR /build/services/product-service
RUN go build -o /app/product-service ./cmd/api

# Final minimal production image (~15MB)
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/product-service .
EXPOSE 8082
CMD ["./product-service"]
