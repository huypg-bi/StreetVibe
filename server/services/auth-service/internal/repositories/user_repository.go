package repositories

import (
	"errors"

	"streetvibe/auth-service/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrSupplierRequestNotFound = errors.New("pending supplier request not found")

type UserRepository interface {
	Create(user *models.User) error
	FindByEmail(email string) (*models.User, error)
	FindByID(id uuid.UUID) (*models.User, error)
	Count() (int64, error)
	FindAll(search string, role string, page, limit int) ([]models.User, int64, error)
	UpdateRole(id uuid.UUID, role models.Role) error
	ApproveSupplierRequest(id uuid.UUID) error
	Delete(id uuid.UUID) error
	UpdateCustomerStatus(id uuid.UUID, status, note string) error
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) FindByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.User{}).Count(&count).Error
	return count, err
}

func (r *userRepository) FindAll(search string, role string, page, limit int) ([]models.User, int64, error) {
	var users []models.User
	var total int64
	query := r.db.Model(&models.User{})

	if search != "" {
		likePattern := "%" + search + "%"
		query = query.Where("name ILIKE ? OR email ILIKE ?", likePattern, likePattern)
	}
	if role != "" {
		query = query.Where("role = ?", role)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}

	offset := (page - 1) * limit
	err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error
	return users, total, err
}

func (r *userRepository) UpdateRole(id uuid.UUID, role models.Role) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Update("role", role).Error
}

func (r *userRepository) ApproveSupplierRequest(id uuid.UUID) error {
	result := r.db.Model(&models.User{}).
		Where("id = ? AND role = ? AND supplier_requested = ?", id, models.RoleCustomer, true).
		Updates(map[string]interface{}{
			"role":               models.RoleSupplier,
			"supplier_requested": false,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrSupplierRequestNotFound
	}
	return nil
}

func (r *userRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.User{}, "id = ?", id).Error
}

func (r *userRepository) UpdateCustomerStatus(id uuid.UUID, status, note string) error {
	updates := map[string]interface{}{"status": status}
	if note != "" {
		updates["admin_note"] = note
	}
	return r.db.Model(&models.User{}).Where("id = ?", id).Updates(updates).Error
}
