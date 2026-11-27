// Package ai quản lý cấu hình, giới hạn, phiên bản prompt và nhật ký của các tính năng AI.
package ai

import (
	"errors"
	"sync"
	"time"

	"streetvibe/ai-service/internal/llm"
	"streetvibe/ai-service/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const FeatureOutfit = "outfit"

const (
	WindowDay   = "day"
	WindowTotal = "total"
)

// Giờ Việt Nam để mốc "hôm nay" khớp với người dùng
var vnZone = time.FixedZone("ICT", 7*60*60)

type Service struct {
	db           *gorm.DB
	defaultModel string

	mu     sync.Mutex
	recent []time.Time // thời điểm các yêu cầu gọi model trong 60 giây gần nhất
}

func NewService(db *gorm.DB, defaultModel string) *Service {
	return &Service{db: db, defaultModel: defaultModel}
}

func startOfDay(t time.Time) time.Time {
	y, m, d := t.In(vnZone).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, vnZone)
}

func startOfMonth(t time.Time) time.Time {
	y, m, _ := t.In(vnZone).Date()
	return time.Date(y, m, 1, 0, 0, 0, 0, vnZone)
}

// defaultSettings dùng giá công bố của Groq (USD / 1 triệu token); Admin chỉnh được.
func (s *Service) defaultSettings() models.AISettings {
	fallback := "openai/gpt-oss-120b"
	if s.defaultModel == fallback {
		fallback = "openai/gpt-oss-20b"
	}
	return models.AISettings{
		ID: 1, Enabled: true, Model: s.defaultModel, FallbackModel: fallback,
		DailyBudgetUSD: 0.5, MonthlyBudgetUSD: 5, DailyTokenLimit: 200000, RequestsPerMinute: 20,
		OutfitLimit: 3, OutfitLimitWindow: WindowDay,
		Prices: map[string]models.ModelPrice{
			"openai/gpt-oss-20b":  {Input: 0.075, Cached: 0.0375, Output: 0.30},
			"openai/gpt-oss-120b": {Input: 0.15, Cached: 0.075, Output: 0.60},
		},
	}
}

func (s *Service) Settings() (models.AISettings, error) {
	var settings models.AISettings
	err := s.db.First(&settings, "id = 1").Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		settings = s.defaultSettings()
		// Hai yêu cầu đầu tiên cùng tạo thì yêu cầu sau bỏ qua
		err = s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&settings).Error
	}
	return settings, err
}

func (s *Service) SaveSettings(settings models.AISettings) error {
	settings.ID = 1
	return s.db.Save(&settings).Error
}

// ---------- Phiên bản prompt ----------

func (s *Service) Prompts() ([]models.AIPrompt, error) {
	if _, err := s.ActivePrompt(); err != nil {
		return nil, err
	}
	var prompts []models.AIPrompt
	err := s.db.Order("version desc").Find(&prompts).Error
	return prompts, err
}

func (s *Service) ActivePrompt() (models.AIPrompt, error) {
	var prompt models.AIPrompt
	err := s.db.Where("active = ?", true).Order("version desc").First(&prompt).Error
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return prompt, err
	}
	prompt = models.AIPrompt{Version: 1, Content: llm.DefaultPrompt, Note: "Phiên bản đầu tiên", Active: true, CreatedBy: "system"}
	if err := s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&prompt).Error; err != nil {
		return prompt, err
	}
	err = s.db.Where("active = ?", true).Order("version desc").First(&prompt).Error
	return prompt, err
}

// CreatePrompt luôn tạo phiên bản mới, không sửa đè phiên bản cũ.
func (s *Service) CreatePrompt(content, note, createdBy string, activate bool) (models.AIPrompt, error) {
	if _, err := s.ActivePrompt(); err != nil {
		return models.AIPrompt{}, err
	}
	var created models.AIPrompt
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext('ai_prompts'))").Error; err != nil {
			return err
		}
		var latest int
		if err := tx.Model(&models.AIPrompt{}).Select("COALESCE(MAX(version), 0)").Scan(&latest).Error; err != nil {
			return err
		}
		created = models.AIPrompt{Version: latest + 1, Content: content, Note: note, CreatedBy: createdBy}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}
		if !activate {
			return nil
		}
		created.Active = true
		return activatePrompt(tx, created.ID)
	})
	return created, err
}

func activatePrompt(tx *gorm.DB, id uint) error {
	if err := tx.Model(&models.AIPrompt{}).Where("active = ?", true).Update("active", false).Error; err != nil {
		return err
	}
	result := tx.Model(&models.AIPrompt{}).Where("id = ?", id).Update("active", true)
	if result.Error == nil && result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return result.Error
}

func (s *Service) ActivatePrompt(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error { return activatePrompt(tx, id) })
}

// ---------- Giới hạn lượt theo IP ----------

func (s *Service) quotaQuery(db *gorm.DB, ip string, settings models.AISettings) *gorm.DB {
	query := db.Model(&models.AILog{}).Where("client_ip = ? AND feature = ? AND counts_quota = ?", ip, FeatureOutfit, true)
	if settings.OutfitLimitWindow != WindowTotal {
		query = query.Where("created_at >= ?", startOfDay(time.Now()))
	}
	return query
}

func (s *Service) Used(ip string, settings models.AISettings) (int, error) {
	var used int64
	err := s.quotaQuery(s.db, ip, settings).Count(&used).Error
	return int(used), err
}

// Reserve giữ một lượt trước khi gọi AI. Khóa theo IP để nhiều yêu cầu đồng thời không vượt hạn mức.
func (s *Service) Reserve(entry *models.AILog, settings models.AISettings) (bool, int, error) {
	reserved, used := false, 0
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext(?))", "outfit:"+entry.ClientIP).Error; err != nil {
			return err
		}
		var count int64
		if err := s.quotaQuery(tx, entry.ClientIP, settings).Count(&count).Error; err != nil {
			return err
		}
		used = int(count)
		if used >= settings.OutfitLimit {
			return nil
		}
		entry.CountsQuota, entry.Status = true, models.AIStatusPending
		if err := tx.Create(entry).Error; err != nil {
			return err
		}
		reserved, used = true, used+1
		return nil
	})
	return reserved, used, err
}

func (s *Service) ResetQuota(ip string) error {
	return s.db.Model(&models.AILog{}).Where("client_ip = ? AND counts_quota = ?", ip, true).
		Update("counts_quota", false).Error
}

// ---------- Ngân sách và tốc độ ----------

type Spending struct {
	TodayCost   float64 `json:"today_cost_usd"`
	MonthCost   float64 `json:"month_cost_usd"`
	TodayTokens int     `json:"today_tokens"`
}

func (s *Service) Spending() (Spending, error) {
	var spending Spending
	now := time.Now()
	err := s.db.Model(&models.AILog{}).Where("created_at >= ?", startOfDay(now)).
		Select("COALESCE(SUM(cost_usd), 0), COALESCE(SUM(prompt_tokens + completion_tokens), 0)").
		Row().Scan(&spending.TodayCost, &spending.TodayTokens)
	if err != nil {
		return spending, err
	}
	err = s.db.Model(&models.AILog{}).Where("created_at >= ?", startOfMonth(now)).
		Select("COALESCE(SUM(cost_usd), 0)").Row().Scan(&spending.MonthCost)
	return spending, err
}

// BudgetBlock trả lý do ngắt gọi model, hoặc chuỗi rỗng nếu còn trong hạn mức.
func BudgetBlock(settings models.AISettings, spending Spending) (code, message string) {
	switch {
	case !settings.Enabled:
		return "disabled", "Admin đang tắt AI"
	case settings.DailyBudgetUSD > 0 && spending.TodayCost >= settings.DailyBudgetUSD:
		return "daily_budget", "Đã chạm ngân sách ngày"
	case settings.MonthlyBudgetUSD > 0 && spending.MonthCost >= settings.MonthlyBudgetUSD:
		return "monthly_budget", "Đã chạm ngân sách tháng"
	case settings.DailyTokenLimit > 0 && spending.TodayTokens >= settings.DailyTokenLimit:
		return "daily_tokens", "Đã chạm giới hạn token ngày"
	}
	return "", ""
}

// AllowRequest giới hạn số yêu cầu gọi model trong 60 giây (0 = không giới hạn).
func (s *Service) AllowRequest(limit int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.prune()
	if limit > 0 && len(s.recent) >= limit {
		return false
	}
	s.recent = append(s.recent, time.Now())
	return true
}

func (s *Service) RequestsLastMinute() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.prune()
	return len(s.recent)
}

func (s *Service) prune() {
	cutoff := time.Now().Add(-time.Minute)
	for len(s.recent) > 0 && s.recent[0].Before(cutoff) {
		s.recent = s.recent[1:]
	}
}

// Cost tính USD của một lần gọi theo bảng giá; model chưa có giá tính là 0.
func Cost(prices map[string]models.ModelPrice, model string, usage llm.Usage) float64 {
	price := prices[model]
	cached := min(usage.CachedTokens, usage.PromptTokens)
	return (float64(usage.PromptTokens-cached)*price.Input +
		float64(cached)*price.Cached +
		float64(usage.CompletionTokens)*price.Output) / 1_000_000
}

// ---------- Nhật ký ----------

func (s *Service) Create(entry *models.AILog) error { return s.db.Create(entry).Error }

func (s *Service) Save(entry *models.AILog) error { return s.db.Save(entry).Error }

// Feedback chỉ nhận từ đúng IP đã tạo lượt đó.
func (s *Service) Feedback(id uuid.UUID, ip string, vote int) error {
	result := s.db.Model(&models.AILog{}).
		Where("id = ? AND client_ip = ? AND status = ?", id, ip, models.AIStatusSuccess).
		Update("feedback", vote)
	if result.Error == nil && result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return result.Error
}
