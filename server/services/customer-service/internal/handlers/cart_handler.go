package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"streetvibe/customer-service/internal/services"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
)

type CartHandler struct {
	service              services.CartService
	productServiceURL    string
	internalServiceToken string
}

func NewCartHandler(service services.CartService, productServiceURL, internalServiceToken string) *CartHandler {
	return &CartHandler{
		service:              service,
		productServiceURL:    productServiceURL,
		internalServiceToken: internalServiceToken,
	}
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

	payload, err := json.Marshal(map[string]string{"product_id": dto.ProductID})
	if err != nil {
		response.InternalError(c, "Không thể ghi nhận lượt thêm giỏ hàng")
		return
	}
	req, err := http.NewRequest(http.MethodPost, h.productServiceURL+"/api/v1/marketplace/internal/cart-add", bytes.NewReader(payload))
	if err != nil {
		response.Error(c, http.StatusBadGateway, "TRENDING_METRIC_UNAVAILABLE", "Sản phẩm đã thêm vào giỏ nhưng chưa ghi nhận được lượt trending")
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Service-Token", h.internalServiceToken)
	client := &http.Client{Timeout: 5 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		response.Error(c, http.StatusBadGateway, "TRENDING_METRIC_UNAVAILABLE", "Sản phẩm đã thêm vào giỏ nhưng chưa ghi nhận được lượt trending")
		return
	}
	defer res.Body.Close()
	if res.StatusCode >= http.StatusBadRequest {
		response.Error(c, http.StatusBadGateway, "TRENDING_METRIC_UNAVAILABLE", "Sản phẩm đã thêm vào giỏ nhưng chưa ghi nhận được lượt trending")
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
