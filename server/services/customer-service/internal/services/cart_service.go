package services

import (
	"errors"

	"streetvibe/customer-service/internal/models"
	"streetvibe/customer-service/internal/repositories"

	"github.com/google/uuid"
)

// Tên, giá, ảnh không nhận từ trình duyệt mà lấy từ Product Service.
type AddCartItemDTO struct {
	ProductID string `json:"product_id" binding:"required"`
	VariantID string `json:"variant_id" binding:"required"`
	Quantity  int    `json:"quantity"`
}

// VariantInfo là thông tin biến thể do Product Service xác nhận.
type VariantInfo struct {
	ProductName  string  `json:"product_name"`
	ProductImage string  `json:"product_image"`
	Price        float64 `json:"price"`
	ColorName    string  `json:"color_name"`
	SizeName     string  `json:"size_name"`
}

type CartService interface {
	GetCart(userID string) ([]models.CartItemResponse, error)
	GetItem(userID, itemID string) (*models.CartItem, error)
	QuantityInCart(userID, productID, variantID string) (int, error)
	SaveVariant(userID, productID, variantID string, quantity int, info VariantInfo) error
	UpdateQuantity(userID, itemID string, quantity int) error
	RemoveItem(userID, itemID string) error
	ClearCart(userID string) error
}

type cartService struct {
	repo repositories.CartRepository
}

func NewCartService(repo repositories.CartRepository) CartService {
	return &cartService{repo: repo}
}

func (s *cartService) GetCart(userIDStr string) ([]models.CartItemResponse, error) {
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user id format")
	}

	items, err := s.repo.FindByUser(uid)
	if err != nil {
		return nil, err
	}

	var res []models.CartItemResponse
	for _, it := range items {
		res = append(res, models.CartItemResponse{
			ID:       it.ID,
			Quantity: it.Quantity,
			Product: models.CartItemProduct{
				ID:    it.ProductID,
				Name:  it.ProductName,
				Price: it.ProductPrice,
				Image: it.ProductImage,
			},
			VariantID: it.VariantID,
			ColorName: it.ColorName,
			SizeName:  it.SizeName,
			CreatedAt: it.CreatedAt,
		})
	}
	return res, nil
}

func parseIDs(values ...string) ([]uuid.UUID, error) {
	ids := make([]uuid.UUID, len(values))
	for i, value := range values {
		id, err := uuid.Parse(value)
		if err != nil {
			return nil, errors.New("invalid id format")
		}
		ids[i] = id
	}
	return ids, nil
}

func (s *cartService) GetItem(userIDStr, itemIDStr string) (*models.CartItem, error) {
	ids, err := parseIDs(userIDStr, itemIDStr)
	if err != nil {
		return nil, err
	}
	return s.repo.FindByID(ids[0], ids[1])
}

func (s *cartService) QuantityInCart(userIDStr, productIDStr, variantIDStr string) (int, error) {
	ids, err := parseIDs(userIDStr, productIDStr, variantIDStr)
	if err != nil {
		return 0, err
	}
	item, err := s.repo.FindByVariant(ids[0], ids[1], ids[2])
	if err != nil || item == nil {
		return 0, err
	}
	return item.Quantity, nil
}

// SaveVariant đặt tổng số lượng của một biến thể trong giỏ.
func (s *cartService) SaveVariant(userIDStr, productIDStr, variantIDStr string, quantity int, info VariantInfo) error {
	ids, err := parseIDs(userIDStr, productIDStr, variantIDStr)
	if err != nil {
		return err
	}
	item, err := s.repo.FindByVariant(ids[0], ids[1], ids[2])
	if err != nil {
		return err
	}
	if item == nil {
		item = &models.CartItem{UserID: ids[0], ProductID: ids[1], VariantID: &ids[2]}
	}
	item.Quantity = quantity
	item.ProductName = info.ProductName
	item.ProductPrice = info.Price
	item.ProductImage = info.ProductImage
	item.ColorName = info.ColorName
	item.SizeName = info.SizeName
	return s.repo.Save(item)
}

func (s *cartService) UpdateQuantity(userIDStr, itemIDStr string, quantity int) error {
	ids, err := parseIDs(userIDStr, itemIDStr)
	if err != nil {
		return err
	}
	return s.repo.UpdateQuantity(ids[0], ids[1], quantity)
}

func (s *cartService) RemoveItem(userIDStr, itemIDStr string) error {
	ids, err := parseIDs(userIDStr, itemIDStr)
	if err != nil {
		return err
	}
	return s.repo.DeleteItem(ids[0], ids[1])
}

func (s *cartService) ClearCart(userIDStr string) error {
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user id format")
	}
	return s.repo.Clear(uid)
}
