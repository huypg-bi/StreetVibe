# Multi-stage build for ai-service
FROM golang:alpine AS builder
ENV GOWORK=off
WORKDIR /build

COPY shared/ ./shared/
COPY services/ai-service/ ./services/ai-service/

WORKDIR /build/services/ai-service
RUN go build -o /app/ai-service ./cmd/api

# Final minimal production image (~15MB)
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/ai-service .
EXPOSE 8085
CMD ["./ai-service"]
