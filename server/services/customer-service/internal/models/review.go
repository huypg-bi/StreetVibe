package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Review struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"_id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	UserName  string         `gorm:"type:varchar(100);not null" json:"user_name"`
	ProductID uuid.UUID      `gorm:"type:uuid;not null;index" json:"product_id"`
	Rating    int            `gorm:"type:smallint;not null;check:rating >= 1 AND rating <= 5" json:"rating"`
	Comment   string         `gorm:"type:text" json:"comment"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type ReviewUser struct {
	Name string `json:"name"`
}

type ReviewResponse struct {
	ID        uuid.UUID  `json:"_id"`
	Rating    int        `json:"rating"`
	Comment   string     `json:"comment"`
	User      ReviewUser `json:"user"`
	CreatedAt time.Time  `json:"created_at"`
}
