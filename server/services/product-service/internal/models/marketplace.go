package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Size struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name      string         `gorm:"type:varchar(40);uniqueIndex;not null" json:"name"`
	SizeType  string         `gorm:"type:varchar(20);not null;default:'apparel';index" json:"size_type"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Sport struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name      string         `gorm:"type:varchar(80);uniqueIndex;not null" json:"name"`
	Slug      string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"slug"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Color struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name      string         `gorm:"type:varchar(80);not null" json:"name"`
	HexCode   string         `gorm:"type:varchar(7);not null" json:"hex_code"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type ProductVariant struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ProductID     uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	ColorID       uuid.UUID `gorm:"type:uuid;not null;index" json:"color_id"`
	SizeID        uuid.UUID `gorm:"type:uuid;not null;index" json:"size_id"`
	StockQuantity int       `gorm:"not null;default:0" json:"stock_quantity"`
	Color         *Color    `gorm:"foreignKey:ColorID" json:"color,omitempty"`
	Size          *Size     `gorm:"foreignKey:SizeID" json:"size,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type SupplierProfile struct {
	ID               uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID           uuid.UUID `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`
	BrandName        string    `gorm:"type:varchar(150);not null" json:"brand_name"`
	LogoURL          string    `gorm:"type:varchar(500)" json:"logo_url"`
	Description      string    `gorm:"type:text" json:"description"`
	WarehouseAddress string    `gorm:"type:text" json:"warehouse_address"`
	BankAccountInfo  string    `gorm:"type:text" json:"bank_account_info"`
	CommissionRate   float64   `gorm:"type:decimal(5,2);not null;default:10" json:"commission_rate"`
	Status           string    `gorm:"type:varchar(20);not null;default:'PENDING';index" json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type SubOrder struct {
	ID                uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	OrderID           uuid.UUID      `gorm:"type:uuid;not null;index" json:"order_id"`
	SupplierID        uuid.UUID      `gorm:"type:uuid;not null;index" json:"supplier_id"`
	Subtotal          float64        `gorm:"type:decimal(12,2);not null" json:"subtotal"`
	CommissionRate    float64        `gorm:"type:decimal(5,2);not null" json:"commission_rate"`
	CommissionAmount  float64        `gorm:"type:decimal(12,2);not null" json:"commission_amount"`
	NetPayout         float64        `gorm:"type:decimal(12,2);not null" json:"net_payout"`
	FulfillmentStatus string         `gorm:"type:varchar(20);not null;default:'PENDING';index" json:"fulfillment_status"`
	PayoutStatus      string         `gorm:"type:varchar(20);not null;default:'UNPAID';index" json:"payout_status"`
	Items             []SubOrderItem `gorm:"foreignKey:SubOrderID" json:"items,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

type SubOrderItem struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SubOrderID  uuid.UUID `gorm:"type:uuid;not null;index" json:"suborder_id"`
	VariantID   uuid.UUID `gorm:"type:uuid;not null" json:"variant_id"`
	ProductName string    `gorm:"type:varchar(200);not null" json:"product_name"`
	SKU         string    `gorm:"type:varchar(100)" json:"sku"`
	ColorName   string    `gorm:"type:varchar(80)" json:"color_name"`
	SizeName    string    `gorm:"type:varchar(40)" json:"size_name"`
	Quantity    int       `gorm:"not null" json:"quantity"`
	UnitPrice   float64   `gorm:"type:decimal(12,2);not null" json:"unit_price"`
	Subtotal    float64   `gorm:"type:decimal(12,2);not null" json:"subtotal"`
	CreatedAt   time.Time `json:"created_at"`
}

type Payout struct {
	ID              uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SupplierID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"supplier_id"`
	Amount          float64    `gorm:"type:decimal(12,2);not null" json:"amount"`
	Status          string     `gorm:"type:varchar(20);not null;default:'PENDING';index" json:"status"`
	TransactionNote string     `gorm:"type:text" json:"transaction_note"`
	PaidAt          *time.Time `json:"paid_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type Voucher struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code            string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	DiscountPercent float64   `gorm:"type:decimal(5,2);not null" json:"discount_percent"`
	MaxUses         int       `gorm:"not null;default:0" json:"max_uses"`
	UsedCount       int       `gorm:"not null;default:0" json:"used_count"`
	IsActive        bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Banner struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Title     string    `gorm:"type:varchar(200);not null" json:"title"`
	ImageURL  string    `gorm:"type:varchar(500);not null" json:"image_url"`
	LinkURL   string    `gorm:"type:varchar(500)" json:"link_url"`
	IsActive  bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
