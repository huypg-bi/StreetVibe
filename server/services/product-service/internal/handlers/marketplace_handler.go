package handlers

import (
	"streetvibe/product-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MarketplaceHandler struct {
	db           *gorm.DB
	serviceToken string
}

func NewMarketplaceHandler(db *gorm.DB, serviceToken string) *MarketplaceHandler {
	return &MarketplaceHandler{db: db, serviceToken: serviceToken}
}

func (h *MarketplaceHandler) requireInternal(c *gin.Context) bool {
	if h.serviceToken != "" && c.GetHeader("X-Internal-Service-Token") == h.serviceToken {
		return true
	}
	response.Forbidden(c, "Yêu cầu nội bộ không hợp lệ")
	return false
}

func requireRole(c *gin.Context, role string) bool {
	if c.GetHeader("X-User-Role") == role {
		return true
	}
	if c.GetString("role") == role {
		return true
	}
	response.Forbidden(c, "Bạn không có quyền thực hiện thao tác này")
	return false
}

func supplierProfileForUser(h *MarketplaceHandler, c *gin.Context) (*models.SupplierProfile, bool) {
	userID, err := uuid.Parse(c.GetHeader("X-User-Id"))
	if err != nil {
		response.Unauthorized(c, "Thiếu định danh nhà cung cấp")
		return nil, false
	}
	var profile models.SupplierProfile
	if err := h.db.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			profile = models.SupplierProfile{UserID: userID, BrandName: "BRAND-" + userID.String()[:8], Status: "APPROVED"}
			if err := h.db.Create(&profile).Error; err != nil {
				response.InternalError(c, "Không thể khởi tạo hồ sơ thương hiệu")
				return nil, false
			}
		} else {
			response.InternalError(c, "Không thể truy vấn hồ sơ thương hiệu")
			return nil, false
		}
	}
	if profile.Status == "BLOCKED" {
		response.Forbidden(c, "Tài khoản nhà cung cấp đang bị tạm khóa")
		return nil, false
	}
	return &profile, true
}
