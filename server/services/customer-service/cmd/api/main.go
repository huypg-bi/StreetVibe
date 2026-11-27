package main

import (
	"log"
	"net/http"

	"streetvibe/customer-service/internal/config"
	"streetvibe/customer-service/internal/database"
	"streetvibe/customer-service/internal/handlers"
	"streetvibe/customer-service/internal/middleware"
	"streetvibe/customer-service/internal/repositories"
	"streetvibe/customer-service/internal/services"
	"streetvibe/shared/identity"
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
	var cartHandler *handlers.CartHandler
	var wishlistHandler *handlers.WishlistHandler
	var reviewHandler *handlers.ReviewHandler
	var orderHandler *handlers.OrderHandler

	if db != nil {
		cartRepo := repositories.NewCartRepository(db)
		wishlistRepo := repositories.NewWishlistRepository(db)
		reviewRepo := repositories.NewReviewRepository(db)

		cartService := services.NewCartService(cartRepo)
		wishlistService := services.NewWishlistService(wishlistRepo)
		reviewService := services.NewReviewService(reviewRepo)

		cartHandler = handlers.NewCartHandler(cartService, cfg.ProductServiceURL, cfg.InternalServiceToken)
		wishlistHandler = handlers.NewWishlistHandler(wishlistService)
		reviewHandler = handlers.NewReviewHandler(reviewService)
		orderHandler = handlers.NewOrderHandler(db, cfg.ProductServiceURL, cfg.InternalServiceToken)
	}

	// Router
	r := gin.Default()
	// Phải đứng trước mọi route: không tin header danh tính do bên ngoài gửi
	r.Use(identity.Middleware(cfg.JWTSecret))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		status := "ok"
		if db == nil {
			status = "db_disconnected"
		}
		response.Success(c, http.StatusOK, "Customer Service Health Check", gin.H{
			"status":  status,
			"service": "customer-service",
		})
	})

	// Routes
	v1 := r.Group("/api/v1")
	{
		// Cart routes (Requires Auth)
		cartGroup := v1.Group("/cart", middleware.AuthMiddleware(cfg))
		{
			if cartHandler != nil {
				cartGroup.GET("", cartHandler.GetCart)
				cartGroup.POST("/items", cartHandler.AddItem)
				cartGroup.PUT("/items/:itemId", cartHandler.UpdateQuantity)
				cartGroup.DELETE("/items/:itemId", cartHandler.RemoveItem)
			}
		}

		// Wishlist routes (Requires Auth)
		wishlistGroup := v1.Group("/wishlist", middleware.AuthMiddleware(cfg))
		{
			if wishlistHandler != nil {
				wishlistGroup.GET("", wishlistHandler.GetWishlist)
				wishlistGroup.POST("/items", wishlistHandler.AddItem)
				wishlistGroup.DELETE("/items/:productId", wishlistHandler.RemoveItem)
			}
		}

		// Reviews routes
		reviewsGroup := v1.Group("/products/:id/reviews")
		{
			if reviewHandler != nil {
				reviewsGroup.GET("", reviewHandler.GetProductReviews)
				reviewsGroup.POST("", middleware.AuthMiddleware(cfg), reviewHandler.AddOrUpdateReview)
			}

			orderGroup := v1.Group("/orders")
			orderGroup.Use(middleware.AuthMiddleware(cfg))
			if orderHandler != nil {
				orderGroup.POST("/checkout", orderHandler.Checkout)
				orderGroup.GET("/my", orderHandler.GetMyOrders)
				orderGroup.GET("/admin", orderHandler.AdminListOrders)
				orderGroup.PUT("/admin/:id", orderHandler.AdminUpdateOrder)
			}
		}
	}

	log.Printf("Customer Service is running on port :%s\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
