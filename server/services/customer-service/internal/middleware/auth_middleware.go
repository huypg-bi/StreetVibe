package middleware

import (
	"strings"

	"streetvibe/customer-service/internal/config"
	"streetvibe/shared/response"
	"streetvibe/shared/token"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Check Gateway injected header
		userID := c.GetHeader("X-User-Id")
		if userID != "" {
			c.Set("user_id", userID)
			c.Set("user_name", c.GetHeader("X-User-Name"))
			c.Set("role", c.GetHeader("X-User-Role"))
			c.Next()
			return
		}

		// 2. Fallback to direct Bearer JWT token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Vui lòng đăng nhập để thực hiện chức năng này")
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "Định dạng token không hợp lệ")
			c.Abort()
			return
		}

		claims, err := token.ValidateToken(cfg.JWTSecret, parts[1])
		if err != nil {
			response.Unauthorized(c, "Token không hợp lệ hoặc đã hết hạn")
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_name", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}
