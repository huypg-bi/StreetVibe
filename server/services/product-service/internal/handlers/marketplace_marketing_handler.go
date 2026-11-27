package handlers

import (
	"net/http"

	"streetvibe/product-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

func (h *MarketplaceHandler) AdminListVouchers(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var vouchers []models.Voucher
	h.db.Order("created_at desc").Find(&vouchers)
	response.Success(c, http.StatusOK, "Lấy voucher thành công", gin.H{"items": vouchers})
}

func (h *MarketplaceHandler) MemberListVouchers(c *gin.Context) {
	var vouchers []models.Voucher
	h.db.Where("is_active = ?", true).
		Where("max_uses = 0 OR used_count < max_uses").
		Order("created_at desc").
		Find(&vouchers)
	response.Success(c, http.StatusOK, "Lấy voucher khả dụng thành công", gin.H{"items": vouchers})
}

func (h *MarketplaceHandler) AdminCreateVoucher(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var req struct {
		Code            string  `json:"code" binding:"required"`
		DiscountPercent float64 `json:"discount_percent" binding:"required,gt=0"`
		MaxUses         int     `json:"max_uses"`
		IsActive        bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu voucher không hợp lệ", err.Error())
		return
	}
	voucher := models.Voucher{Code: req.Code, DiscountPercent: req.DiscountPercent, MaxUses: req.MaxUses, IsActive: req.IsActive}
	if err := h.db.Create(&voucher).Error; err != nil {
		response.InternalError(c, "Không thể tạo voucher")
		return
	}
	response.Success(c, http.StatusCreated, "Tạo voucher thành công", voucher)
}

func (h *MarketplaceHandler) AdminDeleteVoucher(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	h.db.Delete(&models.Voucher{}, "id = ?", c.Param("id"))
	response.Success(c, http.StatusOK, "Xóa voucher thành công", nil)
}

func (h *MarketplaceHandler) AdminListBanners(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var banners []models.Banner
	h.db.Order("created_at desc").Find(&banners)
	response.Success(c, http.StatusOK, "Lấy banner thành công", gin.H{"items": banners})
}

func (h *MarketplaceHandler) AdminCreateBanner(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var req struct {
		Title    string `json:"title" binding:"required"`
		ImageURL string `json:"image_url" binding:"required"`
		LinkURL  string `json:"link_url"`
		IsActive bool   `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu banner không hợp lệ", err.Error())
		return
	}
	banner := models.Banner{Title: req.Title, ImageURL: req.ImageURL, LinkURL: req.LinkURL, IsActive: req.IsActive}
	h.db.Create(&banner)
	response.Success(c, http.StatusCreated, "Tạo banner thành công", banner)
}

func (h *MarketplaceHandler) AdminDeleteBanner(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	h.db.Delete(&models.Banner{}, "id = ?", c.Param("id"))
	response.Success(c, http.StatusOK, "Xóa banner thành công", nil)
}
