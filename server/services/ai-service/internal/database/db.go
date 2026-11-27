package database

import (
	"fmt"
	"log"
	"regexp"

	"streetvibe/ai-service/internal/config"
	"streetvibe/ai-service/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var validName = regexp.MustCompile(`^[a-z0-9_]+$`)

func open(cfg *config.Config, name string, level logger.LogLevel) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Ho_Chi_Minh",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, name, cfg.DBPort, cfg.DBSSLMode,
	)
	return gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(level)})
}

// ensureDatabase tạo database nếu chưa có: init.sql chỉ chạy khi volume Postgres còn trống.
func ensureDatabase(cfg *config.Config) error {
	if !validName.MatchString(cfg.DBName) {
		return fmt.Errorf("tên database không hợp lệ: %q", cfg.DBName)
	}
	server, err := open(cfg, "postgres", logger.Silent)
	if err != nil {
		return err
	}
	if sqlDB, err := server.DB(); err == nil {
		defer sqlDB.Close()
	}
	var count int64
	if err := server.Raw("SELECT count(*) FROM pg_database WHERE datname = ?", cfg.DBName).Scan(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	log.Printf("Tạo database %s...", cfg.DBName)
	return server.Exec(`CREATE DATABASE "` + cfg.DBName + `"`).Error
}

func ConnectDB(cfg *config.Config) (*gorm.DB, error) {
	if err := ensureDatabase(cfg); err != nil {
		return nil, fmt.Errorf("failed to prepare database: %w", err)
	}
	db, err := open(cfg, cfg.DBName, logger.Warn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	if err := db.AutoMigrate(&models.AILog{}, &models.AIPrompt{}, &models.AISettings{}); err != nil {
		return nil, fmt.Errorf("migration failed: %w", err)
	}
	log.Println("AI database connected and migrated successfully!")
	return db, nil
}
