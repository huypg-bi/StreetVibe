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
)

type User struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name      string         `gorm:"type:varchar(100);not null" json:"name"`
	Email     string         `gorm:"type:varchar(150);uniqueIndex;not null" json:"email"`
	Password  string         `gorm:"type:varchar(255);not null" json:"-"`
	Role      Role           `gorm:"type:varchar(20);default:'customer'" json:"role"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
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
