package middleware

import (
	"strings"

	"streetvibe/ai-service/internal/config"
	"streetvibe/shared/response"
	"streetvibe/shared/token"

	"github.com/gin-gonic/gin"
)

// AdminTokenMiddleware chỉ tin JWT của Admin, không tin header X-User-Role.
// Dùng cho trang Quản lý AI vì cổng của service có thể được gọi thẳng, bỏ qua Gateway.
func AdminTokenMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, found := strings.CutPrefix(c.GetHeader("Authorization"), "Bearer ")
		if !found {
			response.Unauthorized(c, "Vui lòng đăng nhập bằng tài khoản Admin")
			c.Abort()
			return
		}
		claims, err := token.ValidateToken(cfg.JWTSecret, raw)
		if err != nil {
			response.Unauthorized(c, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
			c.Abort()
			return
		}
		if claims.Role != "admin" {
			response.Forbidden(c, "Chỉ dành cho Admin")
			c.Abort()
			return
		}
		c.Set("email", claims.Email)
		c.Next()
	}
}
