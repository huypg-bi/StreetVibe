package handlers

import (
	"net/http"
	"time"

	"streetvibe/product-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (h *MarketplaceHandler) AdminListProducts(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var products []models.Product
	query := h.db.
		Preload("Category").
		Preload("Sport").
		Preload("Supplier").
		Preload("Colors").
		Preload("Variants.Color").
		Preload("Variants.Size").
		Order("created_at desc")
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if supplierID := c.Query("supplier_id"); supplierID != "" {
		query = query.Where("supplier_id = ?", supplierID)
	}
	query.Find(&products)
	response.Success(c, http.StatusOK, "Lấy danh sách kiểm duyệt thành công", gin.H{"items": products})
}

func (h *MarketplaceHandler) AdminInventory(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var products []models.Product
	query := h.db.
		Preload("Category").
		Preload("Sport").
		Preload("Supplier").
		Preload("Variants.Color").
		Preload("Variants.Size").
		Order("created_at desc")
	if supplierID := c.Query("supplier_id"); supplierID != "" {
		query = query.Where("supplier_id = ?", supplierID)
	}
	if search := c.Query("search"); search != "" {
		query = query.Where("name ILIKE ? OR brand ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	query.Find(&products)

	var totalStock, totalSold int
	for _, p := range products {
		totalStock += p.Stock
		totalSold += p.SoldCount
	}

	response.Success(c, http.StatusOK, "Lấy dữ liệu kho hàng thành công", gin.H{
		"items": products,
		"summary": gin.H{
			"total_products": len(products),
			"total_stock":    totalStock,
			"total_sold":     totalSold,
		},
	})
}

func (h *MarketplaceHandler) ModerateProduct(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var product models.Product
	if err := h.db.First(&product, "id = ?", c.Param("id")).Error; err != nil {
		response.NotFound(c, "Không tìm thấy sản phẩm")
		return
	}
	var req struct {
		Status string `json:"status" binding:"required"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Trạng thái không hợp lệ", err.Error())
		return
	}
	switch req.Status {
	case "APPROVED", "REJECTED", "HIDDEN":
		product.Status = req.Status
	default:
		response.BadRequest(c, "Trạng thái kiểm duyệt không hợp lệ", "")
		return
	}
	product.RejectionReason = req.Reason
	h.db.Save(&product)
	response.Success(c, http.StatusOK, "Cập nhật kiểm duyệt thành công", product)
}

func (h *MarketplaceHandler) AdminCreatePayout(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var req struct {
		SupplierID      string `json:"supplier_id" binding:"required"`
		Status          string `json:"status"`
		TransactionNote string `json:"transaction_note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu đối soát không hợp lệ", err.Error())
		return
	}
	supplierID, err := uuid.Parse(req.SupplierID)
	if err != nil {
		response.BadRequest(c, "Supplier ID không hợp lệ", "")
		return
	}
	var suborders []models.SubOrder
	h.db.Where("supplier_id = ? AND fulfillment_status = 'COMPLETED' AND payout_status = 'UNPAID'", supplierID).Find(&suborders)
	var amount float64
	for _, suborder := range suborders {
		amount += suborder.NetPayout
	}
	payout := models.Payout{SupplierID: supplierID, Amount: amount, Status: "PENDING", TransactionNote: req.TransactionNote}
	if req.Status == "PAID" {
		payout.Status = "PAID"
		now := time.Now()
		payout.PaidAt = &now
	}
	h.db.Create(&payout)
	response.Success(c, http.StatusCreated, "Tạo đợt đối soát thành công", payout)
}

func (h *MarketplaceHandler) AdminMarkPayoutPaid(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var payout models.Payout
	if err := h.db.First(&payout, "id = ?", c.Param("id")).Error; err != nil {
		response.NotFound(c, "Không tìm thấy đợt đối soát")
		return
	}
	var req struct {
		TransactionNote string `json:"transaction_note"`
	}
	c.ShouldBindJSON(&req)
	payout.Status = "PAID"
	payout.TransactionNote = req.TransactionNote
	now := time.Now()
	payout.PaidAt = &now
	h.db.Save(&payout)
	response.Success(c, http.StatusOK, "Đánh dấu đã thanh toán đối soát", payout)
}

func (h *MarketplaceHandler) AdminDashboard(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var pendingSuppliers, pendingProducts, suborders int64
	h.db.Model(&models.SupplierProfile{}).Where("status = 'PENDING'").Count(&pendingSuppliers)
	h.db.Model(&models.Product{}).Where("status = 'PENDING'").Count(&pendingProducts)
	h.db.Model(&models.SubOrder{}).Where("fulfillment_status = 'PENDING'").Count(&suborders)
	response.Success(c, http.StatusOK, "Lấy tổng quan admin thành công", gin.H{
		"pending_suppliers": pendingSuppliers,
		"pending_products":  pendingProducts,
		"pending_suborders": suborders,
	})
}
