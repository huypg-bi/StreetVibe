package main

import (
	"log"
	"net/http"
	"strings"

	"streetvibe/api-gateway/internal/config"
	"streetvibe/api-gateway/internal/middleware"
	"streetvibe/api-gateway/internal/proxy"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	// Initialize Proxies for Downstream Services
	authProxy, err := proxy.NewGatewayProxy(cfg.AuthServiceURL)
	if err != nil {
		log.Fatalf("Khởi tạo Auth proxy thất bại: %v", err)
	}

	productProxy, err := proxy.NewGatewayProxy(cfg.ProductServiceURL)
	if err != nil {
		log.Fatalf("Khởi tạo Product proxy thất bại: %v", err)
	}

	customerProxy, err := proxy.NewGatewayProxy(cfg.CustomerServiceURL)
	if err != nil {
		log.Fatalf("Khởi tạo Customer proxy thất bại: %v", err)
	}

	mediaProxy, err := proxy.NewGatewayProxy(cfg.MediaServiceURL)
	if err != nil {
		log.Fatalf("Khởi tạo Media proxy thất bại: %v", err)
	}

	r := gin.Default()

	// 1. CORS Middleware (Cho phép React Frontend gọi API)
	r.Use(middleware.CORSMiddleware())

	// 2. Auth Forwarder Middleware (Tự động giải mã JWT và forward User-Id)
	r.Use(middleware.AuthForwarder(cfg))

	// 3. Health Check
	r.GET("/health", func(c *gin.Context) {
		response.Success(c, http.StatusOK, "API Gateway is running!", gin.H{
			"status":   "ok",
			"services": gin.H{
				"auth_service":     cfg.AuthServiceURL,
				"product_service":  cfg.ProductServiceURL,
				"customer_service": cfg.CustomerServiceURL,
				"media_service":    cfg.MediaServiceURL,
			},
		})
	})

	// 4. Static Uploads Reverse Proxy
	r.Any("/uploads/*filepath", func(c *gin.Context) {
		mediaProxy.Handle(c)
	})

	// 5. API v1 Routing
	v1 := r.Group("/api/v1")
	{
		// Auth Service routes (/api/v1/auth/*)
		v1.Any("/auth/*any", func(c *gin.Context) {
			authProxy.Handle(c)
		})

		// Categories routes (/api/v1/categories/*)
		v1.Any("/categories", func(c *gin.Context) {
			productProxy.Handle(c)
		})
		v1.Any("/categories/*any", func(c *gin.Context) {
			productProxy.Handle(c)
		})

		// Products & Reviews routes
		// If request path has /reviews, forward to Customer Service! Otherwise Product Service
		v1.Any("/products/*any", func(c *gin.Context) {
			if strings.Contains(c.Request.URL.Path, "/reviews") {
				customerProxy.Handle(c)
				return
			}
			productProxy.Handle(c)
		})
		v1.Any("/products", func(c *gin.Context) {
			productProxy.Handle(c)
		})

		// Cart routes (/api/v1/cart/*)
		v1.Any("/cart", func(c *gin.Context) {
			customerProxy.Handle(c)
		})
		v1.Any("/cart/*any", func(c *gin.Context) {
			customerProxy.Handle(c)
		})

		// Wishlist routes (/api/v1/wishlist/*)
		v1.Any("/wishlist", func(c *gin.Context) {
			customerProxy.Handle(c)
		})
		v1.Any("/wishlist/*any", func(c *gin.Context) {
			customerProxy.Handle(c)
		})

		// Media routes (/api/v1/media/*)
		v1.Any("/media/*any", func(c *gin.Context) {
			mediaProxy.Handle(c)
		})
	}

	log.Printf("==================================================")
	log.Printf("🚀 API Gateway đang lắng nghe trên cổng: :%s", cfg.Port)
	log.Printf("👉 Frontend kết nối tại: http://localhost:%s/api/v1", cfg.Port)
	log.Printf("==================================================")

	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("API Gateway không thể khởi chạy: %v", err)
	}
}
