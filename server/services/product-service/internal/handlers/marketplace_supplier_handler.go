package handlers

import (
	"net/http"

	"streetvibe/product-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (h *MarketplaceHandler) GetSupplierProfile(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if ok {
		response.Success(c, http.StatusOK, "Lấy hồ sơ thương hiệu thành công", profile)
	}
}

func (h *MarketplaceHandler) UpdateSupplierProfile(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return
	}
	var req struct {
		BrandName        string `json:"brand_name"`
		LogoURL          string `json:"logo_url"`
		Description      string `json:"description"`
		WarehouseAddress string `json:"warehouse_address"`
		BankAccountInfo  string `json:"bank_account_info"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu hồ sơ không hợp lệ", err.Error())
		return
	}
	profile.BrandName = req.BrandName
	profile.LogoURL = req.LogoURL
	profile.Description = req.Description
	profile.WarehouseAddress = req.WarehouseAddress
	profile.BankAccountInfo = req.BankAccountInfo
	h.db.Save(profile)
	response.Success(c, http.StatusOK, "Cập nhật hồ sơ thương hiệu thành công", profile)
}

func (h *MarketplaceHandler) AdminListSuppliers(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var suppliers []models.SupplierProfile
	query := h.db.Order("created_at desc")
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	query.Find(&suppliers)
	response.Success(c, http.StatusOK, "Lấy danh sách nhà cung cấp thành công", gin.H{"items": suppliers})
}

func (h *MarketplaceHandler) AdminUpdateSupplier(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var supplier models.SupplierProfile
	if err := h.db.First(&supplier, "id = ?", c.Param("id")).Error; err != nil {
		response.NotFound(c, "Không tìm thấy nhà cung cấp")
		return
	}
	var req struct {
		Status         string   `json:"status"`
		CommissionRate *float64 `json:"commission_rate"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu nhà cung cấp không hợp lệ", err.Error())
		return
	}
	if req.Status != "" {
		supplier.Status = req.Status
	}
	if req.CommissionRate != nil {
		supplier.CommissionRate = *req.CommissionRate
	}
	h.db.Save(&supplier)
	response.Success(c, http.StatusOK, "Cập nhật nhà cung cấp thành công", supplier)
}

type variantInput struct {
	ColorID       string `json:"color_id" binding:"required"`
	SizeID        string `json:"size_id" binding:"required"`
	StockQuantity int    `json:"stock_quantity"`
}

func (h *MarketplaceHandler) SupplierListProducts(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return
	}
	var products []models.Product
	h.db.Preload("Category").Preload("Sport").Preload("Variants.Color").Preload("Variants.Size").Where("supplier_id = ?", profile.ID).Order("created_at desc").Find(&products)
	response.Success(c, http.StatusOK, "Lấy sản phẩm thương hiệu thành công", gin.H{"items": products})
}

func (h *MarketplaceHandler) SupplierDashboard(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return
	}

	var productsOnSale int64
	h.db.Model(&models.Product{}).Where("supplier_id = ? AND status = ?", profile.ID, "APPROVED").Count(&productsOnSale)
	var productsPending int64
	h.db.Model(&models.Product{}).Where("supplier_id = ? AND status = ?", profile.ID, "PENDING").Count(&productsPending)
	var pendingSuborders int64
	h.db.Model(&models.SubOrder{}).Where("supplier_id = ? AND fulfillment_status = ?", profile.ID, "PENDING").Count(&pendingSuborders)
	var revenue struct {
		GrossRevenue float64 `json:"gross_revenue"`
		NetRevenue   float64 `json:"net_revenue"`
	}
	h.db.Model(&models.SubOrder{}).
		Select("COALESCE(SUM(subtotal), 0) AS gross_revenue, COALESCE(SUM(net_payout), 0) AS net_revenue").
		Where("supplier_id = ? AND fulfillment_status <> ?", profile.ID, "CANCELLED").
		Scan(&revenue)
	response.Success(c, http.StatusOK, "Lấy tổng quan thương hiệu thành công", gin.H{
		"brand_name":        profile.BrandName,
		"supplier_status":   profile.Status,
		"gross_revenue":     revenue.GrossRevenue,
		"net_revenue":       revenue.NetRevenue,
		"products_on_sale":  productsOnSale,
		"products_pending":  productsPending,
		"pending_suborders": pendingSuborders,
	})
}

type supplierProductInput struct {
	Name          string   `json:"name" binding:"required"`
	Fit           string   `json:"fit"`
	Description   string   `json:"description"`
	Price         float64  `json:"price" binding:"required,gt=0"`
	OriginalPrice float64  `json:"original_price"`
	Stock         int      `json:"stock" binding:"gte=0"`
	Image         string   `json:"image"`
	Images        []string `json:"images"`
	CategoryID    string   `json:"category_id" binding:"required"`
	SportID       string   `json:"sport_id"`
	Gender        string   `json:"gender"`
}

// bindSupplierProduct đọc và kiểm tra dữ liệu chung khi tạo hoặc sửa sản phẩm.
// Trả về false nếu đã gửi phản hồi lỗi.
func (h *MarketplaceHandler) bindSupplierProduct(c *gin.Context) (supplierProductInput, models.Category, *uuid.UUID, bool) {
	var req supplierProductInput
	var category models.Category
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu sản phẩm không hợp lệ", err.Error())
		return req, category, nil, false
	}
	if len(req.Images) > 5 {
		response.BadRequest(c, "Sản phẩm chỉ được có tối đa 5 ảnh")
		return req, category, nil, false
	}
	if len(req.Images) == 0 && req.Image != "" {
		req.Images = []string{req.Image}
	}
	if len(req.Images) > 0 {
		req.Image = req.Images[0]
	}
	categoryID, err := uuid.Parse(req.CategoryID)
	if err != nil {
		response.BadRequest(c, "Category ID không hợp lệ", "")
		return req, category, nil, false
	}
	if err := h.db.First(&category, "id = ?", categoryID).Error; err != nil {
		response.BadRequest(c, "Danh mục không tồn tại", "")
		return req, category, nil, false
	}
	var sportID *uuid.UUID
	if req.SportID != "" {
		if sid, err := uuid.Parse(req.SportID); err == nil {
			sportID = &sid
		}
	}
	return req, category, sportID, true
}

// ownedSupplierProduct tìm sản phẩm theo :id và bảo đảm thuộc thương hiệu đang đăng nhập.
func (h *MarketplaceHandler) ownedSupplierProduct(c *gin.Context) (models.Product, bool) {
	var product models.Product
	if !requireRole(c, "supplier") {
		return product, false
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return product, false
	}
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Product ID không hợp lệ", "")
		return product, false
	}
	if err := h.db.Where("id = ? AND supplier_id = ?", productID, profile.ID).First(&product).Error; err != nil {
		response.NotFound(c, "Không tìm thấy sản phẩm thuộc thương hiệu")
		return product, false
	}
	return product, true
}

func (h *MarketplaceHandler) CreateSupplierProduct(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return
	}
	req, category, sportID, ok := h.bindSupplierProduct(c)
	if !ok {
		return
	}
	product := models.Product{
		SupplierID: profile.ID, Name: req.Name, Brand: profile.BrandName, Fit: req.Fit,
		Gender: models.NormalizeGender(req.Gender),
		Slug:   uuid.New().String(), Description: req.Description, Price: req.Price,
		OriginalPrice: req.OriginalPrice, Stock: req.Stock,
		Status: "PENDING", Image: req.Image, Images: req.Images,
		CategoryID: category.ID, SportID: sportID, AverageRating: 5,
	}
	if err := h.db.Create(&product).Error; err != nil {
		response.InternalError(c, "Không thể tạo sản phẩm")
		return
	}
	product.Category = &category
	response.Success(c, http.StatusCreated, "Tạo sản phẩm thành công và chờ duyệt", product)
}

func (h *MarketplaceHandler) UpdateSupplierProduct(c *gin.Context) {
	product, ok := h.ownedSupplierProduct(c)
	if !ok {
		return
	}
	req, category, sportID, ok := h.bindSupplierProduct(c)
	if !ok {
		return
	}
	var variantCount int64
	if err := h.db.Model(&models.ProductVariant{}).Where("product_id = ?", product.ID).Count(&variantCount).Error; err != nil {
		response.InternalError(c, "Không thể kiểm tra biến thể")
		return
	}
	// Có biến thể thì tồn kho là tổng các biến thể, không sửa trực tiếp
	if variantCount == 0 {
		product.Stock = req.Stock
	}
	if len(req.Images) > 0 {
		product.Image = req.Image
		product.Images = req.Images
	}
	product.Name = req.Name
	product.Fit = req.Fit
	if req.Gender != "" {
		product.Gender = models.NormalizeGender(req.Gender)
	}
	product.Description = req.Description
	product.Price = req.Price
	product.OriginalPrice = req.OriginalPrice
	product.CategoryID = category.ID
	product.SportID = sportID
	// Nội dung thay đổi cần Admin duyệt lại
	product.Status = "PENDING"
	product.RejectionReason = ""
	if err := h.db.Save(&product).Error; err != nil {
		response.InternalError(c, "Không thể cập nhật sản phẩm")
		return
	}
	product.Category = &category
	response.Success(c, http.StatusOK, "Cập nhật sản phẩm thành công và chờ duyệt", product)
}

func (h *MarketplaceHandler) DeleteSupplierProduct(c *gin.Context) {
	product, ok := h.ownedSupplierProduct(c)
	if !ok {
		return
	}
	if err := h.db.Delete(&product).Error; err != nil {
		response.InternalError(c, "Không thể xóa sản phẩm")
		return
	}
	response.Success(c, http.StatusOK, "Xóa sản phẩm thành công", nil)
}

func (h *MarketplaceHandler) CreateProductVariant(c *gin.Context) {
	product, ok := h.ownedSupplierProduct(c)
	if !ok {
		return
	}
	// Biến thể mới của Supplier cần Admin duyệt lại
	h.createVariants(c, product, "PENDING")
}

func (h *MarketplaceHandler) SupplierListSubOrders(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return
	}
	var suborders []models.SubOrder
	h.db.Preload("Items").Where("supplier_id = ?", profile.ID).Order("created_at desc").Find(&suborders)
	response.Success(c, http.StatusOK, "Lấy đơn hàng con thành công", gin.H{"items": suborders})
}

func (h *MarketplaceHandler) UpdateSubOrder(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return
	}
	var suborder models.SubOrder
	if err := h.db.Preload("Items").Where("id = ? AND supplier_id = ?", c.Param("id"), profile.ID).First(&suborder).Error; err != nil {
		response.NotFound(c, "Không tìm thấy SubOrder thuộc thương hiệu")
		return
	}
	var req struct {
		FulfillmentStatus string `json:"fulfillment_status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Trạng thái đơn không hợp lệ", err.Error())
		return
	}
	switch req.FulfillmentStatus {
	case "PENDING", "PACKING", "READY_TO_SHIP", "CANCELLED", "COMPLETED":
	default:
		response.BadRequest(c, "Trạng thái tiến độ không hợp lệ", "")
		return
	}
	if req.FulfillmentStatus == "CANCELLED" && suborder.FulfillmentStatus != "CANCELLED" {
		err := h.db.Transaction(func(tx *gorm.DB) error {
			for _, item := range suborder.Items {
				var variant models.ProductVariant
				if err := tx.First(&variant, "id = ?", item.VariantID).Error; err != nil {
					return err
				}
				if err := tx.Model(&variant).Update("stock_quantity", variant.StockQuantity+item.Quantity).Error; err != nil {
					return err
				}
				if err := tx.Model(&models.Product{}).Where("id = ?", variant.ProductID).
					Updates(map[string]interface{}{
						"sold_count": gorm.Expr("GREATEST(sold_count - ?, 0)", item.Quantity),
						"stock":      gorm.Expr("stock + ?", item.Quantity),
					}).Error; err != nil {
					return err
				}
			}
			suborder.FulfillmentStatus = "CANCELLED"
			return tx.Save(&suborder).Error
		})
		if err != nil {
			response.InternalError(c, "Không thể hoàn tồn kho khi hủy đơn")
			return
		}
	} else {
		suborder.FulfillmentStatus = req.FulfillmentStatus
		h.db.Save(&suborder)
	}
	response.Success(c, http.StatusOK, "Cập nhật tiến độ đơn thành công", suborder)
}

func (h *MarketplaceHandler) SupplierFinance(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return
	}
	var suborders []models.SubOrder
	h.db.Where("supplier_id = ?", profile.ID).Find(&suborders)
	var payouts []models.Payout
	h.db.Where("supplier_id = ?", profile.ID).Order("created_at desc").Find(&payouts)
	response.Success(c, http.StatusOK, "Lấy dữ liệu tài chính thành công", gin.H{"suborders": suborders, "payouts": payouts})
}

func (h *MarketplaceHandler) SupplierInventory(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return
	}
	var products []models.Product
	query := h.db.
		Preload("Category").
		Preload("Sport").
		Preload("Variants.Color").
		Preload("Variants.Size").
		Where("supplier_id = ?", profile.ID).
		Order("created_at desc")
	if search := c.Query("search"); search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}
	query.Find(&products)

	var totalStock, totalSold int
	for _, p := range products {
		totalStock += p.Stock
		totalSold += p.SoldCount
	}

	response.Success(c, http.StatusOK, "Lấy kho hàng thương hiệu thành công", gin.H{
		"items": products,
		"summary": gin.H{
			"total_products": len(products),
			"total_stock":    totalStock,
			"total_sold":     totalSold,
		},
	})
}

func (h *MarketplaceHandler) UpdateSupplierProductStock(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return
	}
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Product ID không hợp lệ", "")
		return
	}
	var product models.Product
	if err := h.db.Where("id = ? AND supplier_id = ?", productID, profile.ID).First(&product).Error; err != nil {
		response.NotFound(c, "Không tìm thấy sản phẩm thuộc thương hiệu")
		return
	}
	var req struct {
		Stock int `json:"stock" binding:"gte=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Số lượng tồn kho không hợp lệ", err.Error())
		return
	}
	if err := h.db.Model(&product).Update("stock", req.Stock).Error; err != nil {
		response.InternalError(c, "Không thể cập nhật tồn kho")
		return
	}
	product.Stock = req.Stock
	response.Success(c, http.StatusOK, "Cập nhật tồn kho thành công", product)
}

func (h *MarketplaceHandler) UpdateSupplierVariantStock(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return
	}
	variant, product, ok := h.variantFromParam(c)
	if !ok {
		return
	}
	if product.SupplierID != profile.ID {
		response.Forbidden(c, "Bạn không có quyền chỉnh sửa biến thể này")
		return
	}
	h.updateVariantStock(c, variant, product)
}
