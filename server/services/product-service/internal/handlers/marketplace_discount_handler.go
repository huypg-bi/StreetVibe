package handlers

import (
	"net/http"
	"time"

	"streetvibe/product-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

type discountInput struct {
	DiscountPercent int    `json:"discount_percent" binding:"gte=0,lte=99"`
	DiscountStart   string `json:"discount_start"` // RFC3339, vd: 2026-11-26T08:00:00+07:00
	DiscountEnd     string `json:"discount_end"`
}

// setDiscount lưu chương trình giảm giá. Không đổi trạng thái duyệt của sản phẩm.
// discount_percent = 0 nghĩa là tắt giảm giá.
func (h *MarketplaceHandler) setDiscount(c *gin.Context, product models.Product) {
	var req discountInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Phần trăm giảm giá phải từ 0 đến 99", err.Error())
		return
	}

	var start, end *time.Time
	if req.DiscountPercent > 0 {
		startAt, startErr := time.Parse(time.RFC3339, req.DiscountStart)
		endAt, endErr := time.Parse(time.RFC3339, req.DiscountEnd)
		if startErr != nil || endErr != nil {
			response.BadRequest(c, "Vui lòng nhập đủ thời gian bắt đầu và kết thúc", "")
			return
		}
		if !endAt.After(startAt) {
			response.BadRequest(c, "Thời gian kết thúc phải sau thời gian bắt đầu", "")
			return
		}
		if !endAt.After(time.Now()) {
			response.BadRequest(c, "Thời gian kết thúc đã qua", "")
			return
		}
		start, end = &startAt, &endAt
	}

	if err := h.db.Model(&product).Updates(map[string]interface{}{
		"discount_percent": req.DiscountPercent,
		"discount_start":   start,
		"discount_end":     end,
	}).Error; err != nil {
		response.InternalError(c, "Không thể lưu giảm giá")
		return
	}
	var saved models.Product
	if err := h.db.First(&saved, "id = ?", product.ID).Error; err != nil {
		response.InternalError(c, "Không thể tải lại sản phẩm")
		return
	}
	response.Success(c, http.StatusOK, "Đã lưu giảm giá", saved)
}

func (h *MarketplaceHandler) UpdateSupplierDiscount(c *gin.Context) {
	product, ok := h.ownedSupplierProduct(c)
	if !ok {
		return
	}
	h.setDiscount(c, product)
}

func (h *MarketplaceHandler) UpdateAdminDiscount(c *gin.Context) {
	product, ok := h.adminProduct(c)
	if !ok {
		return
	}
	h.setDiscount(c, product)
}
