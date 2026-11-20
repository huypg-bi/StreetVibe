package services

import (
	"errors"

	"streetvibe/customer-service/internal/models"
	"streetvibe/customer-service/internal/repositories"

	"github.com/google/uuid"
)

type AddReviewDTO struct {
	Rating  int    `json:"rating" binding:"required,min=1,max=5"`
	Comment string `json:"comment"`
}

type ReviewService interface {
	GetProductReviews(productID string) ([]models.ReviewResponse, error)
	AddOrUpdateReview(userID string, userName string, productID string, dto *AddReviewDTO) (*models.ReviewResponse, error)
}

type reviewService struct {
	repo repositories.ReviewRepository
}

func NewReviewService(repo repositories.ReviewRepository) ReviewService {
	return &reviewService{repo: repo}
}

func (s *reviewService) GetProductReviews(productIDStr string) ([]models.ReviewResponse, error) {
	pid, err := uuid.Parse(productIDStr)
	if err != nil {
		return nil, errors.New("invalid product id format")
	}

	reviews, err := s.repo.FindByProduct(pid)
	if err != nil {
		return nil, err
	}

	var res []models.ReviewResponse
	for _, r := range reviews {
		res = append(res, models.ReviewResponse{
			ID:      r.ID,
			Rating:  r.Rating,
			Comment: r.Comment,
			User: models.ReviewUser{
				Name: r.UserName,
			},
			CreatedAt: r.CreatedAt,
		})
	}
	return res, nil
}

func (s *reviewService) AddOrUpdateReview(userIDStr, userName, productIDStr string, dto *AddReviewDTO) (*models.ReviewResponse, error) {
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user id format")
	}
	pid, err := uuid.Parse(productIDStr)
	if err != nil {
		return nil, errors.New("invalid product id format")
	}

	if userName == "" {
		userName = "Anonymous"
	}

	existing, err := s.repo.FindUserReview(uid, pid)
	if err != nil {
		return nil, err
	}

	if existing != nil {
		existing.Rating = dto.Rating
		existing.Comment = dto.Comment
		existing.UserName = userName
		if err := s.repo.Save(existing); err != nil {
			return nil, err
		}
		return &models.ReviewResponse{
			ID:      existing.ID,
			Rating:  existing.Rating,
			Comment: existing.Comment,
			User:    models.ReviewUser{Name: userName},
		}, nil
	}

	newReview := &models.Review{
		UserID:    uid,
		UserName:  userName,
		ProductID: pid,
		Rating:    dto.Rating,
		Comment:   dto.Comment,
	}
	if err := s.repo.Save(newReview); err != nil {
		return nil, err
	}

	return &models.ReviewResponse{
		ID:      newReview.ID,
		Rating:  newReview.Rating,
		Comment: newReview.Comment,
		User:    models.ReviewUser{Name: userName},
	}, nil
}
