package repositories

import (
	"errors"

	"streetvibe/customer-service/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WishlistRepository interface {
	FindByUser(userID uuid.UUID) ([]models.WishlistItem, error)
	FindItem(userID, productID uuid.UUID) (*models.WishlistItem, error)
	Add(item *models.WishlistItem) error
	Remove(userID, productID uuid.UUID) error
}

type wishlistRepository struct {
	db *gorm.DB
}

func NewWishlistRepository(db *gorm.DB) WishlistRepository {
	return &wishlistRepository{db: db}
}

func (r *wishlistRepository) FindByUser(userID uuid.UUID) ([]models.WishlistItem, error) {
	var items []models.WishlistItem
	err := r.db.Where("user_id = ?", userID).Order("created_at desc").Find(&items).Error
	return items, err
}

func (r *wishlistRepository) FindItem(userID, productID uuid.UUID) (*models.WishlistItem, error) {
	var item models.WishlistItem
	err := r.db.Where("user_id = ? AND product_id = ?", userID, productID).First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *wishlistRepository) Add(item *models.WishlistItem) error {
	return r.db.Create(item).Error
}

func (r *wishlistRepository) Remove(userID, productID uuid.UUID) error {
	return r.db.Where("user_id = ? AND product_id = ?", userID, productID).
		Delete(&models.WishlistItem{}).Error
}
