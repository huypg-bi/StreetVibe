package models

import (
	"math"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Product struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SupplierID    uuid.UUID `gorm:"type:uuid;index" json:"supplier_id"`
	Name          string    `gorm:"type:varchar(200);not null" json:"name"`
	Brand         string    `gorm:"type:varchar(150);index" json:"brand"`
	SKU           string    `gorm:"type:varchar(60);index" json:"sku"`
	Fit           string    `gorm:"type:varchar(40);index" json:"fit"`
	Gender        string    `gorm:"type:varchar(10);not null;default:'Unisex'" json:"gender"` // Nam | Nữ | Unisex
	Slug          string    `gorm:"type:varchar(250);uniqueIndex;not null" json:"slug"`
	Description   string    `gorm:"type:text" json:"description"`
	Price         float64   `gorm:"type:decimal(12,2);not null" json:"price"`
	OriginalPrice float64   `gorm:"type:decimal(12,2);default:0" json:"original_price,omitempty"` // giá nhập, không trả cho khách
	// Chương trình giảm giá: % tính trên giá bán, chỉ áp dụng trong khoảng thời gian đã đặt
	DiscountPercent int        `gorm:"not null;default:0" json:"discount_percent"`
	DiscountStart   *time.Time `json:"discount_start"`
	DiscountEnd     *time.Time `json:"discount_end"`
	IsSoldOut       bool       `gorm:"-" json:"is_sold_out"`
	IsOnSale        bool       `gorm:"-" json:"is_on_sale"`
	SalePrice       float64    `gorm:"-" json:"sale_price"`
	Stock           int        `gorm:"not null;default:0" json:"stock"`
	SoldCount       int        `gorm:"default:0" json:"sold_count"`
	CartCount       int        `gorm:"not null;default:0" json:"cart_count"`
	TrendingScore   int        `gorm:"-" json:"trending_score"`
	IsHot           bool       `gorm:"-" json:"is_hot"`
	IsFeatured      bool       `gorm:"default:false" json:"is_featured"`
	Status          string     `gorm:"type:varchar(20);not null;default:'APPROVED';index" json:"status"`
	RejectionReason string     `gorm:"type:text" json:"rejection_reason"`
	Image           string     `gorm:"type:varchar(500)" json:"image"`
	Images          []string   `gorm:"serializer:json;type:jsonb" json:"images"`
	CategoryID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"category_id"`
	Category        *Category  `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	SportID         *uuid.UUID `gorm:"type:uuid;index" json:"sport_id"`
	Sport           *Sport     `gorm:"foreignKey:SportID" json:"sport,omitempty"`
	// constraint:- : sản phẩm do admin tạo không thuộc Supplier nào (supplier_id rỗng),
	// nên không tạo khoá ngoại ở DB; quan hệ này chỉ dùng để Preload.
	Supplier      *SupplierProfile `gorm:"foreignKey:SupplierID;constraint:-" json:"supplier,omitempty"`
	Variants      []ProductVariant `gorm:"foreignKey:ProductID" json:"variants,omitempty"`
	Colors        []Color          `gorm:"many2many:product_colors" json:"colors,omitempty"`
	AverageRating float64          `gorm:"type:decimal(3,2);default:5.0" json:"average_rating"`
	RatingCount   int              `gorm:"default:0" json:"rating_count"`
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`
	DeletedAt     gorm.DeletedAt   `gorm:"index" json:"-"`
}

const (
	GenderMale   = "Nam"
	GenderFemale = "Nữ"
	GenderUnisex = "Unisex"
)

// NormalizeGender đưa giá trị lạ hoặc để trống về Unisex.
func NormalizeGender(value string) string {
	if value == GenderMale || value == GenderFemale {
		return value
	}
	return GenderUnisex
}

// applyDiscount tính giá đang áp dụng tại thời điểm now.
func (p *Product) applyDiscount(now time.Time) {
	p.IsOnSale = p.DiscountPercent > 0 && p.DiscountStart != nil && p.DiscountEnd != nil &&
		!now.Before(*p.DiscountStart) && now.Before(*p.DiscountEnd)
	p.SalePrice = p.Price
	if p.IsOnSale {
		p.SalePrice = math.Round(p.Price * float64(100-p.DiscountPercent) / 100)
	}
}

func (p *Product) BeforeCreate(_ *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	if p.SKU == "" {
		p.SKU = BuildProductSKU(p.Brand, p.ID)
	}
	return nil
}

func (p *Product) AfterFind(tx *gorm.DB) error {
	// Hết hàng khi không còn biến thể (màu + size) nào có tồn kho, kể cả chưa đăng ký biến thể
	var available int64
	if err := tx.Session(&gorm.Session{NewDB: true}).Model(&ProductVariant{}).
		Where("product_id = ? AND stock_quantity > 0", p.ID).
		Count(&available).Error; err != nil {
		return err
	}
	p.IsSoldOut = available == 0
	p.TrendingScore = p.CartCount + p.SoldCount
	// HOT khi số đã bán đạt từ 50% số đang còn trong kho
	p.IsHot = p.SoldCount > 0 && p.SoldCount*2 >= p.Stock
	p.applyDiscount(time.Now())
	return nil
}
