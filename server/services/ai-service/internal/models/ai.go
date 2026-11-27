package models

import (
	"time"

	"streetvibe/shared/aiapi"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Trạng thái một lượt dùng AI
const (
	AIStatusSuccess = "success" // AI (hoặc cache) trả kết quả
	AIStatusFailed  = "failed"  // gọi model lỗi, trả kết quả theo bộ lọc
	AIStatusBlocked = "blocked" // bị chặn bởi công tắc / ngân sách / giới hạn tốc độ
	AIStatusQuota   = "quota"   // khách hết lượt theo IP
	AIStatusPending = "pending"
)

// AITraceStep là một bước trong dấu vết, dùng chung định dạng với service gọi sang.
type AITraceStep = aiapi.TraceStep

// AILog lưu mỗi lượt dùng tính năng AI: chi phí, hiệu năng, chất lượng và dấu vết từng bước.
type AILog struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
	Feature   string    `gorm:"type:varchar(40);not null;index" json:"feature"`
	UserID    string    `gorm:"type:varchar(64)" json:"user_id"`
	UserEmail string    `gorm:"type:varchar(200)" json:"user_email"`
	UserRole  string    `gorm:"type:varchar(20)" json:"user_role"`
	ClientIP  string    `gorm:"type:varchar(64);index" json:"client_ip"`
	ProductID string    `gorm:"type:varchar(64)" json:"product_id"`

	Status        string `gorm:"type:varchar(20);not null;index" json:"status"`
	Source        string `gorm:"type:varchar(10)" json:"source"` // ai | cache | rule
	Model         string `gorm:"type:varchar(100)" json:"model"`
	PromptVersion int    `json:"prompt_version"`
	CacheHit      bool   `json:"cache_hit"`
	Attempts      int    `json:"attempts"`
	FallbackUsed  bool   `json:"fallback_used"`
	ErrorType     string `gorm:"type:varchar(40)" json:"error_type"`
	ErrorMessage  string `gorm:"type:text" json:"error_message"`

	PromptTokens     int     `json:"prompt_tokens"`
	CachedTokens     int     `json:"cached_tokens"`
	CompletionTokens int     `json:"completion_tokens"`
	ReasoningTokens  int     `json:"reasoning_tokens"`
	CostUSD          float64 `json:"cost_usd"`

	QueueMs      float64 `json:"queue_ms"`
	PromptMs     float64 `json:"prompt_ms"`
	CompletionMs float64 `json:"completion_ms"`
	LatencyMs    float64 `json:"latency_ms"` // thời gian chờ model
	TotalMs      float64 `json:"total_ms"`   // cả yêu cầu

	FormatResponses int           `json:"format_responses"`
	FormatValid     int           `json:"format_valid"`
	Flags           []string      `gorm:"serializer:json;type:jsonb" json:"flags"`
	Reason          string        `gorm:"type:text" json:"reason"`
	Question        string        `gorm:"type:text" json:"question"`
	Steps           []AITraceStep `gorm:"serializer:json;type:jsonb" json:"steps"`
	Feedback        int           `json:"feedback"` // 1 thích, -1 không thích
	CountsQuota     bool          `gorm:"index" json:"counts_quota"`
}

func (AILog) TableName() string { return "ai_logs" }

func (l *AILog) BeforeCreate(_ *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
}

// AIPrompt là một phiên bản system prompt; chỉ một phiên bản đang dùng.
type AIPrompt struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Version   int       `gorm:"uniqueIndex;not null" json:"version"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	Note      string    `gorm:"type:varchar(300)" json:"note"`
	Active    bool      `gorm:"not null;default:false" json:"active"`
	CreatedBy string    `gorm:"type:varchar(200)" json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
}

func (AIPrompt) TableName() string { return "ai_prompts" }

// ModelPrice là giá USD cho 1 triệu token.
type ModelPrice struct {
	Input  float64 `json:"input"`
	Cached float64 `json:"cached"`
	Output float64 `json:"output"`
}

// AISettings chỉ có một dòng (ID = 1).
type AISettings struct {
	ID                int                   `gorm:"primaryKey" json:"-"`
	Enabled           bool                  `json:"enabled"`
	Model             string                `gorm:"type:varchar(100)" json:"model"`
	FallbackModel     string                `gorm:"type:varchar(100)" json:"fallback_model"`
	DailyBudgetUSD    float64               `json:"daily_budget_usd"`   // 0 = không giới hạn
	MonthlyBudgetUSD  float64               `json:"monthly_budget_usd"` // 0 = không giới hạn
	DailyTokenLimit   int                   `json:"daily_token_limit"`  // 0 = không giới hạn
	RequestsPerMinute int                   `json:"requests_per_minute"`
	OutfitLimit       int                   `json:"outfit_limit"`                                // số lượt tạo outfit mỗi IP
	OutfitLimitWindow string                `gorm:"type:varchar(10)" json:"outfit_limit_window"` // day | total
	Prices            map[string]ModelPrice `gorm:"serializer:json;type:jsonb" json:"prices"`
	UpdatedAt         time.Time             `json:"updated_at"`
}

func (AISettings) TableName() string { return "ai_settings" }
