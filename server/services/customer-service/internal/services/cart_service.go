package services

import (
	"errors"

	"streetvibe/customer-service/internal/models"
	"streetvibe/customer-service/internal/repositories"

	"github.com/google/uuid"
)

type AddCartItemDTO struct {
	ProductID    string  `json:"product_id" binding:"required"`
	ProductName  string  `json:"product_name"`
	ProductPrice float64 `json:"product_price"`
	ProductImage string  `json:"product_image"`
	Quantity     int     `json:"quantity"`
}

type CartService interface {
	GetCart(userID string) ([]models.CartItemResponse, error)
	AddToCart(userID string, dto *AddCartItemDTO) error
	UpdateQuantity(userID string, productID string, quantity int) error
	RemoveItem(userID string, productID string) error
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
			CreatedAt: it.CreatedAt,
		})
	}
	return res, nil
}

func (s *cartService) AddToCart(userIDStr string, dto *AddCartItemDTO) error {
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user id format")
	}
	pid, err := uuid.Parse(dto.ProductID)
	if err != nil {
		return errors.New("invalid product id format")
	}

	qty := dto.Quantity
	if qty <= 0 {
		qty = 1
	}

	existing, err := s.repo.FindItem(uid, pid)
	if err != nil {
		return err
	}

	if existing != nil {
		existing.Quantity += qty
		if dto.ProductPrice > 0 {
			existing.ProductPrice = dto.ProductPrice
		}
		if dto.ProductName != "" {
			existing.ProductName = dto.ProductName
		}
		if dto.ProductImage != "" {
			existing.ProductImage = dto.ProductImage
		}
		return s.repo.Save(existing)
	}

	newItem := &models.CartItem{
		UserID:       uid,
		ProductID:    pid,
		ProductName:  dto.ProductName,
		ProductPrice: dto.ProductPrice,
		ProductImage: dto.ProductImage,
		Quantity:     qty,
	}
	return s.repo.Save(newItem)
}

func (s *cartService) UpdateQuantity(userIDStr, productIDStr string, quantity int) error {
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user id format")
	}
	pid, err := uuid.Parse(productIDStr)
	if err != nil {
		return errors.New("invalid product id format")
	}

	if quantity <= 0 {
		return s.repo.DeleteItem(uid, pid)
	}

	return s.repo.UpdateQuantity(uid, pid, quantity)
}

func (s *cartService) RemoveItem(userIDStr, productIDStr string) error {
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user id format")
	}
	pid, err := uuid.Parse(productIDStr)
	if err != nil {
		return errors.New("invalid product id format")
	}

	return s.repo.DeleteItem(uid, pid)
}

func (s *cartService) ClearCart(userIDStr string) error {
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user id format")
	}
	return s.repo.Clear(uid)
}
