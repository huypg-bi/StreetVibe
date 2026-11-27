package handlers

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"streetvibe/customer-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderHandler struct {
	db                   *gorm.DB
	productServiceURL    string
	internalServiceToken string
}

func NewOrderHandler(db *gorm.DB, productServiceURL, internalServiceToken string) *OrderHandler {
	return &OrderHandler{db: db, productServiceURL: productServiceURL, internalServiceToken: internalServiceToken}
}

// checkoutItem chỉ gồm lựa chọn của khách. Giá, tên và nhà cung cấp do Product Service xác nhận.
type checkoutItem struct {
	VariantID string `json:"variant_id" binding:"required,uuid"`
	Quantity  int    `json:"quantity" binding:"required,min=1,max=1000"`
}

type reservedItem struct {
	ProductID   string  `json:"product_id"`
	SupplierID  string  `json:"supplier_id"`
	VariantID   string  `json:"variant_id"`
	ProductName string  `json:"product_name"`
	SKU         string  `json:"sku"`
	ColorName   string  `json:"color_name"`
	SizeName    string  `json:"size_name"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
}

// reserve giữ kho ở Product Service. status khác 0 là mã trả cho khách khi lỗi.
func (h *OrderHandler) reserve(orderID uuid.UUID, items []checkoutItem) ([]reservedItem, int, string) {
	const unreachable = "Không thể đồng bộ tồn kho và SubOrder"
	payload, err := json.Marshal(map[string]interface{}{"order_id": orderID.String(), "items": items})
	if err != nil {
		return nil, http.StatusBadGateway, unreachable
	}
	request, err := http.NewRequest(http.MethodPost, h.productServiceURL+"/api/v1/marketplace/internal/checkout", bytes.NewReader(payload))
	if err != nil {
		return nil, http.StatusBadGateway, unreachable
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Internal-Service-Token", h.internalServiceToken)
	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(request)
	if err != nil {
		return nil, http.StatusBadGateway, unreachable
	}
	defer res.Body.Close()
	var body struct {
		Data struct {
			Items []reservedItem `json:"items"`
		} `json:"data"`
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	decodeErr := json.NewDecoder(res.Body).Decode(&body)
	switch {
	case res.StatusCode == http.StatusBadRequest && body.Error.Message != "":
		return nil, http.StatusBadRequest, body.Error.Message
	case res.StatusCode >= 400 || decodeErr != nil || len(body.Data.Items) != len(items):
		return nil, http.StatusBadGateway, unreachable
	}
	return body.Data.Items, 0, ""
}

func (h *OrderHandler) Checkout(c *gin.Context) {
	userID, err := uuid.Parse(c.GetString("user_id"))
	if err != nil {
		response.Unauthorized(c, "Thiếu định danh khách hàng")
		return
	}
	var req struct {
		ShippingAddress string         `json:"shipping_address" binding:"max=500"`
		Items           []checkoutItem `json:"items" binding:"required,min=1,max=100,dive"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu thanh toán không hợp lệ", err.Error())
		return
	}
	order := models.Order{UserID: userID, PaymentStatus: "UNPAID", Status: "PENDING", ShippingAddress: req.ShippingAddress}
	if err := h.db.Create(&order).Error; err != nil {
		response.InternalError(c, "Không thể tạo đơn hàng")
		return
	}
	reserved, status, message := h.reserve(order.ID, req.Items)
	if status != 0 {
		h.db.Delete(&models.Order{}, "id = ?", order.ID)
		code := "BAD_REQUEST"
		if status == http.StatusBadGateway {
			code = "SERVICE_UNAVAILABLE"
		}
		response.Error(c, status, code, message)
		return
	}
	err = h.db.Transaction(func(tx *gorm.DB) error {
		for _, item := range reserved {
			productID, _ := uuid.Parse(item.ProductID)
			supplierID, _ := uuid.Parse(item.SupplierID)
			variantID, _ := uuid.Parse(item.VariantID)
			subtotal := item.UnitPrice * float64(item.Quantity)
			order.TotalAmount += subtotal
			orderItem := models.OrderItem{
				OrderID: order.ID, ProductID: productID, SupplierID: supplierID, VariantID: variantID,
				ProductName: item.ProductName, SKU: item.SKU, ColorName: item.ColorName, SizeName: item.SizeName,
				Quantity: item.Quantity, UnitPrice: item.UnitPrice, Subtotal: subtotal,
			}
			if err := tx.Create(&orderItem).Error; err != nil {
				return err
			}
		}
		return tx.Save(&order).Error
	})
	if err != nil {
		// Kho đã trừ ở Product Service: ghi lại để đối soát thủ công
		log.Printf("Đơn %s đã giữ kho nhưng không lưu được: %v", order.ID, err)
		response.InternalError(c, "Không thể tạo đơn hàng")
		return
	}
	h.db.Preload("OrderItems").First(&order, "id = ?", order.ID)
	response.Success(c, http.StatusCreated, "Tạo đơn hàng thành công", order)
}

func (h *OrderHandler) GetMyOrders(c *gin.Context) {
	userID, err := uuid.Parse(c.GetString("user_id"))
	if err != nil {
		response.Unauthorized(c, "Thiếu định danh khách hàng")
		return
	}
	var orders []models.Order
	h.db.Preload("OrderItems").Where("user_id = ?", userID).Order("created_at desc").Find(&orders)
	response.Success(c, http.StatusOK, "Lấy đơn hàng thành công", gin.H{"items": orders})
}

func (h *OrderHandler) AdminListOrders(c *gin.Context) {
	if c.GetHeader("X-User-Role") != "admin" && c.GetString("role") != "admin" {
		response.Forbidden(c, "Chỉ dành cho Admin")
		return
	}
	var orders []models.Order
	query := h.db.Preload("OrderItems").Order("created_at desc")
	if status := c.Query("payment_status"); status != "" {
		query = query.Where("payment_status = ?", status)
	}
	query.Find(&orders)
	response.Success(c, http.StatusOK, "Lấy danh sách đơn hàng thành công", gin.H{"items": orders})
}

func (h *OrderHandler) AdminUpdateOrder(c *gin.Context) {
	if c.GetHeader("X-User-Role") != "admin" && c.GetString("role") != "admin" {
		response.Forbidden(c, "Chỉ dành cho Admin")
		return
	}
	var order models.Order
	if err := h.db.First(&order, "id = ?", c.Param("id")).Error; err != nil {
		response.NotFound(c, "Không tìm thấy đơn hàng")
		return
	}
	var req struct {
		PaymentStatus string `json:"payment_status"`
		Status        string `json:"status"`
	}
	c.ShouldBindJSON(&req)
	if req.PaymentStatus != "" {
		order.PaymentStatus = req.PaymentStatus
	}
	if req.Status != "" {
		order.Status = req.Status
	}
	h.db.Save(&order)
	response.Success(c, http.StatusOK, "Cập nhật đơn hàng thành công", order)
}
