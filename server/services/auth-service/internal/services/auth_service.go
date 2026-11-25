package services

import (
	"errors"

	"streetvibe/auth-service/internal/config"
	"streetvibe/auth-service/internal/models"
	"streetvibe/auth-service/internal/repositories"
	"streetvibe/shared/token"

	"github.com/google/uuid"
)

var (
	ErrUserAlreadyExists       = errors.New("user with this email already exists")
	ErrInvalidCredentials      = errors.New("invalid email or password")
	ErrUserNotFound            = errors.New("user not found")
	ErrCannotModifySelf        = errors.New("cannot modify or delete your own account")
	ErrSupplierRequestNotFound = errors.New("pending supplier request not found")
)

type AuthService interface {
	Register(name, email, password string, supplierRequest bool) (*AuthResponse, error)
	Login(email, password string) (*AuthResponse, error)
	RefreshToken(refreshToken string) (string, error)
	GetProfile(userID string) (*models.User, error)
	GetUsers(search, role string, page, limit int) ([]models.User, int64, error)
	UpdateUserRole(currentUserID, targetUserID string, role models.Role) error
	ApproveSupplierRequest(currentUserID, targetUserID string) error
	DeleteUser(currentUserID, targetUserID string) error
	CreateUserByAdmin(name, email, password string, role models.Role) (*models.User, error)
	UpdateCustomerStatus(targetUserID, status, note string) error
}

type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	User         *models.User `json:"user"`
}

type authService struct {
	repo repositories.UserRepository
	cfg  *config.Config
}

func NewAuthService(repo repositories.UserRepository, cfg *config.Config) AuthService {
	return &authService{repo: repo, cfg: cfg}
}

func (s *authService) Register(name, email, password string, supplierRequest bool) (*AuthResponse, error) {
	existing, err := s.repo.FindByEmail(email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrUserAlreadyExists
	}

	// First user registered becomes admin automatically
	count, _ := s.repo.Count()
	role := models.RoleCustomer
	if count == 0 {
		role = models.RoleAdmin
	}

	newUser := &models.User{
		Name:              name,
		Email:             email,
		Role:              role,
		SupplierRequested: supplierRequest && role == models.RoleCustomer,
	}
	if err := newUser.SetPassword(password); err != nil {
		return nil, err
	}

	if err := s.repo.Create(newUser); err != nil {
		return nil, err
	}

	accessToken, refreshToken, err := token.GenerateTokens(
		s.cfg.JWTSecret,
		newUser.ID.String(),
		newUser.Email,
		string(newUser.Role),
	)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         newUser,
	}, nil
}

func (s *authService) Login(email, password string) (*AuthResponse, error) {
	user, err := s.repo.FindByEmail(email)
	if err != nil {
		return nil, err
	}
	if user == nil || !user.CheckPassword(password) {
		return nil, ErrInvalidCredentials
	}

	accessToken, refreshToken, err := token.GenerateTokens(
		s.cfg.JWTSecret,
		user.ID.String(),
		user.Email,
		string(user.Role),
	)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}, nil
}

func (s *authService) RefreshToken(refreshTokenStr string) (string, error) {
	claims, err := token.ValidateToken(s.cfg.JWTSecret, refreshTokenStr)
	if err != nil {
		return "", err
	}

	newAccessToken, _, err := token.GenerateTokens(
		s.cfg.JWTSecret,
		claims.UserID,
		claims.Email,
		claims.Role,
	)
	return newAccessToken, err
}

func (s *authService) GetProfile(userID string) (*models.User, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("invalid user id format")
	}

	user, err := s.repo.FindByID(uid)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *authService) GetUsers(search, role string, page, limit int) ([]models.User, int64, error) {
	return s.repo.FindAll(search, role, page, limit)
}

func (s *authService) UpdateUserRole(currentUserID, targetUserID string, role models.Role) error {
	if currentUserID == targetUserID {
		return ErrCannotModifySelf
	}

	targetUID, err := uuid.Parse(targetUserID)
	if err != nil {
		return errors.New("invalid user id format")
	}

	user, err := s.repo.FindByID(targetUID)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrUserNotFound
	}

	return s.repo.UpdateRole(targetUID, role)
}

func (s *authService) ApproveSupplierRequest(currentUserID, targetUserID string) error {
	if currentUserID == targetUserID {
		return ErrCannotModifySelf
	}

	targetUID, err := uuid.Parse(targetUserID)
	if err != nil {
		return errors.New("invalid user id format")
	}

	user, err := s.repo.FindByID(targetUID)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrUserNotFound
	}
	if !user.SupplierRequested || user.Role != models.RoleCustomer {
		return ErrSupplierRequestNotFound
	}

	if err := s.repo.ApproveSupplierRequest(targetUID); err != nil {
		if errors.Is(err, repositories.ErrSupplierRequestNotFound) {
			return ErrSupplierRequestNotFound
		}
		return err
	}
	return nil
}

func (s *authService) DeleteUser(currentUserID, targetUserID string) error {
	if currentUserID == targetUserID {
		return ErrCannotModifySelf
	}

	targetUID, err := uuid.Parse(targetUserID)
	if err != nil {
		return errors.New("invalid user id format")
	}

	user, err := s.repo.FindByID(targetUID)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrUserNotFound
	}

	return s.repo.Delete(targetUID)
}

func (s *authService) UpdateCustomerStatus(targetUserID, status, note string) error {
	uid, err := uuid.Parse(targetUserID)
	if err != nil {
		return errors.New("invalid user id format")
	}
	if status != "ACTIVE" && status != "BLOCKED" {
		return errors.New("invalid customer status")
	}
	return s.repo.UpdateCustomerStatus(uid, status, note)
}

func (s *authService) CreateUserByAdmin(name, email, password string, role models.Role) (*models.User, error) {
	existing, err := s.repo.FindByEmail(email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrUserAlreadyExists
	}

	if role != models.RoleAdmin && role != models.RoleCustomer && role != models.RoleSupplier {
		role = models.RoleCustomer
	}

	newUser := &models.User{
		Name:  name,
		Email: email,
		Role:  role,
	}
	if err := newUser.SetPassword(password); err != nil {
		return nil, err
	}

	if err := s.repo.Create(newUser); err != nil {
		return nil, err
	}

	return newUser, nil
}
