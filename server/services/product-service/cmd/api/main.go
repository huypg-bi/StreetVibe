package main

import (
	"log"
	"net/http"

	"streetvibe/product-service/internal/config"
	"streetvibe/product-service/internal/database"
	"streetvibe/product-service/internal/handlers"
	"streetvibe/product-service/internal/middleware"
	"streetvibe/product-service/internal/repositories"
	"streetvibe/product-service/internal/services"
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
	var catHandler *handlers.CategoryHandler
	var prodHandler *handlers.ProductHandler

	if db != nil {
		catRepo := repositories.NewCategoryRepository(db)
		prodRepo := repositories.NewProductRepository(db)

		catService := services.NewCategoryService(catRepo)
		prodService := services.NewProductService(prodRepo, catRepo)

		catHandler = handlers.NewCategoryHandler(catService)
		prodHandler = handlers.NewProductHandler(prodService)
	}

	// Router
	r := gin.Default()

	// Health check
	r.GET("/health", func(c *gin.Context) {
		status := "ok"
		if db == nil {
			status = "db_disconnected"
		}
		response.Success(c, http.StatusOK, "Product Service Health Check", gin.H{
			"status":  status,
			"service": "product-service",
		})
	})

	// Routes
	v1 := r.Group("/api/v1")
	{
		// Categories
		catRoutes := v1.Group("/categories")
		{
			if catHandler != nil {
				catRoutes.GET("", catHandler.GetList)
				catRoutes.GET("/:id", catHandler.GetDetail)
				catRoutes.POST("", middleware.AdminMiddleware(cfg), catHandler.Create)
				catRoutes.PUT("/:id", middleware.AdminMiddleware(cfg), catHandler.Update)
				catRoutes.DELETE("/:id", middleware.AdminMiddleware(cfg), catHandler.Delete)
			}
		}

		// Products
		prodRoutes := v1.Group("/products")
		{
			if prodHandler != nil {
				prodRoutes.GET("", prodHandler.GetList)
				prodRoutes.GET("/featured", prodHandler.GetFeatured)
				prodRoutes.GET("/best-seller", prodHandler.GetBestSellers)
				prodRoutes.GET("/:id", prodHandler.GetDetail)
				prodRoutes.POST("", middleware.AdminMiddleware(cfg), prodHandler.Create)
				prodRoutes.PUT("/:id", middleware.AdminMiddleware(cfg), prodHandler.Update)
				prodRoutes.PATCH("/:id/flags", middleware.AdminMiddleware(cfg), prodHandler.PatchFlags)
				prodRoutes.DELETE("/:id", middleware.AdminMiddleware(cfg), prodHandler.Delete)
			}
		}
	}

	log.Printf("Product Service is running on port :%s\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
