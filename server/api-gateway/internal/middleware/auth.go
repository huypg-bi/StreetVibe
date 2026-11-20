package middleware

import (
	"strings"

	"streetvibe/api-gateway/internal/config"
	"streetvibe/shared/token"

	"github.com/gin-gonic/gin"
)

// AuthForwarder decodes JWT if present and injects X-User-Id and X-User-Role headers for downstream services
func AuthForwarder(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
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
