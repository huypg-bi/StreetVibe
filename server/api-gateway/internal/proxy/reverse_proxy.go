package proxy

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
)

type GatewayProxy struct {
	target *url.URL
	proxy  *httputil.ReverseProxy
}

func NewGatewayProxy(targetURL string) (*GatewayProxy, error) {
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse proxy target URL: %w", err)
	}

	reverseProxy := httputil.NewSingleHostReverseProxy(parsedURL)

	// Custom error handler if downstream service is down
	reverseProxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		fmt.Fprintf(w, `{"success":false,"error":{"code":"SERVICE_UNAVAILABLE","message":"Dịch vụ tạm thời không phản hồi (%s): %v"}}`, targetURL, err)
	}

	return &GatewayProxy{
		target: parsedURL,
		proxy:  reverseProxy,
	}, nil
}

func (p *GatewayProxy) Handle(c *gin.Context) {
	c.Request.Host = p.target.Host
	p.proxy.ServeHTTP(c.Writer, c.Request)
}
