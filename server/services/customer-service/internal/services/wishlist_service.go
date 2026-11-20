package services

import (
	"errors"

	"streetvibe/customer-service/internal/models"
	"streetvibe/customer-service/internal/repositories"

	"github.com/google/uuid"
)

type AddWishlistDTO struct {
	ProductID    string  `json:"product_id" binding:"required"`
	ProductName  string  `json:"product_name"`
	ProductPrice float64 `json:"product_price"`
	ProductImage string  `json:"product_image"`
}

type WishlistService interface {
	GetWishlist(userID string) ([]models.WishlistItemResponse, error)
	AddToWishlist(userID string, dto *AddWishlistDTO) error
	RemoveFromWishlist(userID string, productID string) error
}

type wishlistService struct {
	repo repositories.WishlistRepository
}

func NewWishlistService(repo repositories.WishlistRepository) WishlistService {
	return &wishlistService{repo: repo}
}

func (s *wishlistService) GetWishlist(userIDStr string) ([]models.WishlistItemResponse, error) {
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user id format")
	}

	items, err := s.repo.FindByUser(uid)
	if err != nil {
		return nil, err
	}

	var res []models.WishlistItemResponse
	for _, it := range items {
		res = append(res, models.WishlistItemResponse{
			ID:    it.ProductID,
			Name:  it.ProductName,
			Price: it.ProductPrice,
			Image: it.ProductImage,
		})
	}
	return res, nil
}

func (s *wishlistService) AddToWishlist(userIDStr string, dto *AddWishlistDTO) error {
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user id format")
	}
	pid, err := uuid.Parse(dto.ProductID)
	if err != nil {
		return errors.New("invalid product id format")
	}

	existing, err := s.repo.FindItem(uid, pid)
	if err != nil {
		return err
	}
	if existing != nil {
		return nil // already wishlisted
	}

	newItem := &models.WishlistItem{
		UserID:       uid,
		ProductID:    pid,
		ProductName:  dto.ProductName,
		ProductPrice: dto.ProductPrice,
		ProductImage: dto.ProductImage,
	}
	return s.repo.Add(newItem)
}

func (s *wishlistService) RemoveFromWishlist(userIDStr, productIDStr string) error {
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user id format")
	}
	pid, err := uuid.Parse(productIDStr)
	if err != nil {
		return errors.New("invalid product id format")
	}

	return s.repo.Remove(uid, pid)
}
