package repositories

import (
	"errors"

	"streetvibe/product-service/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CategoryRepository interface {
	Create(cat *models.Category) error
	FindAll(onlyActive bool) ([]models.Category, error)
	FindByID(id uuid.UUID) (*models.Category, error)
	FindBySlug(slug string) (*models.Category, error)
	HasChildren(id uuid.UUID) (bool, error)
	Update(cat *models.Category) error
	Delete(id uuid.UUID) error
}

type categoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) Create(cat *models.Category) error {
	return r.db.Create(cat).Error
}

func (r *categoryRepository) FindAll(onlyActive bool) ([]models.Category, error) {
	var categories []models.Category
	query := r.db.Preload("Parent").Order("name asc")
	if onlyActive {
		query = query.Where("is_active = ?", true)
	}
	err := query.Find(&categories).Error
	return categories, err
}

func (r *categoryRepository) FindByID(id uuid.UUID) (*models.Category, error) {
	var cat models.Category
	err := r.db.First(&cat, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &cat, nil
}

func (r *categoryRepository) FindBySlug(slug string) (*models.Category, error) {
	var cat models.Category
	err := r.db.First(&cat, "slug = ?", slug).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &cat, nil
}

func (r *categoryRepository) HasChildren(id uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Category{}).Where("parent_id = ?", id).Count(&count).Error
	return count > 0, err
}

func (r *categoryRepository) Update(cat *models.Category) error {
	return r.db.Save(cat).Error
}

func (r *categoryRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Category{}, "id = ?", id).Error
}
