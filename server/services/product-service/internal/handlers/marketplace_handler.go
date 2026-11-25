package handlers

import (
	"net/http"
	"strconv"
	"time"

	"streetvibe/product-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MarketplaceHandler struct {
	db           *gorm.DB
	serviceToken string
}

func NewMarketplaceHandler(db *gorm.DB, serviceToken string) *MarketplaceHandler {
	return &MarketplaceHandler{db: db, serviceToken: serviceToken}
}

func (h *MarketplaceHandler) requireInternal(c *gin.Context) bool {
	if h.serviceToken != "" && c.GetHeader("X-Internal-Service-Token") == h.serviceToken {
		return true
	}
	response.Forbidden(c, "Yêu cầu nội bộ không hợp lệ")
	return false
}

func requireRole(c *gin.Context, role string) bool {
	if c.GetHeader("X-User-Role") == role {
		return true
	}
	if c.GetString("role") == role {
		return true
	}
	response.Forbidden(c, "Bạn không có quyền thực hiện thao tác này")
	return false
}

func (h *MarketplaceHandler) ListAttributes(c *gin.Context) {
	var sizes []models.Size
	var colors []models.Color
	h.db.Find(&sizes)
	h.db.Find(&colors)
	response.Success(c, http.StatusOK, "Lấy thuộc tính thành công", gin.H{"sizes": sizes, "colors": colors})
}

func (h *MarketplaceHandler) CreateSize(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Tên size không hợp lệ", err.Error())
		return
	}
	item := models.Size{Name: req.Name}
	if err := h.db.Create(&item).Error; err != nil {
		response.InternalError(c, "Không thể tạo size")
		return
	}
	response.Success(c, http.StatusCreated, "Tạo size thành công", item)
}

func (h *MarketplaceHandler) UpdateSize(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var item models.Size
	if err := h.db.First(&item, "id = ?", c.Param("id")).Error; err != nil {
		response.NotFound(c, "Không tìm thấy size")
		return
	}
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Tên size không hợp lệ", err.Error())
		return
	}
	item.Name = req.Name
	if err := h.db.Save(&item).Error; err != nil {
		response.InternalError(c, "Không thể cập nhật size")
		return
	}
	response.Success(c, http.StatusOK, "Cập nhật size thành công", item)
}

func (h *MarketplaceHandler) DeleteSize(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	if err := h.db.Delete(&models.Size{}, "id = ?", c.Param("id")).Error; err != nil {
		response.InternalError(c, "Không thể xóa size")
		return
	}
	response.Success(c, http.StatusOK, "Xóa size thành công", nil)
}

func (h *MarketplaceHandler) CreateColor(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var req struct {
		Name    string `json:"name" binding:"required"`
		HexCode string `json:"hex_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Màu không hợp lệ", err.Error())
		return
	}
	item := models.Color{Name: req.Name, HexCode: req.HexCode}
	if err := h.db.Create(&item).Error; err != nil {
		response.InternalError(c, "Không thể tạo màu")
		return
	}
	response.Success(c, http.StatusCreated, "Tạo màu thành công", item)
}

func (h *MarketplaceHandler) UpdateColor(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var item models.Color
	if err := h.db.First(&item, "id = ?", c.Param("id")).Error; err != nil {
		response.NotFound(c, "Không tìm thấy màu")
		return
	}
	var req struct {
		Name    string `json:"name" binding:"required"`
		HexCode string `json:"hex_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Màu không hợp lệ", err.Error())
		return
	}
	item.Name, item.HexCode = req.Name, req.HexCode
	h.db.Save(&item)
	response.Success(c, http.StatusOK, "Cập nhật màu thành công", item)
}

func (h *MarketplaceHandler) DeleteColor(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	h.db.Delete(&models.Color{}, "id = ?", c.Param("id"))
	response.Success(c, http.StatusOK, "Xóa màu thành công", nil)
}

func supplierProfileForUser(h *MarketplaceHandler, c *gin.Context) (*models.SupplierProfile, bool) {
	userID, err := uuid.Parse(c.GetHeader("X-User-Id"))
	if err != nil {
		response.Unauthorized(c, "Thiếu định danh nhà cung cấp")
		return nil, false
	}
	var profile models.SupplierProfile
	if err := h.db.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			profile = models.SupplierProfile{UserID: userID, BrandName: "BRAND-" + userID.String()[:8], Status: "APPROVED"}
			if err := h.db.Create(&profile).Error; err != nil {
				response.InternalError(c, "Không thể khởi tạo hồ sơ thương hiệu")
				return nil, false
			}
		} else {
			response.InternalError(c, "Không thể truy vấn hồ sơ thương hiệu")
			return nil, false
		}
	}
	return &profile, true
}

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
	SKU           string `json:"sku" binding:"required"`
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
	h.db.Preload("Category").Where("supplier_id = ?", profile.ID).Order("created_at desc").Find(&products)
	response.Success(c, http.StatusOK, "Lấy sản phẩm thương hiệu thành công", gin.H{"items": products})
}

func (h *MarketplaceHandler) CreateSupplierProduct(c *gin.Context) {
	if !requireRole(c, "supplier") {
		return
	}
	profile, ok := supplierProfileForUser(h, c)
	if !ok {
		return
	}
	var req struct {
		Name          string  `json:"name" binding:"required"`
		Fit           string  `json:"fit"`
		Description   string  `json:"description"`
		Price         float64 `json:"price" binding:"required,gt=0"`
		OriginalPrice float64 `json:"original_price"`
		Stock         int     `json:"stock"`
		Image         string  `json:"image"`
		CategoryID    string  `json:"category_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu sản phẩm không hợp lệ", err.Error())
		return
	}
	categoryID, err := uuid.Parse(req.CategoryID)
	if err != nil {
		response.BadRequest(c, "Category ID không hợp lệ", "")
		return
	}
	var category models.Category
	if err := h.db.First(&category, "id = ?", categoryID).Error; err != nil {
		response.BadRequest(c, "Danh mục không tồn tại", "")
		return
	}
	if req.OriginalPrice <= 0 {
		req.OriginalPrice = req.Price * 1.25
	}
	product := models.Product{
		SupplierID:    profile.ID,
		Name:          req.Name,
		Brand:         profile.BrandName,
		Fit:           req.Fit,
		Slug:          uuid.New().String(),
		Description:   req.Description,
		Price:         req.Price,
		OriginalPrice: req.OriginalPrice,
		Stock:         req.Stock,
		IsFeatured:    false,
		Status:        "PENDING",
		Image:         req.Image,
		CategoryID:    categoryID,
		AverageRating: 5,
	}
	if err := h.db.Create(&product).Error; err != nil {
		response.InternalError(c, "Không thể tạo sản phẩm")
		return
	}
	product.Category = &category
	response.Success(c, http.StatusCreated, "Tạo sản phẩm thành công và chờ duyệt", product)
}

func (h *MarketplaceHandler) CreateProductVariant(c *gin.Context) {
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
	var req []variantInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Biến thể không hợp lệ", err.Error())
		return
	}
	var variants []models.ProductVariant
	for _, input := range req {
		colorID, colorErr := uuid.Parse(input.ColorID)
		sizeID, sizeErr := uuid.Parse(input.SizeID)
		if colorErr != nil || sizeErr != nil {
			response.BadRequest(c, "Color hoặc Size không hợp lệ", "")
			return
		}
		variant := models.ProductVariant{ProductID: productID, ColorID: colorID, SizeID: sizeID, SKU: input.SKU, StockQuantity: input.StockQuantity}
		if err := h.db.Create(&variant).Error; err != nil {
			response.InternalError(c, "Không thể tạo biến thể: "+err.Error())
			return
		}
		variants = append(variants, variant)
	}
	product.Status = "PENDING"
	h.db.Save(&product)
	response.Success(c, http.StatusCreated, "Tạo ma trận biến thể thành công", gin.H{"items": variants})
}

func (h *MarketplaceHandler) AdminListProducts(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var products []models.Product
	query := h.db.Preload("Category").Order("created_at desc")
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if supplierID := c.Query("supplier_id"); supplierID != "" {
		query = query.Where("supplier_id = ?", supplierID)
	}
	query.Find(&products)
	response.Success(c, http.StatusOK, "Lấy danh sách kiểm duyệt thành công", gin.H{"items": products})
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

type reserveItem struct {
	VariantID   string  `json:"variant_id"`
	SupplierID  string  `json:"supplier_id"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	ProductName string  `json:"product_name"`
	SKU         string  `json:"sku"`
	ColorName   string  `json:"color_name"`
	SizeName    string  `json:"size_name"`
}

func (h *MarketplaceHandler) InternalReserveCheckout(c *gin.Context) {
	if !h.requireInternal(c) {
		return
	}
	var req struct {
		OrderID string        `json:"order_id" binding:"required"`
		Items   []reserveItem `json:"items" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu reserve không hợp lệ", err.Error())
		return
	}
	orderID, err := uuid.Parse(req.OrderID)
	if err != nil {
		response.BadRequest(c, "Order ID không hợp lệ", "")
		return
	}

	err = h.db.Transaction(func(tx *gorm.DB) error {
		grouped := map[uuid.UUID]float64{}
		groupedItems := map[uuid.UUID][]reserveItem{}
		for _, item := range req.Items {
			variantID, parseErr := uuid.Parse(item.VariantID)
			if parseErr != nil {
				continue
			}
			var variant models.ProductVariant
			if err := tx.First(&variant, "id = ?", variantID).Error; err != nil {
				return err
			}
			if variant.StockQuantity < item.Quantity {
				return gorm.ErrInvalidData
			}
			if err := tx.Model(&variant).Update("stock_quantity", variant.StockQuantity-item.Quantity).Error; err != nil {
				return err
			}
			if err := tx.Model(&models.Product{}).Where("id = ?", variant.ProductID).
				Updates(map[string]interface{}{
					"sold_count": gorm.Expr("sold_count + ?", item.Quantity),
				}).Error; err != nil {
				return err
			}
			supplierID, supplierErr := uuid.Parse(item.SupplierID)
			if supplierErr == nil {
				grouped[supplierID] += item.UnitPrice * float64(item.Quantity)
				groupedItems[supplierID] = append(groupedItems[supplierID], item)
			}
		}
		for supplierID, subtotal := range grouped {
			var profile models.SupplierProfile
			if err := tx.First(&profile, "id = ?", supplierID).Error; err != nil {
				return err
			}
			rate := profile.CommissionRate
			commission := subtotal * rate / 100
			suborder := models.SubOrder{
				OrderID:           orderID,
				SupplierID:        supplierID,
				Subtotal:          subtotal,
				CommissionRate:    rate,
				CommissionAmount:  commission,
				NetPayout:         subtotal - commission,
				FulfillmentStatus: "PENDING",
				PayoutStatus:      "UNPAID",
			}
			if err := tx.Create(&suborder).Error; err != nil {
				return err
			}
			for _, item := range groupedItems[supplierID] {
				variantID, _ := uuid.Parse(item.VariantID)
				suborderItem := models.SubOrderItem{
					SubOrderID:  suborder.ID,
					VariantID:   variantID,
					ProductName: item.ProductName,
					SKU:         item.SKU,
					ColorName:   item.ColorName,
					SizeName:    item.SizeName,
					Quantity:    item.Quantity,
					UnitPrice:   item.UnitPrice,
					Subtotal:    item.UnitPrice * float64(item.Quantity),
				}
				if err := tx.Create(&suborderItem).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		response.BadRequest(c, "Không đủ tồn kho hoặc dữ liệu variant không hợp lệ", err.Error())
		return
	}
	response.Success(c, http.StatusCreated, "Đã trừ tồn kho và tạo SubOrder", gin.H{"order_id": orderID})
}

func (h *MarketplaceHandler) RecordCartAdd(c *gin.Context) {
	if !h.requireInternal(c) {
		return
	}
	var req struct {
		ProductID string `json:"product_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Sản phẩm không hợp lệ", err.Error())
		return
	}
	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		response.BadRequest(c, "Product ID không hợp lệ", "")
		return
	}
	result := h.db.Model(&models.Product{}).Where("id = ? AND status = 'APPROVED'", productID).
		Update("cart_count", gorm.Expr("cart_count + 1"))
	if result.Error != nil {
		response.InternalError(c, "Không thể ghi nhận lượt thêm giỏ hàng")
		return
	}
	if result.RowsAffected == 0 {
		response.NotFound(c, "Không tìm thấy sản phẩm đang bán")
		return
	}
	response.Success(c, http.StatusOK, "Đã ghi nhận lượt thêm giỏ hàng", nil)
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
	if err := h.db.Preload("Category").
		Where("status = ?", "APPROVED").
		Order("(cart_count + sold_count) desc, sold_count desc, created_at desc").
		Limit(limit).Find(&products).Error; err != nil {
		response.InternalError(c, "Không thể lấy sản phẩm trending")
		return
	}
	response.Success(c, http.StatusOK, "Lấy sản phẩm trending thành công", gin.H{
		"items": products,
		"count": len(products),
	})
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

func (h *MarketplaceHandler) AdminListVouchers(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var vouchers []models.Voucher
	h.db.Order("created_at desc").Find(&vouchers)
	response.Success(c, http.StatusOK, "Lấy voucher thành công", gin.H{"items": vouchers})
}

func (h *MarketplaceHandler) AdminCreateVoucher(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var req struct {
		Code            string  `json:"code" binding:"required"`
		DiscountPercent float64 `json:"discount_percent" binding:"required,gt=0"`
		MaxUses         int     `json:"max_uses"`
		IsActive        bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu voucher không hợp lệ", err.Error())
		return
	}
	voucher := models.Voucher{Code: req.Code, DiscountPercent: req.DiscountPercent, MaxUses: req.MaxUses, IsActive: req.IsActive}
	if err := h.db.Create(&voucher).Error; err != nil {
		response.InternalError(c, "Không thể tạo voucher")
		return
	}
	response.Success(c, http.StatusCreated, "Tạo voucher thành công", voucher)
}

func (h *MarketplaceHandler) AdminDeleteVoucher(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	h.db.Delete(&models.Voucher{}, "id = ?", c.Param("id"))
	response.Success(c, http.StatusOK, "Xóa voucher thành công", nil)
}

func (h *MarketplaceHandler) AdminListBanners(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var banners []models.Banner
	h.db.Order("created_at desc").Find(&banners)
	response.Success(c, http.StatusOK, "Lấy banner thành công", gin.H{"items": banners})
}

func (h *MarketplaceHandler) AdminCreateBanner(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	var req struct {
		Title    string `json:"title" binding:"required"`
		ImageURL string `json:"image_url" binding:"required"`
		LinkURL  string `json:"link_url"`
		IsActive bool   `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu banner không hợp lệ", err.Error())
		return
	}
	banner := models.Banner{Title: req.Title, ImageURL: req.ImageURL, LinkURL: req.LinkURL, IsActive: req.IsActive}
	h.db.Create(&banner)
	response.Success(c, http.StatusCreated, "Tạo banner thành công", banner)
}

func (h *MarketplaceHandler) AdminDeleteBanner(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	h.db.Delete(&models.Banner{}, "id = ?", c.Param("id"))
	response.Success(c, http.StatusOK, "Xóa banner thành công", nil)
}
