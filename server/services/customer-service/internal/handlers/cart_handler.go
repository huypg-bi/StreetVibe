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

// checkVariant hỏi Product Service xem biến thể còn đủ hàng không. endpoint: cart-add hoặc cart-check.
// Trả về false nếu đã gửi phản hồi lỗi.
func (h *CartHandler) checkVariant(c *gin.Context, endpoint, productID, variantID string, quantity int) (services.VariantInfo, bool) {
	unavailable := func() (services.VariantInfo, bool) {
		response.Error(c, http.StatusBadGateway, "PRODUCT_SERVICE_UNAVAILABLE", "Không thể kiểm tra tồn kho. Vui lòng thử lại.")
		return services.VariantInfo{}, false
	}
	payload, err := json.Marshal(map[string]interface{}{"product_id": productID, "variant_id": variantID, "quantity": quantity})
	if err != nil {
		return unavailable()
	}
	req, err := http.NewRequest(http.MethodPost, h.productServiceURL+"/api/v1/marketplace/internal/"+endpoint, bytes.NewReader(payload))
	if err != nil {
		return unavailable()
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Service-Token", h.internalServiceToken)
	client := &http.Client{Timeout: 5 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return unavailable()
	}
	defer res.Body.Close()

	var body struct {
		Data  services.VariantInfo   `json:"data"`
		Error *response.ErrorPayload `json:"error"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return unavailable()
	}
	// Lỗi do dữ liệu (hết hàng, sai biến thể...) thì chuyển nguyên thông báo cho khách
	if (res.StatusCode == http.StatusBadRequest || res.StatusCode == http.StatusNotFound) && body.Error != nil {
		response.BadRequest(c, body.Error.Message)
		return services.VariantInfo{}, false
	}
	if res.StatusCode >= http.StatusBadRequest {
		return unavailable()
	}
	return body.Data, true
}

func (h *CartHandler) respondWithCart(c *gin.Context, message string) {
	items, err := h.service.GetCart(c.GetString("user_id"))
	if err != nil {
		response.InternalError(c, "Không thể lấy giỏ hàng: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, message, gin.H{"items": items})
}

func (h *CartHandler) AddItem(c *gin.Context) {
	userID := c.GetString("user_id")
	var dto services.AddCartItemDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		response.BadRequest(c, "Vui lòng chọn màu và size trước khi thêm vào giỏ", err.Error())
		return
	}
	if dto.Quantity <= 0 {
		dto.Quantity = 1
	}

	inCart, err := h.service.QuantityInCart(userID, dto.ProductID, dto.VariantID)
	if err != nil {
		response.BadRequest(c, "Không thể thêm vào giỏ", err.Error())
		return
	}
	// Kiểm tra tồn kho theo tổng số lượng sẽ có trong giỏ
	total := inCart + dto.Quantity
	info, ok := h.checkVariant(c, "cart-add", dto.ProductID, dto.VariantID, total)
	if !ok {
		return
	}
	if err := h.service.SaveVariant(userID, dto.ProductID, dto.VariantID, total, info); err != nil {
		response.InternalError(c, "Lỗi khi thêm vào giỏ: "+err.Error())
		return
	}
	h.respondWithCart(c, "Đã thêm sản phẩm vào giỏ hàng")
}

type UpdateQuantityRequest struct {
	Quantity int `json:"quantity" binding:"required,gte=1"`
}

func (h *CartHandler) UpdateQuantity(c *gin.Context) {
	userID := c.GetString("user_id")
	itemID := c.Param("itemId")

	var req UpdateQuantityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Số lượng không hợp lệ", err.Error())
		return
	}
	item, err := h.service.GetItem(userID, itemID)
	if err != nil {
		response.BadRequest(c, "Không thể cập nhật giỏ hàng", err.Error())
		return
	}
	if item == nil {
		response.NotFound(c, "Sản phẩm không còn trong giỏ")
		return
	}
	// Giảm số lượng luôn được phép; tăng thì phải còn hàng
	if req.Quantity > item.Quantity {
		if item.VariantID == nil {
			response.BadRequest(c, "Sản phẩm chưa chọn màu và size. Hãy xóa và thêm lại.")
			return
		}
		if _, ok := h.checkVariant(c, "cart-check", item.ProductID.String(), item.VariantID.String(), req.Quantity); !ok {
			return
		}
	}

	if err := h.service.UpdateQuantity(userID, itemID, req.Quantity); err != nil {
		response.InternalError(c, "Lỗi cập nhật số lượng: "+err.Error())
		return
	}
	h.respondWithCart(c, "Cập nhật giỏ hàng thành công")
}

func (h *CartHandler) RemoveItem(c *gin.Context) {
	if err := h.service.RemoveItem(c.GetString("user_id"), c.Param("itemId")); err != nil {
		response.InternalError(c, "Lỗi khi xóa khỏi giỏ: "+err.Error())
		return
	}
	h.respondWithCart(c, "Đã xóa sản phẩm khỏi giỏ hàng")
}
