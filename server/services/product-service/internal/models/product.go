package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Product struct {
	ID              uuid.UUID        `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SupplierID      uuid.UUID        `gorm:"type:uuid;index" json:"supplier_id"`
	Name            string           `gorm:"type:varchar(200);not null" json:"name"`
	Brand           string           `gorm:"type:varchar(150);index" json:"brand"`
	Fit             string           `gorm:"type:varchar(40);index" json:"fit"`
	Slug            string           `gorm:"type:varchar(250);uniqueIndex;not null" json:"slug"`
	Description     string           `gorm:"type:text" json:"description"`
	Price           float64          `gorm:"type:decimal(12,2);not null" json:"price"`
	OriginalPrice   float64          `gorm:"type:decimal(12,2);default:0" json:"original_price"`
	Stock           int              `gorm:"not null;default:0" json:"stock"`
	SoldCount       int              `gorm:"default:0" json:"sold_count"`
	CartCount       int              `gorm:"not null;default:0" json:"cart_count"`
	TrendingScore   int              `gorm:"-" json:"trending_score"`
	IsHot           bool             `gorm:"-" json:"is_hot"`
	IsFeatured      bool             `gorm:"default:false" json:"is_featured"`
	Status          string           `gorm:"type:varchar(20);not null;default:'APPROVED';index" json:"status"`
	RejectionReason string           `gorm:"type:text" json:"rejection_reason"`
	Image           string           `gorm:"type:varchar(500)" json:"image"`
	CategoryID      uuid.UUID        `gorm:"type:uuid;not null;index" json:"category_id"`
	Category        *Category        `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Variants        []ProductVariant `gorm:"foreignKey:ProductID" json:"variants,omitempty"`
	Colors          []Color          `gorm:"many2many:product_colors" json:"colors,omitempty"`
	AverageRating   float64          `gorm:"type:decimal(3,2);default:5.0" json:"average_rating"`
	RatingCount     int              `gorm:"default:0" json:"rating_count"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
	DeletedAt       gorm.DeletedAt   `gorm:"index" json:"-"`
}

func (p *Product) AfterFind(_ *gorm.DB) error {
	p.TrendingScore = p.CartCount + p.SoldCount
	p.IsHot = p.IsFeatured
	return nil
}
