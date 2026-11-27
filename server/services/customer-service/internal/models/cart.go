package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CartItem struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID       uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	ProductID    uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	ProductName  string    `gorm:"type:varchar(200);not null" json:"product_name"`
	ProductPrice float64   `gorm:"type:decimal(12,2);not null" json:"product_price"`
	ProductImage string    `gorm:"type:varchar(500)" json:"product_image"`
	Quantity     int       `gorm:"not null;default:1" json:"quantity"`
	// Biến thể khách chọn; rỗng với sản phẩm bỏ giỏ trước khi có chọn màu và size
	VariantID *uuid.UUID     `gorm:"type:uuid;index" json:"variant_id"`
	ColorName string         `gorm:"type:varchar(80)" json:"color_name"`
	SizeName  string         `gorm:"type:varchar(40)" json:"size_name"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Format expected by Frontend React: item.product.name, item.product.price, item.product.image
type CartItemResponse struct {
	ID        uuid.UUID       `json:"id"`
	Quantity  int             `json:"quantity"`
	Product   CartItemProduct `json:"product"`
	VariantID *uuid.UUID      `json:"variant_id"`
	ColorName string          `json:"color_name"`
	SizeName  string          `json:"size_name"`
	CreatedAt time.Time       `json:"created_at"`
}

type CartItemProduct struct {
	ID    uuid.UUID `json:"_id"`
	Name  string    `json:"name"`
	Price float64   `json:"price"`
	Image string    `json:"image"`
}
