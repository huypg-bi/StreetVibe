package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WishlistItem struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID       uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	ProductID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"product_id"`
	ProductName  string         `gorm:"type:varchar(200);not null" json:"name"`
	ProductPrice float64        `gorm:"type:decimal(12,2);not null" json:"price"`
	ProductImage string         `gorm:"type:varchar(500)" json:"image"`
	CreatedAt    time.Time      `json:"created_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type WishlistItemResponse struct {
	ID    uuid.UUID `json:"_id"`
	Name  string    `json:"name"`
	Price float64   `json:"price"`
	Image string    `json:"image"`
}
