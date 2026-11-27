package main

import (
	"log"
	"net/http"

	"streetvibe/ai-service/internal/ai"
	"streetvibe/ai-service/internal/config"
	"streetvibe/ai-service/internal/database"
	"streetvibe/ai-service/internal/handlers"
	"streetvibe/ai-service/internal/llm"
	"streetvibe/ai-service/internal/middleware"
	"streetvibe/shared/aiapi"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	// Không có database thì không giới hạn được lượt và ngân sách, nên dừng để Docker khởi động lại
	db, err := database.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("Không kết nối được database: %v", err)
	}

	service := ai.NewService(db, cfg.GroqModel)
	stylist := llm.NewStylist(cfg.GroqAPIKey)
	outfitHandler := handlers.NewOutfitHandler(stylist, service, cfg.JWTSecret)
	adminHandler := handlers.NewAIAdminHandler(service, stylist)

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		response.Success(c, http.StatusOK, "AI Service Health Check", gin.H{
			"status":  "ok",
			"service": "ai-service",
		})
	})

	// Công khai, đi qua API Gateway
	v1 := r.Group("/api/v1")
	{
		v1.GET("/outfits/quota", outfitHandler.Quota)
		v1.POST("/outfits/feedback", outfitHandler.Feedback)

		admin := v1.Group("/ai/admin", middleware.AdminTokenMiddleware(cfg))
		admin.GET("/overview", adminHandler.Overview)
		admin.PUT("/settings", adminHandler.UpdateSettings)
		admin.GET("/prompts", adminHandler.ListPrompts)
		admin.POST("/prompts", adminHandler.CreatePrompt)
		admin.PUT("/prompts/:id/activate", adminHandler.ActivatePrompt)
		admin.GET("/traces", adminHandler.ListTraces)
		admin.GET("/traces/:id", adminHandler.GetTrace)
		admin.POST("/quota/reset", adminHandler.ResetQuota)
	}

	// Nội bộ giữa các service; Gateway không chuyển tiếp đường dẫn này
	internal := r.Group("", middleware.InternalTokenMiddleware(cfg))
	internal.POST(aiapi.OutfitCheckPath, outfitHandler.Check)
	internal.POST(aiapi.OutfitChoosePath, outfitHandler.Choose)

	log.Printf("AI Service is running on port :%s\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
