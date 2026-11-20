# Multi-stage build for api-gateway
FROM golang:alpine AS builder
ENV GOWORK=off
WORKDIR /build

COPY shared/ ./shared/
COPY api-gateway/ ./api-gateway/

WORKDIR /build/api-gateway
RUN go build -o /app/api-gateway ./cmd/api

# Final minimal production image (~15MB)
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/api-gateway .
EXPOSE 8080
CMD ["./api-gateway"]
