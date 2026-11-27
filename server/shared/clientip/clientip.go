// Package clientip chuyển IP thật của khách từ API Gateway xuống service phía sau.
// Header được ký bằng secret chung nên client không tự khai IP khác để né giới hạn.
package clientip

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net"
	"net/http"
)

const (
	header          = "X-Client-IP"
	signatureHeader = "X-Client-IP-Signature"
)

func sign(secret, ip string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("client-ip:" + ip))
	return hex.EncodeToString(mac.Sum(nil))
}

// remoteHost là IP của kết nối TCP; không dựa vào X-Forwarded-For vì client sửa được.
func remoteHost(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// Set dùng ở Gateway: ghi đè mọi giá trị client tự gửi.
func Set(r *http.Request, secret string) {
	ip := remoteHost(r)
	r.Header.Set(header, ip)
	r.Header.Set(signatureHeader, sign(secret, ip))
}

// From dùng ở service: chỉ tin header có chữ ký đúng, còn lại lấy IP kết nối.
func From(r *http.Request, secret string) string {
	ip := r.Header.Get(header)
	if ip != "" && hmac.Equal([]byte(r.Header.Get(signatureHeader)), []byte(sign(secret, ip))) {
		return ip
	}
	return remoteHost(r)
}
