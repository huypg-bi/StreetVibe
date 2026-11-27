package middleware

import (
	"streetvibe/ai-service/internal/config"
	"streetvibe/shared/internalauth"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

// InternalTokenMiddleware chỉ cho service khác trong hệ thống gọi vào.
func InternalTokenMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !internalauth.Valid(c.Request, cfg.JWTSecret) {
			response.Forbidden(c, "Yêu cầu nội bộ không hợp lệ")
			c.Abort()
			return
		}
		c.Next()
	}
}
