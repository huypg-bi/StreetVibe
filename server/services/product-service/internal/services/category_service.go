package services

import (
	"errors"
	"regexp"
	"strings"

	"streetvibe/product-service/internal/models"
	"streetvibe/product-service/internal/repositories"

	"github.com/google/uuid"
)

var (
	ErrCategoryNotFound = errors.New("category not found")
)

type CategoryService interface {
	CreateCategory(name, description string, isActive bool) (*models.Category, error)
	GetCategories(onlyActive bool) ([]models.Category, error)
	GetCategoryByID(id string) (*models.Category, error)
	UpdateCategory(id, name, description string, isActive bool) (*models.Category, error)
	DeleteCategory(id string) error
}

type categoryService struct {
	repo repositories.CategoryRepository
}

func NewCategoryService(repo repositories.CategoryRepository) CategoryService {
	return &categoryService{repo: repo}
}

func makeSlug(input string) string {
	s := strings.ToLower(input)
	re := regexp.MustCompile(`[^a-z0-9]+`)
	s = re.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

func (s *categoryService) CreateCategory(name, description string, isActive bool) (*models.Category, error) {
	cat := &models.Category{
		Name:        name,
		Slug:        makeSlug(name),
		Description: description,
		IsActive:    isActive,
	}
	if err := s.repo.Create(cat); err != nil {
		return nil, err
	}
	return cat, nil
}

func (s *categoryService) GetCategories(onlyActive bool) ([]models.Category, error) {
	return s.repo.FindAll(onlyActive)
}

func (s *categoryService) GetCategoryByID(idStr string) (*models.Category, error) {
	uid, err := uuid.Parse(idStr)
	if err != nil {
		return nil, errors.New("invalid category id format")
	}
	cat, err := s.repo.FindByID(uid)
	if err != nil {
		return nil, err
	}
	if cat == nil {
		return nil, ErrCategoryNotFound
	}
	return cat, nil
}

func (s *categoryService) UpdateCategory(idStr, name, description string, isActive bool) (*models.Category, error) {
	uid, err := uuid.Parse(idStr)
	if err != nil {
		return nil, errors.New("invalid category id format")
	}
	cat, err := s.repo.FindByID(uid)
	if err != nil {
		return nil, err
	}
	if cat == nil {
		return nil, ErrCategoryNotFound
	}

	cat.Name = name
	cat.Slug = makeSlug(name)
	cat.Description = description
	cat.IsActive = isActive

	if err := s.repo.Update(cat); err != nil {
		return nil, err
	}
	return cat, nil
}

func (s *categoryService) DeleteCategory(idStr string) error {
	uid, err := uuid.Parse(idStr)
	if err != nil {
		return errors.New("invalid category id format")
	}
	return s.repo.Delete(uid)
}
