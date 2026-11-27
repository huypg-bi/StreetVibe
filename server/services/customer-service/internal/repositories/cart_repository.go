package repositories

import (
	"errors"

	"streetvibe/customer-service/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CartRepository interface {
	FindByUser(userID uuid.UUID) ([]models.CartItem, error)
	FindByID(userID, itemID uuid.UUID) (*models.CartItem, error)
	FindByVariant(userID, productID, variantID uuid.UUID) (*models.CartItem, error)
	Save(item *models.CartItem) error
	UpdateQuantity(userID, itemID uuid.UUID, quantity int) error
	DeleteItem(userID, itemID uuid.UUID) error
	Clear(userID uuid.UUID) error
}

type cartRepository struct {
	db *gorm.DB
}

func NewCartRepository(db *gorm.DB) CartRepository {
	return &cartRepository{db: db}
}

func (r *cartRepository) FindByUser(userID uuid.UUID) ([]models.CartItem, error) {
	var items []models.CartItem
	err := r.db.Where("user_id = ?", userID).Order("created_at desc").Find(&items).Error
	return items, err
}

func (r *cartRepository) findOne(query string, args ...interface{}) (*models.CartItem, error) {
	var item models.CartItem
	err := r.db.Where(query, args...).First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *cartRepository) FindByID(userID, itemID uuid.UUID) (*models.CartItem, error) {
	return r.findOne("user_id = ? AND id = ?", userID, itemID)
}

func (r *cartRepository) FindByVariant(userID, productID, variantID uuid.UUID) (*models.CartItem, error) {
	return r.findOne("user_id = ? AND product_id = ? AND variant_id = ?", userID, productID, variantID)
}

func (r *cartRepository) Save(item *models.CartItem) error {
	return r.db.Save(item).Error
}

func (r *cartRepository) UpdateQuantity(userID, itemID uuid.UUID, quantity int) error {
	return r.db.Model(&models.CartItem{}).
		Where("user_id = ? AND id = ?", userID, itemID).
		Update("quantity", quantity).Error
}

func (r *cartRepository) DeleteItem(userID, itemID uuid.UUID) error {
	return r.db.Where("user_id = ? AND id = ?", userID, itemID).
		Delete(&models.CartItem{}).Error
}

func (r *cartRepository) Clear(userID uuid.UUID) error {
	return r.db.Where("user_id = ?", userID).Delete(&models.CartItem{}).Error
}
