package handlers

import (
	"net/http"

	"streetvibe/customer-service/internal/services"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

type WishlistHandler struct {
	service services.WishlistService
}

func NewWishlistHandler(service services.WishlistService) *WishlistHandler {
	return &WishlistHandler{service: service}
}

func (h *WishlistHandler) GetWishlist(c *gin.Context) {
	userID := c.GetString("user_id")
	products, err := h.service.GetWishlist(userID)
	if err != nil {
		response.InternalError(c, "Không thể lấy wishlist: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Lấy danh sách yêu thích thành công", gin.H{
		"products": products,
	})
}

func (h *WishlistHandler) AddItem(c *gin.Context) {
	userID := c.GetString("user_id")
	var dto services.AddWishlistDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		response.BadRequest(c, "Dữ liệu wishlist không hợp lệ", err.Error())
		return
	}

	if err := h.service.AddToWishlist(userID, &dto); err != nil {
		response.InternalError(c, "Lỗi khi thêm vào wishlist: "+err.Error())
		return
	}

	products, _ := h.service.GetWishlist(userID)
	response.Success(c, http.StatusOK, "Đã thêm vào danh sách yêu thích", gin.H{
		"products": products,
	})
}

func (h *WishlistHandler) RemoveItem(c *gin.Context) {
	userID := c.GetString("user_id")
	productID := c.Param("productId")

	if err := h.service.RemoveFromWishlist(userID, productID); err != nil {
		response.InternalError(c, "Lỗi khi xóa khỏi wishlist: "+err.Error())
		return
	}

	products, _ := h.service.GetWishlist(userID)
	response.Success(c, http.StatusOK, "Đã xóa khỏi danh sách yêu thích", gin.H{
		"products": products,
	})
}
