// Package internalauth xác thực lời gọi giữa các service bằng token suy ra từ secret chung,
// để secret gốc không phải gửi qua mạng.
package internalauth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
)

const header = "X-Internal-Service-Token"

func token(secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("internal-service-call"))
	return hex.EncodeToString(mac.Sum(nil))
}

// Set gắn token vào yêu cầu gửi đi.
func Set(r *http.Request, secret string) { r.Header.Set(header, token(secret)) }

// Valid kiểm tra yêu cầu đến.
func Valid(r *http.Request, secret string) bool {
	return hmac.Equal([]byte(r.Header.Get(header)), []byte(token(secret)))
}
