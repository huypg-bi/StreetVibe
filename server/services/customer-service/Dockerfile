# Multi-stage build for customer-service
FROM golang:alpine AS builder
ENV GOWORK=off
WORKDIR /build

COPY shared/ ./shared/
COPY services/customer-service/ ./services/customer-service/

WORKDIR /build/services/customer-service
RUN go build -o /app/customer-service ./cmd/api

# Final minimal production image (~15MB)
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/customer-service .
EXPOSE 8083
CMD ["./customer-service"]
