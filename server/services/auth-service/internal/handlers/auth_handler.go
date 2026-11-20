package handlers

import (
	"errors"
	"net/http"

	"streetvibe/auth-service/internal/services"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService services.AuthService
}

func NewAuthHandler(authService services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu đăng ký không hợp lệ", err.Error())
		return
	}

	result, err := h.authService.Register(req.Name, req.Email, req.Password)
	if err != nil {
		if errors.Is(err, services.ErrUserAlreadyExists) {
			response.Error(c, http.StatusConflict, "USER_EXISTS", "Email này đã được sử dụng")
			return
		}
		response.InternalError(c, "Lỗi khi đăng ký tài khoản")
		return
	}

	response.Success(c, http.StatusCreated, "Đăng ký thành công", result)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Email hoặc mật khẩu không đúng định dạng", err.Error())
		return
	}

	result, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		if errors.Is(err, services.ErrInvalidCredentials) {
			response.Unauthorized(c, "Email hoặc mật khẩu không chính xác")
			return
		}
		response.InternalError(c, "Lỗi khi đăng nhập")
		return
	}

	response.Success(c, http.StatusOK, "Đăng nhập thành công", result)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Thiếu refresh token")
		return
	}

	newAccessToken, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		response.Unauthorized(c, "Refresh token không hợp lệ hoặc đã hết hạn")
		return
	}

	response.Success(c, http.StatusOK, "Cấp mới token thành công", gin.H{
		"access_token": newAccessToken,
	})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	// User ID can come from X-User-Id header (injected by API Gateway) or Auth Middleware
	userID := c.GetString("user_id")
	if userID == "" {
		userID = c.GetHeader("X-User-Id")
	}

	if userID == "" {
		response.Unauthorized(c, "Chưa xác thực người dùng")
		return
	}

	user, err := h.authService.GetProfile(userID)
	if err != nil {
		response.NotFound(c, "Không tìm thấy thông tin người dùng")
		return
	}

	response.Success(c, http.StatusOK, "Lấy thông tin thành công", user)
}
