# Multi-stage build for media-service
FROM golang:alpine AS builder
ENV GOWORK=off
WORKDIR /build

COPY shared/ ./shared/
COPY services/media-service/ ./services/media-service/

WORKDIR /build/services/media-service
RUN go build -o /app/media-service ./cmd/api

# Final minimal production image (~15MB)
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/media-service .
RUN mkdir -p /app/uploads
EXPOSE 8084
CMD ["./media-service"]
