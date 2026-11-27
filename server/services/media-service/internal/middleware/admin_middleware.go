package middleware

import (
	"strings"

	"streetvibe/media-service/internal/config"
	"streetvibe/shared/response"
	"streetvibe/shared/token"

	"github.com/gin-gonic/gin"
)

func AdminMiddleware(cfg *config.Config) gin.HandlerFunc {
	return requireRoles(cfg, "admin")
}

func UploadMemberMiddleware(cfg *config.Config) gin.HandlerFunc {
	return requireRoles(cfg, "admin", "supplier", "customer")
}

func requireRoles(cfg *config.Config, allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleAllowed := func(role string) bool {
			for _, allowedRole := range allowedRoles {
				if role == allowedRole {
					return true
				}
			}
			return false
		}

		if roleAllowed(c.GetHeader("X-User-Role")) {
			c.Next()
			return
		}

		authenticated := c.GetHeader("X-User-Role") != ""
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				claims, err := token.ValidateToken(cfg.JWTSecret, parts[1])
				if err == nil {
					authenticated = true
					if roleAllowed(claims.Role) {
						c.Set("user_id", claims.UserID)
						c.Set("role", claims.Role)
						c.Next()
						return
					}
				}
			}
		}

		// 401: chưa đăng nhập hoặc token hết hạn; 403: đã đăng nhập nhưng không đủ quyền
		if authenticated {
			response.Forbidden(c, "Bạn không có quyền tải lên hình ảnh")
		} else {
			response.Unauthorized(c, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
		}
		c.Abort()
	}
}
