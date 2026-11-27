package main

import (
	"log"
	"net/http"

	"streetvibe/media-service/internal/config"
	"streetvibe/media-service/internal/handlers"
	"streetvibe/media-service/internal/middleware"
	"streetvibe/shared/identity"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	r := gin.Default()
	// Phải đứng trước mọi route: không tin header danh tính do bên ngoài gửi
	r.Use(identity.Middleware(cfg.JWTSecret))

	// Static file server to serve uploaded images
	r.Static("/uploads", cfg.UploadDir)

	// Health check
	r.GET("/health", func(c *gin.Context) {
		response.Success(c, http.StatusOK, "Media Service Health Check", gin.H{
			"status":  "ok",
			"service": "media-service",
		})
	})

	uploadHandler := handlers.NewUploadHandler(cfg)

	// Upload routes
	v1 := r.Group("/api/v1/media")
	{
		v1.POST("/upload", middleware.UploadMemberMiddleware(cfg), uploadHandler.UploadSingle)
		// Multiple images upload
		v1.POST("/upload-multiple", middleware.AdminMiddleware(cfg), uploadHandler.UploadMultiple)
	}

	log.Printf("Media Service is running on port :%s\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
