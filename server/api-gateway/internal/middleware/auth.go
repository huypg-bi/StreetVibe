package middleware

import (
	"strings"

	"streetvibe/api-gateway/internal/config"
	"streetvibe/shared/clientip"
	"streetvibe/shared/token"

	"github.com/gin-gonic/gin"
)

// AuthForwarder decodes JWT if present and injects X-User-Id and X-User-Role headers for downstream services
func AuthForwarder(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Xóa header định danh do client tự gửi để không giả mạo được người dùng hay quyền
		for _, header := range []string{"X-User-Id", "X-User-Email", "X-User-Role"} {
			c.Request.Header.Del(header)
		}

		// IP thật của khách, có chữ ký để service phía sau tin được
		clientip.Set(c.Request, cfg.JWTSecret)

		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				claims, err := token.ValidateToken(cfg.JWTSecret, parts[1])
				if err == nil {
					// Inject user identity headers for downstream microservices
					c.Request.Header.Set("X-User-Id", claims.UserID)
					c.Request.Header.Set("X-User-Email", claims.Email)
					c.Request.Header.Set("X-User-Role", claims.Role)
				}
			}
		}
		c.Next()
	}
}
