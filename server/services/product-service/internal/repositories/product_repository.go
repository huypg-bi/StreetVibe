package repositories

import (
	"errors"

	"streetvibe/product-service/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductFilter struct {
	CategoryID string
	IsFeatured *bool
	MinPrice   *float64
	MaxPrice   *float64
	Search     string
	Sort       string
	Page       int
	Limit      int
}

type ProductRepository interface {
	Create(p *models.Product) error
	FindAll(filter ProductFilter) ([]models.Product, int64, error)
	FindByID(id uuid.UUID) (*models.Product, error)
	FindFeatured(limit int) ([]models.Product, error)
	FindBestSellers(categorySlug string, limit int) ([]models.Product, error)
	Update(p *models.Product) error
	PatchFlags(id uuid.UUID, isFeatured bool) error
	Delete(id uuid.UUID) error
}

type productRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ProductRepository {
	return &productRepository{db: db}
}

func (r *productRepository) Create(p *models.Product) error {
	return r.db.Create(p).Error
}

func (r *productRepository) FindAll(f ProductFilter) ([]models.Product, int64, error) {
	var products []models.Product
	var total int64

	query := r.db.Model(&models.Product{}).Preload("Category")

	if f.CategoryID != "" {
		if cid, err := uuid.Parse(f.CategoryID); err == nil {
			query = query.Where("category_id = ?", cid)
		}
	}
	if f.IsFeatured != nil {
		query = query.Where("is_featured = ?", *f.IsFeatured)
	}
	if f.MinPrice != nil {
		query = query.Where("price >= ?", *f.MinPrice)
	}
	if f.MaxPrice != nil {
		query = query.Where("price <= ?", *f.MaxPrice)
	}
	if f.Search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?", "%"+f.Search+"%", "%"+f.Search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sorting
	switch f.Sort {
	case "price_asc":
		query = query.Order("price asc")
	case "price_desc":
		query = query.Order("price desc")
	case "name_asc":
		query = query.Order("name asc")
	default:
		query = query.Order("created_at desc")
	}

	// Pagination
	page := f.Page
	if page < 1 {
		page = 1
	}
	limit := f.Limit
	if limit < 1 {
		limit = 12
	}
	offset := (page - 1) * limit

	err := query.Offset(offset).Limit(limit).Find(&products).Error
	return products, total, err
}

func (r *productRepository) FindByID(id uuid.UUID) (*models.Product, error) {
	var product models.Product
	err := r.db.Preload("Category").First(&product, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}

func (r *productRepository) FindFeatured(limit int) ([]models.Product, error) {
	var products []models.Product
	if limit <= 0 {
		limit = 8
	}
	err := r.db.Preload("Category").Where("is_featured = ?", true).Order("created_at desc").Limit(limit).Find(&products).Error
	return products, err
}

func (r *productRepository) FindBestSellers(categorySlug string, limit int) ([]models.Product, error) {
	var products []models.Product
	if limit <= 0 {
		limit = 8
	}
	query := r.db.Model(&models.Product{}).Preload("Category")
	if categorySlug != "" && categorySlug != "all" {
		query = query.Joins("JOIN categories ON categories.id = products.category_id").Where("categories.slug = ?", categorySlug)
	}
	err := query.Order("sold_count desc, created_at desc").Limit(limit).Find(&products).Error
	return products, err
}

func (r *productRepository) Update(p *models.Product) error {
	return r.db.Save(p).Error
}

func (r *productRepository) PatchFlags(id uuid.UUID, isFeatured bool) error {
	return r.db.Model(&models.Product{}).Where("id = ?", id).Update("is_featured", isFeatured).Error
}

func (r *productRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Product{}, "id = ?", id).Error
}
