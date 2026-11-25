package handlers

import (
	"bytes"
	"encoding/json"
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

type checkoutItem struct {
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

func (h *OrderHandler) Checkout(c *gin.Context) {
	userID, err := uuid.Parse(c.GetString("user_id"))
	if err != nil {
		response.Unauthorized(c, "Thiếu định danh khách hàng")
		return
	}
	var req struct {
		ShippingAddress string         `json:"shipping_address"`
		Items           []checkoutItem `json:"items" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu thanh toán không hợp lệ", err.Error())
		return
	}
	order := models.Order{UserID: userID, PaymentStatus: "UNPAID", Status: "PENDING", ShippingAddress: req.ShippingAddress}
	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		for _, item := range req.Items {
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
		response.InternalError(c, "Không thể tạo đơn hàng")
		return
	}
	reserveItems := make([]map[string]interface{}, 0, len(req.Items))
	for _, item := range req.Items {
		reserveItems = append(reserveItems, map[string]interface{}{
			"variant_id":   item.VariantID,
			"supplier_id":  item.SupplierID,
			"quantity":     item.Quantity,
			"unit_price":   item.UnitPrice,
			"product_name": item.ProductName,
			"sku":          item.SKU,
			"color_name":   item.ColorName,
			"size_name":    item.SizeName,
		})
	}
	payload, _ := json.Marshal(map[string]interface{}{"order_id": order.ID.String(), "items": reserveItems})
	checkoutRequest, requestErr := http.NewRequest(http.MethodPost, h.productServiceURL+"/api/v1/marketplace/internal/checkout", bytes.NewReader(payload))
	if requestErr != nil {
		h.db.Delete(&models.Order{}, "id = ?", order.ID)
		response.Error(c, http.StatusBadGateway, "SERVICE_UNAVAILABLE", "Không thể đồng bộ tồn kho và SubOrder")
		return
	}
	checkoutRequest.Header.Set("Content-Type", "application/json")
	checkoutRequest.Header.Set("X-Internal-Service-Token", h.internalServiceToken)
	client := &http.Client{Timeout: 10 * time.Second}
	res, reserveErr := client.Do(checkoutRequest)
	if reserveErr != nil {
		h.db.Delete(&models.Order{}, "id = ?", order.ID)
		response.Error(c, http.StatusBadGateway, "SERVICE_UNAVAILABLE", "Không thể đồng bộ tồn kho và SubOrder")
		return
	} else {
		defer res.Body.Close()
		if res.StatusCode >= 400 {
			h.db.Delete(&models.Order{}, "id = ?", order.ID)
			response.BadRequest(c, "Không đủ tồn kho hoặc SubOrder không thể tạo", "")
			return
		}
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
