package database

import (
	"streetvibe/product-service/internal/models"

	"gorm.io/gorm"
)

// releaseVariantSKU bỏ ràng buộc NOT NULL của cột sku cũ ở biến thể.
// Cột được giữ lại để không mất dữ liệu nhưng hệ thống không dùng nữa.
func releaseVariantSKU(db *gorm.DB) error {
	if !db.Migrator().HasColumn(&models.ProductVariant{}, "sku") {
		return nil
	}
	return db.Exec("ALTER TABLE product_variants ALTER COLUMN sku DROP NOT NULL").Error
}

// backfillSKUs cấp SKU cho sản phẩm cũ chưa có mã.
// Sản phẩm đã có SKU được bỏ qua, nên mã không đổi ở các lần khởi động sau.
func backfillSKUs(db *gorm.DB) error {
	var products []models.Product
	if err := db.Unscoped().Where("sku IS NULL OR sku = ''").Find(&products).Error; err != nil {
		return err
	}

	for _, product := range products {
		if err := db.Unscoped().Model(&models.Product{}).
			Where("id = ?", product.ID).
			UpdateColumn("sku", models.BuildProductSKU(product.Brand, product.ID)).Error; err != nil {
			return err
		}
	}
	return nil
}
