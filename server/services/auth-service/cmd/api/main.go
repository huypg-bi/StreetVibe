package main

import (
	"log"
	"net/http"

	"streetvibe/auth-service/internal/config"
	"streetvibe/auth-service/internal/database"
	"streetvibe/auth-service/internal/handlers"
	"streetvibe/auth-service/internal/middleware"
	"streetvibe/auth-service/internal/repositories"
	"streetvibe/auth-service/internal/services"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	// Connect Database
	db, err := database.ConnectDB(cfg)
	if err != nil {
		log.Printf("Cảnh báo: Chưa kết nối được Database (hãy đảm bảo Docker Postgres đang chạy): %v\n", err)
	}

	// Initialize Layers
	var authHandler *handlers.AuthHandler
	if db != nil {
		userRepo := repositories.NewUserRepository(db)
		authService := services.NewAuthService(userRepo, cfg)
		authHandler = handlers.NewAuthHandler(authService)
	}

	// Router
	r := gin.Default()

	// Health check
	r.GET("/health", func(c *gin.Context) {
		status := "ok"
		if db == nil {
			status = "db_disconnected"
		}
		response.Success(c, http.StatusOK, "Auth Service Health Check", gin.H{
			"status": status,
			"service": "auth-service",
		})
	})

	// Routes
	v1 := r.Group("/api/v1/auth")
	{
		if authHandler != nil {
			v1.POST("/register", authHandler.Register)
			v1.POST("/login", authHandler.Login)
			v1.POST("/refresh", authHandler.Refresh)
			v1.GET("/me", middleware.AuthMiddleware(cfg), authHandler.GetMe)
		}
	}

	log.Printf("Auth Service is running on port :%s\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
