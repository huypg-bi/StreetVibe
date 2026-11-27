package handlers

import (
	"fmt"
	"net/http"

	"streetvibe/product-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// checkCartVariant xác nhận biến thể (màu + size) đang bán và đủ tồn kho cho số lượng yêu cầu.
// Trả về false nếu đã gửi phản hồi lỗi.
func (h *MarketplaceHandler) checkCartVariant(c *gin.Context) (models.Product, models.ProductVariant, bool) {
	var product models.Product
	var variant models.ProductVariant
	if !h.requireInternal(c) {
		return product, variant, false
	}
	var req struct {
		ProductID string `json:"product_id" binding:"required"`
		VariantID string `json:"variant_id" binding:"required"`
		Quantity  int    `json:"quantity" binding:"required,gte=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Vui lòng chọn màu, size và số lượng", err.Error())
		return product, variant, false
	}
	productID, productErr := uuid.Parse(req.ProductID)
	variantID, variantErr := uuid.Parse(req.VariantID)
	if productErr != nil || variantErr != nil {
		response.BadRequest(c, "Sản phẩm hoặc biến thể không hợp lệ")
		return product, variant, false
	}
	if err := h.db.First(&product, "id = ? AND status = 'APPROVED'", productID).Error; err != nil {
		response.NotFound(c, "Sản phẩm không còn bán")
		return product, variant, false
	}
	if err := h.db.Preload("Color").Preload("Size").
		First(&variant, "id = ? AND product_id = ?", variantID, productID).Error; err != nil {
		response.BadRequest(c, "Màu và size đã chọn không tồn tại")
		return product, variant, false
	}
	if variant.StockQuantity <= 0 {
		response.BadRequest(c, "Màu và size đã chọn đã hết hàng")
		return product, variant, false
	}
	if req.Quantity > variant.StockQuantity {
		response.BadRequest(c, fmt.Sprintf("Chỉ còn %d sản phẩm cho màu và size này", variant.StockQuantity))
		return product, variant, false
	}
	return product, variant, true
}

// cartVariantData là dữ liệu giỏ hàng lấy từ database, không tin giá do trình duyệt gửi.
func cartVariantData(product models.Product, variant models.ProductVariant) gin.H {
	data := gin.H{
		"product_name":  product.Name,
		"product_image": product.Image,
		"price":         product.SalePrice,
	}
	if variant.Color != nil {
		data["color_name"] = variant.Color.Name
	}
	if variant.Size != nil {
		data["size_name"] = variant.Size.Name
	}
	return data
}

// CheckCartVariant dùng khi khách tăng số lượng trong giỏ.
func (h *MarketplaceHandler) CheckCartVariant(c *gin.Context) {
	product, variant, ok := h.checkCartVariant(c)
	if !ok {
		return
	}
	response.Success(c, http.StatusOK, "Biến thể còn đủ hàng", cartVariantData(product, variant))
}

// RecordCartAdd dùng khi khách thêm vào giỏ: kiểm tra hàng và cộng lượt bỏ giỏ.
func (h *MarketplaceHandler) RecordCartAdd(c *gin.Context) {
	product, variant, ok := h.checkCartVariant(c)
	if !ok {
		return
	}
	if err := h.db.Model(&models.Product{}).Where("id = ?", product.ID).
		Update("cart_count", gorm.Expr("cart_count + 1")).Error; err != nil {
		response.InternalError(c, "Không thể ghi nhận lượt thêm giỏ hàng")
		return
	}
	response.Success(c, http.StatusOK, "Đã ghi nhận lượt thêm giỏ hàng", cartVariantData(product, variant))
}
