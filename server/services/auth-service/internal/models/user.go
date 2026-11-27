package models

import (
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Role string

const (
	RoleCustomer Role = "customer"
	RoleAdmin    Role = "admin"
	RoleSupplier Role = "supplier"
)

type User struct {
	ID                uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name              string         `gorm:"type:varchar(100);not null" json:"name"`
	Email             string         `gorm:"type:varchar(150);uniqueIndex;not null" json:"email"`
	Password          string         `gorm:"type:varchar(255);not null" json:"-"`
	Role              Role           `gorm:"type:varchar(20);default:'customer'" json:"role"`
	Status            string         `gorm:"type:varchar(20);not null;default:'ACTIVE';index" json:"status"`
	AdminNote         string         `gorm:"type:text" json:"admin_note"`
	SupplierRequested bool           `gorm:"not null;default:false;index" json:"supplier_requested"`
	AvatarURL         string         `gorm:"type:varchar(500)" json:"avatar_url"`
	Interests         []string       `gorm:"serializer:json;type:jsonb" json:"interests"`
	FavoriteBrands    []string       `gorm:"serializer:json;type:jsonb" json:"favorite_brands"`
	HeightCm          float64        `gorm:"type:decimal(5,2);default:0" json:"height_cm"`
	WeightKg          float64        `gorm:"type:decimal(5,2);default:0" json:"weight_kg"`
	Gender            string         `gorm:"type:varchar(20)" json:"gender"`
	BMI               float64        `gorm:"type:decimal(5,2);default:0" json:"bmi"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

func (u *User) SetPassword(rawPassword string) error {
	hashed, err := bcrypt.GenerateFromPassword([]byte(rawPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashed)
	return nil
}

func (u *User) CheckPassword(rawPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(rawPassword))
	return err == nil
}
