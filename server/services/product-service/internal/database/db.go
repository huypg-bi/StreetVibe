package database

import (
	"fmt"
	"log"

	"streetvibe/product-service/internal/config"
	"streetvibe/product-service/internal/models"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func ConnectDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Ho_Chi_Minh",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort, cfg.DBSSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Migrating product_db tables...")
	// Kiểm tra trước khi migrate: chỉ dọn giá gốc một lần, khi database chưa có cột giảm giá
	cleanAutoCost := db.Migrator().HasTable(&models.Product{}) &&
		!db.Migrator().HasColumn(&models.Product{}, "discount_percent")

	if err := db.AutoMigrate(
		&models.Category{},
		&models.Size{},
		&models.Color{},
		&models.Sport{},
		&models.Product{},
		&models.ProductVariant{},
		&models.SupplierProfile{},
		&models.SubOrder{},
		&models.SubOrderItem{},
		&models.Payout{},
		&models.Voucher{},
		&models.Banner{},
	); err != nil {
		return nil, fmt.Errorf("migration failed: %w", err)
	}
	if cleanAutoCost {
		if err := clearAutoFilledCost(db); err != nil {
			return nil, fmt.Errorf("cost price cleanup failed: %w", err)
		}
	}
	if err := seedCategoryGroups(db); err != nil {
		return nil, fmt.Errorf("category group initialization failed: %w", err)
	}
	if err := seedDefaultSizesAndSports(db); err != nil {
		return nil, fmt.Errorf("default sizes and sports initialization failed: %w", err)
	}

	if err := releaseVariantSKU(db); err != nil {
		return nil, fmt.Errorf("variant SKU migration failed: %w", err)
	}
	if err := backfillSKUs(db); err != nil {
		return nil, fmt.Errorf("SKU backfill failed: %w", err)
	}

	log.Println("Product database connected and migrated successfully!")
	return db, nil
}

// clearAutoFilledCost xóa giá gốc từng được hệ thống tự điền bằng 125% giá bán,
// vì giá gốc nay là giá nhập do Admin/Supplier tự nhập.
func clearAutoFilledCost(db *gorm.DB) error {
	return db.Exec("UPDATE products SET original_price = 0 WHERE ABS(original_price - price * 1.25) < 1").Error
}

func seedCategoryGroups(db *gorm.DB) error {
	groups := []models.Category{
		{Name: "Apparel", Slug: "apparel", IsActive: true},
		{Name: "Footwear", Slug: "footwear", IsActive: true},
		{Name: "Accessories", Slug: "accessories", IsActive: true},
	}
	groupIDs := make(map[string]uuid.UUID, len(groups))
	for i := range groups {
		group := &groups[i]
		err := db.Where("slug = ?", group.Slug).First(group).Error
		if err == gorm.ErrRecordNotFound {
			if err := db.Create(group).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else if group.ParentID != nil {
			group.ParentID = nil
			if err := db.Model(group).Update("parent_id", nil).Error; err != nil {
				return err
			}
		}
		groupIDs[group.Name] = group.ID
	}

	categoryGroups := map[string]string{
		"hoodie": "Apparel", "shirt": "Apparel", "t-shirt": "Apparel", "tshirt": "Apparel",
		"pants": "Apparel", "jeans": "Apparel", "shorts": "Apparel", "jacket": "Apparel",
		"sneaker": "Footwear", "sneakers": "Footwear", "shoe": "Footwear", "shoes": "Footwear",
		"sock": "Footwear", "socks": "Footwear", "sandals": "Footwear", "boots": "Footwear", "slippers": "Footwear",
		"bag": "Accessories", "bags": "Accessories", "belt": "Accessories", "hat": "Accessories",
		"cap": "Accessories", "wallet": "Accessories",
	}
	var categories []models.Category
	if err := db.Find(&categories).Error; err != nil {
		return err
	}
	for i := range categories {
		category := &categories[i]
		if category.ParentID != nil {
			continue
		}
		groupName, ok := categoryGroups[category.Slug]
		if !ok {
			continue
		}
		parentID := groupIDs[groupName]
		if err := db.Model(category).Update("parent_id", parentID).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedDefaultSizesAndSports(db *gorm.DB) error {
	// Ensure footwear sizes 37..45 exist with size_type = 'footwear'
	footwearSizes := []string{"37", "38", "39", "40", "41", "42", "43", "44", "45"}
	for _, sName := range footwearSizes {
		var existing models.Size
		// Unscoped: size Admin đã xóa vẫn giữ tên, tạo lại sẽ trùng khóa và service không khởi động được
		err := db.Unscoped().Where("name = ?", sName).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			if err := db.Create(&models.Size{Name: sName, SizeType: "footwear"}).Error; err != nil {
				return err
			}
		} else if err == nil && existing.SizeType != "footwear" {
			if err := db.Model(&existing).Update("size_type", "footwear").Error; err != nil {
				return err
			}
		}
	}

	// Ensure default sports exist if sports table is empty
	var sportCount int64
	if err := db.Unscoped().Model(&models.Sport{}).Count(&sportCount).Error; err != nil {
		return err
	}
	if sportCount == 0 {
		defaultSports := []models.Sport{
			{Name: "Chạy bộ", Slug: "chay-bo"},
			{Name: "Bóng rổ", Slug: "bong-ro"},
			{Name: "Tập Gym", Slug: "tap-gym"},
			{Name: "Đá bóng", Slug: "da-bong"},
			{Name: "Lifestyle", Slug: "lifestyle"},
		}
		for _, sp := range defaultSports {
			if err := db.Create(&sp).Error; err != nil {
				return err
			}
		}
	}
	return nil
}
