package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Category struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string         `gorm:"type:varchar(100);not null" json:"name"`
	Slug        string         `gorm:"type:varchar(150);uniqueIndex;not null" json:"slug"`
	ParentID    *uuid.UUID     `gorm:"type:uuid;index" json:"parent_id,omitempty"`
	Parent      *Category      `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Description string         `gorm:"type:text" json:"description"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	Products    []Product      `gorm:"foreignKey:CategoryID" json:"products,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
