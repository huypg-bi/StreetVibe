package services

import (
	"errors"

	"streetvibe/product-service/internal/models"
	"streetvibe/product-service/internal/repositories"

	"github.com/google/uuid"
)

var (
	ErrProductNotFound     = errors.New("product not found")
	ErrInvalidProductColor = errors.New("invalid product color id")
)

type ProductDTO struct {
	Name          string   `json:"name" binding:"required"`
	Brand         string   `json:"brand"`
	Fit           string   `json:"fit"`
	Description   string   `json:"description"`
	Price         float64  `json:"price" binding:"required,gt=0"`
	OriginalPrice float64  `json:"original_price"`
	Stock         int      `json:"stock" binding:"gte=0"`
	SoldCount     int      `json:"sold_count"`
	IsFeatured    bool     `json:"is_featured"`
	Image         string   `json:"image"`
	CategoryID    string   `json:"category_id" binding:"required"`
	ColorIDs      []string `json:"color_ids"`
}

type ProductPaginationResult struct {
	Items      []models.Product `json:"items"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
	TotalPages int              `json:"total_pages"`
}

type ProductService interface {
	CreateProduct(dto *ProductDTO) (*models.Product, error)
	GetProducts(filter repositories.ProductFilter) (*ProductPaginationResult, error)
	GetApprovedBrands() ([]string, error)
	GetProductByID(id string) (*models.Product, error)
	GetFeaturedProducts(limit int) ([]models.Product, error)
	GetBestSellers(categorySlug string, limit int) ([]models.Product, error)
	UpdateProduct(id string, dto *ProductDTO) (*models.Product, error)
	PatchProductFlags(id string, isFeatured bool) error
	DeleteProduct(id string) error
}

type productService struct {
	repo    repositories.ProductRepository
	catRepo repositories.CategoryRepository
}

func NewProductService(repo repositories.ProductRepository, catRepo repositories.CategoryRepository) ProductService {
	return &productService{repo: repo, catRepo: catRepo}
}

func productColors(colorIDs []string) ([]models.Color, error) {
	colors := make([]models.Color, 0, len(colorIDs))
	seen := make(map[uuid.UUID]struct{}, len(colorIDs))
	for _, colorID := range colorIDs {
		id, err := uuid.Parse(colorID)
		if err != nil {
			return nil, ErrInvalidProductColor
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		colors = append(colors, models.Color{ID: id})
	}
	return colors, nil
}

func (s *productService) CreateProduct(dto *ProductDTO) (*models.Product, error) {
	catID, err := uuid.Parse(dto.CategoryID)
	if err != nil {
		return nil, errors.New("invalid category_id")
	}

	cat, err := s.catRepo.FindByID(catID)
	if err != nil {
		return nil, err
	}
	if cat == nil {
		return nil, errors.New("category does not exist")
	}

	colors, err := productColors(dto.ColorIDs)
	if err != nil {
		return nil, err
	}

	origPrice := dto.OriginalPrice
	if origPrice <= 0 {
		origPrice = dto.Price * 1.25 // Default 25% discount markup if not provided
	}

	product := &models.Product{
		Name:          dto.Name,
		Brand:         dto.Brand,
		Fit:           dto.Fit,
		Slug:          makeSlug(dto.Name) + "-" + uuid.New().String()[:8],
		Description:   dto.Description,
		Price:         dto.Price,
		OriginalPrice: origPrice,
		Stock:         dto.Stock,
		SoldCount:     dto.SoldCount,
		IsFeatured:    dto.IsFeatured,
		Image:         dto.Image,
		CategoryID:    catID,
		Colors:        colors,
		AverageRating: 5.0,
	}

	if err := s.repo.Create(product); err != nil {
		return nil, err
	}

	product.Category = cat
	return product, nil
}

func (s *productService) GetProducts(f repositories.ProductFilter) (*ProductPaginationResult, error) {
	items, total, err := s.repo.FindAll(f)
	if err != nil {
		return nil, err
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 12
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	return &ProductPaginationResult{
		Items:      items,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (s *productService) GetApprovedBrands() ([]string, error) {
	return s.repo.FindApprovedBrands()
}

func (s *productService) GetProductByID(idStr string) (*models.Product, error) {
	uid, err := uuid.Parse(idStr)
	if err != nil {
		return nil, errors.New("invalid product id format")
	}
	product, err := s.repo.FindByID(uid)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, ErrProductNotFound
	}
	return product, nil
}

func (s *productService) GetFeaturedProducts(limit int) ([]models.Product, error) {
	return s.repo.FindFeatured(limit)
}

func (s *productService) GetBestSellers(categorySlug string, limit int) ([]models.Product, error) {
	return s.repo.FindBestSellers(categorySlug, limit)
}

func (s *productService) UpdateProduct(idStr string, dto *ProductDTO) (*models.Product, error) {
	uid, err := uuid.Parse(idStr)
	if err != nil {
		return nil, errors.New("invalid product id format")
	}
	product, err := s.repo.FindByID(uid)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, ErrProductNotFound
	}

	catID, err := uuid.Parse(dto.CategoryID)
	if err != nil {
		return nil, errors.New("invalid category_id")
	}

	product.Name = dto.Name
	product.Brand = dto.Brand
	product.Fit = dto.Fit
	product.Description = dto.Description
	product.Price = dto.Price
	if dto.OriginalPrice > 0 {
		product.OriginalPrice = dto.OriginalPrice
	}
	product.Stock = dto.Stock
	product.SoldCount = dto.SoldCount
	product.IsFeatured = dto.IsFeatured
	if dto.Image != "" {
		product.Image = dto.Image
	}
	product.CategoryID = catID
	if dto.ColorIDs != nil {
		colors, err := productColors(dto.ColorIDs)
		if err != nil {
			return nil, err
		}
		product.Colors = colors
	}

	if err := s.repo.Update(product); err != nil {
		return nil, err
	}
	return product, nil
}

func (s *productService) PatchProductFlags(idStr string, isFeatured bool) error {
	uid, err := uuid.Parse(idStr)
	if err != nil {
		return errors.New("invalid product id format")
	}
	return s.repo.PatchFlags(uid, isFeatured)
}

func (s *productService) DeleteProduct(idStr string) error {
	uid, err := uuid.Parse(idStr)
	if err != nil {
		return errors.New("invalid product id format")
	}
	return s.repo.Delete(uid)
}
