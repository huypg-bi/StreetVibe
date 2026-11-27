package identity

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"streetvibe/shared/token"

	"github.com/gin-gonic/gin"
)

func TestMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const secret = "secret-thu"
	router := gin.New()
	router.Use(Middleware(secret))
	router.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, c.GetHeader("X-User-Role")+"|"+c.GetHeader("X-User-Id")+"|"+c.GetHeader("X-User-Name"))
	})

	valid, _, err := token.GenerateTokens(secret, "u1", "a@x", "supplier")
	if err != nil {
		t.Fatal(err)
	}
	forged, _, _ := token.GenerateTokens("secret-khac", "u1", "a@x", "admin")

	for name, c := range map[string]struct{ bearer, want string }{
		"không token":    {"", "||"},
		"token sai khóa": {forged, "||"},
		"token rác":      {"abc", "||"},
		"token hợp lệ":   {valid, "supplier|u1|"},
	} {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		// Header giả mạo gửi kèm mọi yêu cầu, kể cả viết thường
		req.Header.Set("X-User-Role", "admin")
		req.Header.Set("x-user-id", "nguoi-khac")
		req.Header.Set("X-User-Name", "Mạo danh")
		if c.bearer != "" {
			req.Header.Set("Authorization", "Bearer "+c.bearer)
		}
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)
		if got := res.Body.String(); got != c.want {
			t.Errorf("%s: muốn %q được %q", name, c.want, got)
		}
	}
}
