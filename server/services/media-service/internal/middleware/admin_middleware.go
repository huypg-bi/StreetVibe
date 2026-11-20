package middleware

import (
	"strings"

	"streetvibe/media-service/internal/config"
	"streetvibe/shared/response"
	"streetvibe/shared/token"

	"github.com/gin-gonic/gin"
)

func AdminMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Gateway header
		if c.GetHeader("X-User-Role") == "admin" {
			c.Next()
			return
		}

		// 2. Direct Bearer token
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				claims, err := token.ValidateToken(cfg.JWTSecret, parts[1])
				if err == nil && claims.Role == "admin" {
					c.Set("user_id", claims.UserID)
					c.Set("role", claims.Role)
					c.Next()
					return
				}
			}
		}

		response.Forbidden(c, "Chỉ tài khoản Admin mới có quyền tải lên hình ảnh")
		c.Abort()
	}
}
