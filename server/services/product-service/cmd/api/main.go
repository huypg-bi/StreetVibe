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
	var marketplaceHandler *handlers.MarketplaceHandler

	if db != nil {
		catRepo := repositories.NewCategoryRepository(db)
		prodRepo := repositories.NewProductRepository(db)

		catService := services.NewCategoryService(catRepo)
		prodService := services.NewProductService(prodRepo, catRepo)

		catHandler = handlers.NewCategoryHandler(catService)
		prodHandler = handlers.NewProductHandler(prodService)
		marketplaceHandler = handlers.NewMarketplaceHandler(db, cfg.JWTSecret)
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
				prodRoutes.GET("/brands", prodHandler.GetBrands)
				prodRoutes.GET("/featured", prodHandler.GetFeatured)
				prodRoutes.GET("/best-seller", prodHandler.GetBestSellers)
				prodRoutes.GET("/trending", marketplaceHandler.GetTrending)
				prodRoutes.GET("/:id", prodHandler.GetDetail)
				prodRoutes.POST("", middleware.AdminMiddleware(cfg), prodHandler.Create)
				prodRoutes.PUT("/:id", middleware.AdminMiddleware(cfg), prodHandler.Update)
				prodRoutes.PATCH("/:id/flags", middleware.AdminMiddleware(cfg), prodHandler.PatchFlags)
				prodRoutes.DELETE("/:id", middleware.AdminMiddleware(cfg), prodHandler.Delete)
			}

			// Marketplace / Supplier / Admin foundation
			marketplaceRoutes := v1.Group("/marketplace")
			if marketplaceHandler != nil {
				marketplaceRoutes.GET("/attributes", marketplaceHandler.ListAttributes)
				marketplaceRoutes.POST("/sizes", middleware.AdminMiddleware(cfg), marketplaceHandler.CreateSize)
				marketplaceRoutes.PUT("/sizes/:id", middleware.AdminMiddleware(cfg), marketplaceHandler.UpdateSize)
				marketplaceRoutes.DELETE("/sizes/:id", middleware.AdminMiddleware(cfg), marketplaceHandler.DeleteSize)
				marketplaceRoutes.POST("/colors", middleware.AdminMiddleware(cfg), marketplaceHandler.CreateColor)
				marketplaceRoutes.PUT("/colors/:id", middleware.AdminMiddleware(cfg), marketplaceHandler.UpdateColor)
				marketplaceRoutes.DELETE("/colors/:id", middleware.AdminMiddleware(cfg), marketplaceHandler.DeleteColor)
				marketplaceRoutes.GET("/suppliers", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminListSuppliers)
				marketplaceRoutes.PUT("/suppliers/:id", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminUpdateSupplier)
				marketplaceRoutes.GET("/admin/products", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminListProducts)
				marketplaceRoutes.POST("/admin/products/:id/moderate", middleware.AdminMiddleware(cfg), marketplaceHandler.ModerateProduct)
				marketplaceRoutes.GET("/admin/dashboard", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminDashboard)
				marketplaceRoutes.POST("/admin/payouts", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminCreatePayout)
				marketplaceRoutes.POST("/admin/payouts/:id/paid", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminMarkPayoutPaid)
				marketplaceRoutes.POST("/internal/checkout", marketplaceHandler.InternalReserveCheckout)
				marketplaceRoutes.POST("/internal/cart-add", marketplaceHandler.RecordCartAdd)
				marketplaceRoutes.GET("/admin/vouchers", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminListVouchers)
				marketplaceRoutes.POST("/admin/vouchers", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminCreateVoucher)
				marketplaceRoutes.DELETE("/admin/vouchers/:id", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminDeleteVoucher)
				marketplaceRoutes.GET("/admin/banners", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminListBanners)
				marketplaceRoutes.POST("/admin/banners", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminCreateBanner)
				marketplaceRoutes.DELETE("/admin/banners/:id", middleware.AdminMiddleware(cfg), marketplaceHandler.AdminDeleteBanner)

				marketplaceRoutes.GET("/supplier/profile", marketplaceHandler.GetSupplierProfile)
				marketplaceRoutes.PUT("/supplier/profile", marketplaceHandler.UpdateSupplierProfile)
				marketplaceRoutes.GET("/supplier/products", marketplaceHandler.SupplierListProducts)
				marketplaceRoutes.POST("/supplier/products", marketplaceHandler.CreateSupplierProduct)
				marketplaceRoutes.POST("/supplier/products/:id/variants", marketplaceHandler.CreateProductVariant)
				marketplaceRoutes.GET("/supplier/suborders", marketplaceHandler.SupplierListSubOrders)
				marketplaceRoutes.PUT("/supplier/suborders/:id", marketplaceHandler.UpdateSubOrder)
				marketplaceRoutes.GET("/supplier/finance", marketplaceHandler.SupplierFinance)
			}
		}
	}

	log.Printf("Product Service is running on port :%s\n", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
