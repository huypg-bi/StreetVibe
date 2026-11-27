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
	ErrTooManyImages       = errors.New("a product can have at most 5 images")
)

const maxProductImages = 5

type ProductDTO struct {
	Name          string   `json:"name" binding:"required"`
	Brand         string   `json:"brand"`
	Fit           string   `json:"fit"`
	Description   string   `json:"description"`
	Price         float64  `json:"price" binding:"required,gt=0"`
	OriginalPrice float64  `json:"original_price"`
	Stock         int      `json:"stock" binding:"gte=0"`
	Image         string   `json:"image"`
	Images        []string `json:"images"`
	CategoryID    string   `json:"category_id" binding:"required"`
	SportID       string   `json:"sport_id"`
	ColorIDs      []string `json:"color_ids"`
	Gender        string   `json:"gender"`
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

	if len(dto.Images) > maxProductImages {
		return nil, ErrTooManyImages
	}
	if len(dto.Images) > 0 {
		dto.Image = dto.Images[0]
	}

	var sportID *uuid.UUID
	if dto.SportID != "" {
		if sid, err := uuid.Parse(dto.SportID); err == nil {
			sportID = &sid
		}
	}

	product := &models.Product{
		Name:          dto.Name,
		Brand:         dto.Brand,
		Fit:           dto.Fit,
		Gender:        models.NormalizeGender(dto.Gender),
		Slug:          makeSlug(dto.Name) + "-" + uuid.New().String()[:8],
		Description:   dto.Description,
		Price:         dto.Price,
		OriginalPrice: dto.OriginalPrice,
		Stock:         dto.Stock,
		Image:         dto.Image,
		Images:        dto.Images,
		CategoryID:    catID,
		SportID:       sportID,
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
	// Client không gửi trường này thì giữ giá trị đang có
	if dto.Gender != "" {
		product.Gender = models.NormalizeGender(dto.Gender)
	}
	product.Description = dto.Description
	product.Price = dto.Price
	if dto.OriginalPrice > 0 {
		product.OriginalPrice = dto.OriginalPrice
	}
	// Có biến thể thì tồn kho là tổng các biến thể, không sửa trực tiếp
	if len(product.Variants) == 0 {
		product.Stock = dto.Stock
	}
	if len(dto.Images) > maxProductImages {
		return nil, ErrTooManyImages
	}
	if len(dto.Images) > 0 {
		dto.Image = dto.Images[0]
	}
	if dto.Image != "" {
		product.Image = dto.Image
	}
	if dto.Images != nil {
		product.Images = dto.Images
	}
	product.CategoryID = catID
	// Bỏ quan hệ đã preload để GORM không ghi đè khóa ngoại mới bằng giá trị cũ
	product.Category = nil
	product.Sport = nil
	if dto.SportID != "" {
		if sid, err := uuid.Parse(dto.SportID); err == nil {
			product.SportID = &sid
		}
	} else {
		product.SportID = nil
	}
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

func (s *productService) DeleteProduct(idStr string) error {
	uid, err := uuid.Parse(idStr)
	if err != nil {
		return errors.New("invalid product id format")
	}
	return s.repo.Delete(uid)
}
