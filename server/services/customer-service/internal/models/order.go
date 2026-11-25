package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Order struct {
	ID              uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID          uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	TotalAmount     float64        `gorm:"type:decimal(12,2);not null" json:"total_amount"`
	PaymentStatus   string         `gorm:"type:varchar(20);not null;default:'UNPAID';index" json:"payment_status"`
	Status          string         `gorm:"type:varchar(20);not null;default:'PENDING';index" json:"status"`
	ShippingAddress string         `gorm:"type:text" json:"shipping_address"`
	OrderItems      []OrderItem    `gorm:"foreignKey:OrderID" json:"items,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

type OrderItem struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	OrderID     uuid.UUID `gorm:"type:uuid;not null;index" json:"order_id"`
	ProductID   uuid.UUID `gorm:"type:uuid;not null" json:"product_id"`
	SupplierID  uuid.UUID `gorm:"type:uuid;not null;index" json:"supplier_id"`
	VariantID   uuid.UUID `gorm:"type:uuid;index" json:"variant_id"`
	ProductName string    `gorm:"type:varchar(200);not null" json:"product_name"`
	SKU         string    `gorm:"type:varchar(100)" json:"sku"`
	ColorName   string    `gorm:"type:varchar(80)" json:"color_name"`
	SizeName    string    `gorm:"type:varchar(40)" json:"size_name"`
	Quantity    int       `gorm:"not null" json:"quantity"`
	UnitPrice   float64   `gorm:"type:decimal(12,2);not null" json:"unit_price"`
	Subtotal    float64   `gorm:"type:decimal(12,2);not null" json:"subtotal"`
	CreatedAt   time.Time `json:"created_at"`
}
