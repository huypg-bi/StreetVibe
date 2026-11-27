package handlers

import (
	"errors"
	"net/http"

	"streetvibe/product-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var errDuplicateVariant = errors.New("variant already exists")

// syncProductStock đặt tồn kho sản phẩm bằng tổng tồn kho các biến thể.
func syncProductStock(tx *gorm.DB, productID uuid.UUID) error {
	var total int64
	if err := tx.Model(&models.ProductVariant{}).
		Where("product_id = ?", productID).
		Select("COALESCE(SUM(stock_quantity), 0)").
		Scan(&total).Error; err != nil {
		return err
	}
	return tx.Model(&models.Product{}).Where("id = ?", productID).Update("stock", int(total)).Error
}

// createVariants thêm ma trận biến thể cho product. newStatus rỗng thì giữ nguyên trạng thái duyệt.
func (h *MarketplaceHandler) createVariants(c *gin.Context, product models.Product, newStatus string) {
	var req []variantInput
	if err := c.ShouldBindJSON(&req); err != nil || len(req) == 0 {
		response.BadRequest(c, "Biến thể không hợp lệ")
		return
	}

	variants := make([]models.ProductVariant, 0, len(req))
	for _, input := range req {
		colorID, colorErr := uuid.Parse(input.ColorID)
		sizeID, sizeErr := uuid.Parse(input.SizeID)
		if colorErr != nil || sizeErr != nil {
			response.BadRequest(c, "Color hoặc Size không hợp lệ", "")
			return
		}
		if input.StockQuantity < 0 {
			response.BadRequest(c, "Tồn kho biến thể không được âm", "")
			return
		}
		variants = append(variants, models.ProductVariant{
			ProductID: product.ID, ColorID: colorID, SizeID: sizeID, StockQuantity: input.StockQuantity,
		})
	}

	// Lưu tất cả hoặc không lưu gì
	err := h.db.Transaction(func(tx *gorm.DB) error {
		for i := range variants {
			var existing int64
			if err := tx.Model(&models.ProductVariant{}).
				Where("product_id = ? AND color_id = ? AND size_id = ?", product.ID, variants[i].ColorID, variants[i].SizeID).
				Count(&existing).Error; err != nil {
				return err
			}
			if existing > 0 {
				return errDuplicateVariant
			}
			if err := tx.Create(&variants[i]).Error; err != nil {
				return err
			}
		}
		if err := syncProductStock(tx, product.ID); err != nil {
			return err
		}
		if newStatus != "" {
			return tx.Model(&models.Product{}).Where("id = ?", product.ID).Update("status", newStatus).Error
		}
		return nil
	})
	if errors.Is(err, errDuplicateVariant) {
		response.BadRequest(c, "Biến thể màu và size này đã tồn tại", "")
		return
	}
	if err != nil {
		response.InternalError(c, "Không thể tạo biến thể: "+err.Error())
		return
	}
	response.Success(c, http.StatusCreated, "Tạo ma trận biến thể thành công", gin.H{"items": variants})
}

var errInvalidVariantOption = errors.New("color or size not found")

type variantSyncInput struct {
	Upsert []variantInput `json:"upsert" binding:"dive"`
	Remove []string       `json:"remove"`
}

// syncVariants lưu thay đổi màu/size của sản phẩm trong một giao dịch: upsert thêm mới hoặc đặt
// lại tồn kho, remove xóa biến thể. Biến thể không được nhắc tới giữ nguyên, nên không ghi đè
// tồn kho vừa thay đổi do đơn hàng. statusIfAdded (nếu có) áp dụng khi xuất hiện biến thể mới.
func (h *MarketplaceHandler) syncVariants(c *gin.Context, product models.Product, statusIfAdded string) {
	var req variantSyncInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu màu và size không hợp lệ", err.Error())
		return
	}

	removeIDs := make([]uuid.UUID, 0, len(req.Remove))
	for _, raw := range req.Remove {
		id, err := uuid.Parse(raw)
		if err != nil {
			response.BadRequest(c, "Biến thể cần xóa không hợp lệ", "")
			return
		}
		removeIDs = append(removeIDs, id)
	}
	upserts := make([]models.ProductVariant, 0, len(req.Upsert))
	for _, input := range req.Upsert {
		colorID, colorErr := uuid.Parse(input.ColorID)
		sizeID, sizeErr := uuid.Parse(input.SizeID)
		if colorErr != nil || sizeErr != nil {
			response.BadRequest(c, "Color hoặc Size không hợp lệ", "")
			return
		}
		if input.StockQuantity < 0 {
			response.BadRequest(c, "Tồn kho biến thể không được âm", "")
			return
		}
		upserts = append(upserts, models.ProductVariant{
			ProductID: product.ID, ColorID: colorID, SizeID: sizeID, StockQuantity: input.StockQuantity,
		})
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if len(removeIDs) > 0 {
			if err := tx.Where("product_id = ? AND id IN ?", product.ID, removeIDs).
				Delete(&models.ProductVariant{}).Error; err != nil {
				return err
			}
		}
		added := false
		for i := range upserts {
			item := &upserts[i]
			var existing []models.ProductVariant
			if err := tx.Where("product_id = ? AND color_id = ? AND size_id = ?", product.ID, item.ColorID, item.SizeID).
				Limit(1).Find(&existing).Error; err != nil {
				return err
			}
			if len(existing) > 0 {
				if err := tx.Model(&existing[0]).Update("stock_quantity", item.StockQuantity).Error; err != nil {
					return err
				}
				continue
			}
			var colors, sizes int64
			if err := tx.Model(&models.Color{}).Where("id = ?", item.ColorID).Count(&colors).Error; err != nil {
				return err
			}
			if err := tx.Model(&models.Size{}).Where("id = ?", item.SizeID).Count(&sizes).Error; err != nil {
				return err
			}
			if colors == 0 || sizes == 0 {
				return errInvalidVariantOption
			}
			if err := tx.Create(item).Error; err != nil {
				return err
			}
			added = true
		}
		if len(removeIDs) > 0 || len(upserts) > 0 {
			if err := syncProductStock(tx, product.ID); err != nil {
				return err
			}
		}
		if added && statusIfAdded != "" {
			return tx.Model(&models.Product{}).Where("id = ?", product.ID).Update("status", statusIfAdded).Error
		}
		return nil
	})
	if errors.Is(err, errInvalidVariantOption) {
		response.BadRequest(c, "Màu hoặc size đã chọn không còn tồn tại", "")
		return
	}
	if err != nil {
		response.InternalError(c, "Không thể lưu màu và size: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Đã lưu màu và size", nil)
}

func (h *MarketplaceHandler) SyncAdminProductVariants(c *gin.Context) {
	product, ok := h.adminProduct(c)
	if !ok {
		return
	}
	h.syncVariants(c, product, "")
}

func (h *MarketplaceHandler) SyncSupplierProductVariants(c *gin.Context) {
	product, ok := h.ownedSupplierProduct(c)
	if !ok {
		return
	}
	// Thêm màu/size mới của Supplier cần Admin duyệt lại, giống khi tạo biến thể
	h.syncVariants(c, product, "PENDING")
}

// variantFromParam tìm biến thể theo :variant_id cùng sản phẩm của nó.
func (h *MarketplaceHandler) variantFromParam(c *gin.Context) (models.ProductVariant, models.Product, bool) {
	var variant models.ProductVariant
	var product models.Product
	variantID, err := uuid.Parse(c.Param("variant_id"))
	if err != nil {
		response.BadRequest(c, "Variant ID không hợp lệ", "")
		return variant, product, false
	}
	if err := h.db.First(&variant, "id = ?", variantID).Error; err != nil {
		response.NotFound(c, "Không tìm thấy biến thể")
		return variant, product, false
	}
	if err := h.db.First(&product, "id = ?", variant.ProductID).Error; err != nil {
		response.NotFound(c, "Không tìm thấy sản phẩm của biến thể")
		return variant, product, false
	}
	return variant, product, true
}

func (h *MarketplaceHandler) updateVariantStock(c *gin.Context, variant models.ProductVariant, product models.Product) {
	var req struct {
		StockQuantity int `json:"stock_quantity" binding:"gte=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Số lượng tồn kho biến thể không hợp lệ", err.Error())
		return
	}
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&variant).Update("stock_quantity", req.StockQuantity).Error; err != nil {
			return err
		}
		return syncProductStock(tx, product.ID)
	})
	if err != nil {
		response.InternalError(c, "Không thể cập nhật tồn kho biến thể")
		return
	}
	variant.StockQuantity = req.StockQuantity
	response.Success(c, http.StatusOK, "Cập nhật tồn kho biến thể thành công", variant)
}

// adminProduct tìm sản phẩm bất kỳ theo :id, chỉ dành cho Admin.
func (h *MarketplaceHandler) adminProduct(c *gin.Context) (models.Product, bool) {
	var product models.Product
	if !requireRole(c, "admin") {
		return product, false
	}
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Product ID không hợp lệ", "")
		return product, false
	}
	if err := h.db.First(&product, "id = ?", productID).Error; err != nil {
		response.NotFound(c, "Không tìm thấy sản phẩm")
		return product, false
	}
	return product, true
}

func (h *MarketplaceHandler) CreateAdminProductVariant(c *gin.Context) {
	product, ok := h.adminProduct(c)
	if !ok {
		return
	}
	h.createVariants(c, product, "")
}

func (h *MarketplaceHandler) UpdateAdminVariantStock(c *gin.Context) {
	if !requireRole(c, "admin") {
		return
	}
	variant, product, ok := h.variantFromParam(c)
	if !ok {
		return
	}
	h.updateVariantStock(c, variant, product)
}
