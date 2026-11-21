package middleware

import (
	"strings"

	"streetvibe/auth-service/internal/config"
	"streetvibe/shared/response"
	"streetvibe/shared/token"

	"github.com/gin-gonic/gin"
)

// AdminMiddleware checks either Gateway-forwarded header X-User-Role or parses direct Authorization header
func AdminMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Check Gateway injected header
		roleHeader := c.GetHeader("X-User-Role")
		if roleHeader == "admin" {
			c.Next()
			return
		}

		// 2. Check context role (if AuthMiddleware was executed prior)
		if c.GetString("role") == "admin" {
			c.Next()
			return
		}

		// 3. Check direct JWT token in Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				claims, err := token.ValidateToken(cfg.JWTSecret, parts[1])
				if err == nil && claims.Role == "admin" {
					c.Set("user_id", claims.UserID)
					c.Set("email", claims.Email)
					c.Set("role", claims.Role)
					c.Next()
					return
				}
			}
		}

		response.Forbidden(c, "Bạn không có quyền thực hiện hành động này (chỉ dành cho Admin)")
		c.Abort()
	}
}
