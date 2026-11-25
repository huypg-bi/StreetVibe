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
	if err := db.AutoMigrate(
		&models.Category{},
		&models.Size{},
		&models.Color{},
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
	if err := seedCategoryGroups(db); err != nil {
		return nil, fmt.Errorf("category group initialization failed: %w", err)
	}

	log.Println("Product database connected and migrated successfully!")
	return db, nil
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
