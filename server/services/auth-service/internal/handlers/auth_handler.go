package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"streetvibe/auth-service/internal/models"
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
	Name              string `json:"name" binding:"required,min=2,max=100"`
	Email             string `json:"email" binding:"required,email"`
	Password          string `json:"password" binding:"required,min=6"`
	SupplierRequested bool   `json:"supplier_request"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type UpdateRoleRequest struct {
	Role string `json:"role" binding:"required,oneof=admin customer supplier"`
}

type AdminCreateUserRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role" binding:"required,oneof=admin customer supplier"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu đăng ký không hợp lệ", err.Error())
		return
	}

	result, err := h.authService.Register(req.Name, req.Email, req.Password, req.SupplierRequested)
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

// ============================================
// ADMIN USER MANAGEMENT HANDLERS
// ============================================

func (h *AuthHandler) GetUsers(c *gin.Context) {
	search := c.Query("search")
	role := c.Query("role")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	users, total, err := h.authService.GetUsers(search, role, page, limit)
	if err != nil {
		response.InternalError(c, "Lỗi khi lấy danh sách người dùng")
		return
	}

	response.Success(c, http.StatusOK, "Lấy danh sách người dùng thành công", gin.H{
		"users": users,
		"pagination": gin.H{
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}

func (h *AuthHandler) UpdateUserRole(c *gin.Context) {
	targetUserID := c.Param("id")
	currentUserID := c.GetString("user_id")
	if currentUserID == "" {
		currentUserID = c.GetHeader("X-User-Id")
	}

	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu cập nhật quyền không hợp lệ", err.Error())
		return
	}

	err := h.authService.UpdateUserRole(currentUserID, targetUserID, models.Role(req.Role))
	if err != nil {
		if errors.Is(err, services.ErrCannotModifySelf) {
			response.BadRequest(c, "Không thể tự thay đổi quyền tài khoản của chính mình", "")
			return
		}
		if errors.Is(err, services.ErrUserNotFound) {
			response.NotFound(c, "Không tìm thấy người dùng")
			return
		}
		response.InternalError(c, "Lỗi khi cập nhật quyền người dùng")
		return
	}

	response.Success(c, http.StatusOK, "Cập nhật quyền thành công", nil)
}

func (h *AuthHandler) ApproveSupplierRequest(c *gin.Context) {
	currentUserID := c.GetString("user_id")
	if currentUserID == "" {
		currentUserID = c.GetHeader("X-User-Id")
	}

	err := h.authService.ApproveSupplierRequest(currentUserID, c.Param("id"))
	if err != nil {
		switch {
		case errors.Is(err, services.ErrCannotModifySelf):
			response.BadRequest(c, "Không thể tự duyệt yêu cầu Supplier của chính mình", "")
		case errors.Is(err, services.ErrUserNotFound):
			response.NotFound(c, "Không tìm thấy người dùng")
		case errors.Is(err, services.ErrSupplierRequestNotFound):
			response.BadRequest(c, "Người dùng không có yêu cầu Supplier đang chờ duyệt", "")
		default:
			response.InternalError(c, "Lỗi khi duyệt yêu cầu Supplier")
		}
		return
	}

	response.Success(c, http.StatusOK, "Duyệt yêu cầu Supplier thành công", nil)
}

func (h *AuthHandler) DeleteUser(c *gin.Context) {
	targetUserID := c.Param("id")
	currentUserID := c.GetString("user_id")
	if currentUserID == "" {
		currentUserID = c.GetHeader("X-User-Id")
	}

	err := h.authService.DeleteUser(currentUserID, targetUserID)
	if err != nil {
		if errors.Is(err, services.ErrCannotModifySelf) {
			response.BadRequest(c, "Không thể tự xóa tài khoản của chính mình", "")
			return
		}
		if errors.Is(err, services.ErrUserNotFound) {
			response.NotFound(c, "Không tìm thấy người dùng")
			return
		}
		response.InternalError(c, "Lỗi khi xóa người dùng")
		return
	}

	response.Success(c, http.StatusOK, "Xóa người dùng thành công", nil)
}

func (h *AuthHandler) UpdateCustomerStatus(c *gin.Context) {
	var req struct {
		Status string `json:"status" binding:"required"`
		Note   string `json:"admin_note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu khách hàng không hợp lệ", err.Error())
		return
	}
	if err := h.authService.UpdateCustomerStatus(c.Param("id"), req.Status, req.Note); err != nil {
		response.BadRequest(c, err.Error(), "")
		return
	}
	response.Success(c, http.StatusOK, "Cập nhật trạng thái khách hàng thành công", nil)
}

func (h *AuthHandler) CreateUser(c *gin.Context) {
	var req AdminCreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu tạo người dùng không hợp lệ", err.Error())
		return
	}

	newUser, err := h.authService.CreateUserByAdmin(req.Name, req.Email, req.Password, models.Role(req.Role))
	if err != nil {
		if errors.Is(err, services.ErrUserAlreadyExists) {
			response.Error(c, http.StatusConflict, "USER_EXISTS", "Email này đã được sử dụng")
			return
		}
		response.InternalError(c, "Lỗi khi tạo người dùng")
		return
	}

	response.Success(c, http.StatusCreated, "Tạo người dùng thành công", newUser)
}
