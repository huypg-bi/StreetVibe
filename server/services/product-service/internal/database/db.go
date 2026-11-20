package database

import (
	"fmt"
	"log"

	"streetvibe/product-service/internal/config"
	"streetvibe/product-service/internal/models"

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
	if err := db.AutoMigrate(&models.Category{}, &models.Product{}); err != nil {
		return nil, fmt.Errorf("migration failed: %w", err)
	}

	log.Println("Product database connected and migrated successfully!")
	return db, nil
}
