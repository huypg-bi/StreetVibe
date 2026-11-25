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
	ErrCategoryNotFound         = errors.New("category not found")
	ErrInvalidCategoryParent    = errors.New("invalid category parent")
	ErrCategoryHasSubcategories = errors.New("category has subcategories")
	ErrCategoryGroupProtected   = errors.New("category group names are reserved")
)

var categoryGroupNames = map[string]struct{}{
	"apparel":     {},
	"footwear":    {},
	"accessories": {},
}

func isCategoryGroup(category *models.Category) bool {
	if category == nil || category.ParentID != nil {
		return false
	}
	_, isGroup := categoryGroupNames[strings.ToLower(strings.TrimSpace(category.Name))]
	return isGroup
}

type CategoryService interface {
	CreateCategory(name, description, parentID string, isActive bool) (*models.Category, error)
	GetCategories(onlyActive bool) ([]models.Category, error)
	GetCategoryByID(id string) (*models.Category, error)
	UpdateCategory(id, name, description, parentID string, isActive bool) (*models.Category, error)
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

func (s *categoryService) resolveParent(parentID string, currentID *uuid.UUID) (*models.Category, error) {
	if strings.TrimSpace(parentID) == "" {
		return nil, nil
	}

	parentUUID, err := uuid.Parse(parentID)
	if err != nil || (currentID != nil && parentUUID == *currentID) {
		return nil, ErrInvalidCategoryParent
	}

	parent, err := s.repo.FindByID(parentUUID)
	if err != nil {
		return nil, err
	}
	if !isCategoryGroup(parent) {
		return nil, ErrInvalidCategoryParent
	}
	return parent, nil
}

func categorySlug(name string, parent *models.Category) string {
	if parent == nil {
		return makeSlug(name)
	}
	return makeSlug(parent.Slug + "-" + name)
}

func (s *categoryService) CreateCategory(name, description, parentID string, isActive bool) (*models.Category, error) {
	if strings.TrimSpace(parentID) == "" {
		return nil, ErrInvalidCategoryParent
	}
	if _, reserved := categoryGroupNames[strings.ToLower(strings.TrimSpace(name))]; reserved {
		return nil, ErrCategoryGroupProtected
	}
	parent, err := s.resolveParent(parentID, nil)
	if err != nil {
		return nil, err
	}
	cat := &models.Category{
		Name:        name,
		Slug:        categorySlug(name, parent),
		Parent:      parent,
		ParentID:    categoryParentID(parent),
		Description: description,
		IsActive:    isActive,
	}
	if err := s.repo.Create(cat); err != nil {
		return nil, err
	}
	return cat, nil
}

func categoryParentID(parent *models.Category) *uuid.UUID {
	if parent == nil {
		return nil
	}
	return &parent.ID
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

func (s *categoryService) UpdateCategory(idStr, name, description, parentID string, isActive bool) (*models.Category, error) {
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

	if isCategoryGroup(cat) {
		if strings.TrimSpace(parentID) != "" || !strings.EqualFold(strings.TrimSpace(name), cat.Name) {
			return nil, ErrCategoryGroupProtected
		}
	} else if strings.TrimSpace(parentID) == "" {
		return nil, ErrInvalidCategoryParent
	}
	parent, err := s.resolveParent(parentID, &uid)
	if err != nil {
		return nil, err
	}
	if parent != nil {
		hasChildren, err := s.repo.HasChildren(uid)
		if err != nil {
			return nil, err
		}
		if hasChildren {
			return nil, ErrInvalidCategoryParent
		}
	}
	cat.Name = name
	cat.Slug = categorySlug(name, parent)
	cat.Parent = parent
	cat.ParentID = categoryParentID(parent)
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
	category, err := s.repo.FindByID(uid)
	if err != nil {
		return err
	}
	if isCategoryGroup(category) {
		return ErrCategoryGroupProtected
	}
	hasChildren, err := s.repo.HasChildren(uid)
	if err != nil {
		return err
	}
	if hasChildren {
		return ErrCategoryHasSubcategories
	}
	return s.repo.Delete(uid)
}
