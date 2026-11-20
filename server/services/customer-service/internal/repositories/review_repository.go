package repositories

import (
	"errors"

	"streetvibe/customer-service/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ReviewRepository interface {
	FindByProduct(productID uuid.UUID) ([]models.Review, error)
	FindUserReview(userID, productID uuid.UUID) (*models.Review, error)
	Save(review *models.Review) error
}

type reviewRepository struct {
	db *gorm.DB
}

func NewReviewRepository(db *gorm.DB) ReviewRepository {
	return &reviewRepository{db: db}
}

func (r *reviewRepository) FindByProduct(productID uuid.UUID) ([]models.Review, error) {
	var reviews []models.Review
	err := r.db.Where("product_id = ?", productID).Order("created_at desc").Find(&reviews).Error
	return reviews, err
}

func (r *reviewRepository) FindUserReview(userID, productID uuid.UUID) (*models.Review, error) {
	var review models.Review
	err := r.db.Where("user_id = ? AND product_id = ?", userID, productID).First(&review).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &review, nil
}

func (r *reviewRepository) Save(review *models.Review) error {
	return r.db.Save(review).Error
}
