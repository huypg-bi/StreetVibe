package handlers

import (
	"net/http"

	"streetvibe/customer-service/internal/services"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

type CartHandler struct {
	service services.CartService
}

func NewCartHandler(service services.CartService) *CartHandler {
	return &CartHandler{service: service}
}

func (h *CartHandler) GetCart(c *gin.Context) {
	userID := c.GetString("user_id")
	items, err := h.service.GetCart(userID)
	if err != nil {
		response.InternalError(c, "Không thể lấy giỏ hàng: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Lấy giỏ hàng thành công", gin.H{
		"items": items,
	})
}

func (h *CartHandler) AddItem(c *gin.Context) {
	userID := c.GetString("user_id")
	var dto services.AddCartItemDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		response.BadRequest(c, "Dữ liệu thêm vào giỏ không hợp lệ", err.Error())
		return
	}

	if err := h.service.AddToCart(userID, &dto); err != nil {
		response.InternalError(c, "Lỗi khi thêm vào giỏ: "+err.Error())
		return
	}

	items, _ := h.service.GetCart(userID)
	response.Success(c, http.StatusOK, "Đã thêm sản phẩm vào giỏ hàng", gin.H{
		"items": items,
	})
}

type UpdateQuantityRequest struct {
	Quantity int `json:"quantity" binding:"required"`
}

func (h *CartHandler) UpdateQuantity(c *gin.Context) {
	userID := c.GetString("user_id")
	productID := c.Param("productId")

	var req UpdateQuantityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Số lượng không hợp lệ", err.Error())
		return
	}

	if err := h.service.UpdateQuantity(userID, productID, req.Quantity); err != nil {
		response.InternalError(c, "Lỗi cập nhật số lượng: "+err.Error())
		return
	}

	items, _ := h.service.GetCart(userID)
	response.Success(c, http.StatusOK, "Cập nhật giỏ hàng thành công", gin.H{
		"items": items,
	})
}

func (h *CartHandler) RemoveItem(c *gin.Context) {
	userID := c.GetString("user_id")
	productID := c.Param("productId")

	if err := h.service.RemoveItem(userID, productID); err != nil {
		response.InternalError(c, "Lỗi khi xóa khỏi giỏ: "+err.Error())
		return
	}

	items, _ := h.service.GetCart(userID)
	response.Success(c, http.StatusOK, "Đã xóa sản phẩm khỏi giỏ hàng", gin.H{
		"items": items,
	})
}
