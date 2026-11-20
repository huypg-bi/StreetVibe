package middleware

import (
	"strings"

	"streetvibe/auth-service/internal/config"
	"streetvibe/shared/response"
	"streetvibe/shared/token"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Thiếu header Authorization")
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "Định dạng token phải là Bearer <token>")
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
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}
