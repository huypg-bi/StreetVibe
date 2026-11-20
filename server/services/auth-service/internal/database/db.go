package database

import (
	"fmt"
	"log"

	"streetvibe/auth-service/internal/config"
	"streetvibe/auth-service/internal/models"

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

	// Auto Migrate
	log.Println("Migrating auth_db tables...")
	if err := db.AutoMigrate(&models.User{}); err != nil {
		return nil, fmt.Errorf("migration failed: %w", err)
	}

	log.Println("Database connection & migration successful!")
	return db, nil
}
