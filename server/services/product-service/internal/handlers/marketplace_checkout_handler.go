package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"streetvibe/product-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// reserveItem chỉ gồm thứ khách được quyền chọn; giá và nhà cung cấp luôn đọc từ database.
type reserveItem struct {
	VariantID string `json:"variant_id" binding:"required,uuid"`
	Quantity  int    `json:"quantity" binding:"required,min=1,max=1000"`
}

// reservedItem là dòng hàng đã được giữ kho, trả về để Customer Service lập đơn.
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

// unavailableError là lỗi do hàng không mua được, được báo lại cho khách.
type unavailableError struct{ message string }

func (e unavailableError) Error() string { return e.message }

// reserveStock trừ kho một biến thể và trả dòng hàng với giá đang bán trong database.
func reserveStock(tx *gorm.DB, item reserveItem) (reservedItem, error) {
	var variant models.ProductVariant
	if err := tx.Preload("Color").Preload("Size").First(&variant, "id = ?", item.VariantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return reservedItem{}, unavailableError{"Màu và size đã chọn không còn tồn tại"}
		}
		return reservedItem{}, err
	}
	var product models.Product
	if err := tx.First(&product, "id = ? AND status = ?", variant.ProductID, "APPROVED").Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return reservedItem{}, unavailableError{"Có sản phẩm không còn bán"}
		}
		return reservedItem{}, err
	}
	// Điều kiện nằm trong câu UPDATE để hai đơn cùng lúc không bán vượt tồn kho
	result := tx.Model(&models.ProductVariant{}).
		Where("id = ? AND stock_quantity >= ?", variant.ID, item.Quantity).
		Update("stock_quantity", gorm.Expr("stock_quantity - ?", item.Quantity))
	if result.Error != nil {
		return reservedItem{}, result.Error
	}
	if result.RowsAffected == 0 {
		return reservedItem{}, unavailableError{fmt.Sprintf("Sản phẩm %q không đủ tồn kho", product.Name)}
	}
	if err := tx.Model(&models.Product{}).Where("id = ?", product.ID).
		Updates(map[string]interface{}{
			"sold_count": gorm.Expr("sold_count + ?", item.Quantity),
			"stock":      gorm.Expr("GREATEST(stock - ?, 0)", item.Quantity),
		}).Error; err != nil {
		return reservedItem{}, err
	}

	reserved := reservedItem{
		ProductID: product.ID.String(), SupplierID: product.SupplierID.String(), VariantID: variant.ID.String(),
		ProductName: product.Name, SKU: product.SKU, Quantity: item.Quantity, UnitPrice: product.SalePrice,
	}
	if variant.Color != nil {
		reserved.ColorName = variant.Color.Name
	}
	if variant.Size != nil {
		reserved.SizeName = variant.Size.Name
	}
	return reserved, nil
}

// createSubOrders tách đơn theo nhà cung cấp. Sản phẩm do Admin đăng (không có nhà cung cấp) không cần SubOrder.
func createSubOrders(tx *gorm.DB, orderID uuid.UUID, items []reservedItem) error {
	grouped := map[uuid.UUID][]reservedItem{}
	for _, item := range items {
		supplierID, err := uuid.Parse(item.SupplierID)
		if err == nil && supplierID != uuid.Nil {
			grouped[supplierID] = append(grouped[supplierID], item)
		}
	}
	for supplierID, lines := range grouped {
		var profile models.SupplierProfile
		if err := tx.First(&profile, "id = ?", supplierID).Error; err != nil {
			return err
		}
		subtotal := 0.0
		for _, line := range lines {
			subtotal += line.UnitPrice * float64(line.Quantity)
		}
		commission := subtotal * profile.CommissionRate / 100
		suborder := models.SubOrder{
			OrderID: orderID, SupplierID: supplierID, Subtotal: subtotal,
			CommissionRate: profile.CommissionRate, CommissionAmount: commission, NetPayout: subtotal - commission,
			FulfillmentStatus: "PENDING", PayoutStatus: "UNPAID",
		}
		if err := tx.Create(&suborder).Error; err != nil {
			return err
		}
		for _, line := range lines {
			variantID, err := uuid.Parse(line.VariantID)
			if err != nil {
				return err
			}
			suborderItem := models.SubOrderItem{
				SubOrderID: suborder.ID, VariantID: variantID, ProductName: line.ProductName,
				SKU: line.SKU, ColorName: line.ColorName, SizeName: line.SizeName,
				Quantity: line.Quantity, UnitPrice: line.UnitPrice,
				Subtotal: line.UnitPrice * float64(line.Quantity),
			}
			if err := tx.Create(&suborderItem).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

// InternalReserveCheckout giữ kho cho cả đơn trong một giao dịch: một dòng lỗi thì không trừ gì.
func (h *MarketplaceHandler) InternalReserveCheckout(c *gin.Context) {
	if !h.requireInternal(c) {
		return
	}
	var req struct {
		OrderID string        `json:"order_id" binding:"required,uuid"`
		Items   []reserveItem `json:"items" binding:"required,min=1,max=100,dive"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu đặt hàng không hợp lệ", err.Error())
		return
	}
	orderID := uuid.MustParse(req.OrderID)
	var reserved []reservedItem
	err := h.db.Transaction(func(tx *gorm.DB) error {
		for _, item := range req.Items {
			line, err := reserveStock(tx, item)
			if err != nil {
				return err
			}
			reserved = append(reserved, line)
		}
		return createSubOrders(tx, orderID, reserved)
	})
	var unavailable unavailableError
	if errors.As(err, &unavailable) {
		response.BadRequest(c, unavailable.message, "")
		return
	}
	if err != nil {
		log.Printf("Checkout %s thất bại: %v", orderID, err)
		response.InternalError(c, "Không thể giữ hàng cho đơn")
		return
	}
	response.Success(c, http.StatusCreated, "Đã trừ tồn kho và tạo SubOrder", gin.H{"order_id": orderID, "items": reserved})
}

func (h *MarketplaceHandler) GetTrending(c *gin.Context) {
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "8"))
	if err != nil || limit <= 0 {
		limit = 8
	}
	if limit > 50 {
		limit = 50
	}
	var products []models.Product
	query := h.db.Preload("Category").Where("status = ?", "APPROVED")
	if brand := strings.TrimSpace(c.Query("brand")); brand != "" {
		query = query.Where("LOWER(brand) = LOWER(?)", brand)
	}
	if err := query.
		Order("(cart_count + sold_count) desc, sold_count desc, created_at desc").
		Limit(limit).Find(&products).Error; err != nil {
		response.InternalError(c, "Không thể lấy sản phẩm trending")
		return
	}
	hideCostFromPublic(c, products)
	response.Success(c, http.StatusOK, "Lấy sản phẩm trending thành công", gin.H{"items": products, "count": len(products)})
}
