// Package identity bảo đảm service chỉ tin danh tính lấy từ JWT hợp lệ.
package identity

import (
	"strings"

	"streetvibe/shared/token"

	"github.com/gin-gonic/gin"
)

var headers = []string{"X-User-Id", "X-User-Email", "X-User-Role", "X-User-Name"}

// Middleware chạy trước mọi route: bỏ các header danh tính nhận từ bên ngoài, rồi chỉ gắn lại
// từ JWT hợp lệ. Nhờ đó gọi thẳng vào service cũng không tự nhận được quyền hay mạo danh.
func Middleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		for _, header := range headers {
			c.Request.Header.Del(header)
		}
		if raw, found := strings.CutPrefix(c.GetHeader("Authorization"), "Bearer "); found {
			if claims, err := token.ValidateToken(secret, raw); err == nil {
				c.Request.Header.Set("X-User-Id", claims.UserID)
				c.Request.Header.Set("X-User-Email", claims.Email)
				c.Request.Header.Set("X-User-Role", claims.Role)
			}
		}
		c.Next()
	}
}
