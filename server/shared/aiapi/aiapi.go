// Package aiapi là hợp đồng dữ liệu giữa các service nghiệp vụ và AI Service.
// Service gọi sang chỉ gửi đúng dữ liệu cần cho AI; AI Service không đọc database của họ.
package aiapi

// Đường dẫn nội bộ của AI Service, không được API Gateway chuyển tiếp.
const (
	OutfitCheckPath  = "/internal/outfit/check"
	OutfitChoosePath = "/internal/outfit/choose"
)

type Item struct {
	Slot  string `json:"slot"`
	Name  string `json:"name"`
	Brand string `json:"brand"`
	Color string `json:"color"`
	Sport string `json:"sport,omitempty"`
}

// Candidate là một bộ đồ hợp lệ đã được ghép sẵn.
type Candidate struct {
	Items []Item `json:"items"`
}

// Terms là các màu, môn, nhãn đang có, dùng để phát hiện AI nhắc thứ ngoài dữ liệu.
type Terms struct {
	Colors []string `json:"colors"`
	Sports []string `json:"sports"`
	Brands []string `json:"brands"`
}

type TraceStep struct {
	Name   string  `json:"name"`
	Status string  `json:"status"` // ok | warn | error
	Detail string  `json:"detail"`
	Ms     float64 `json:"ms"`
}

type Quota struct {
	Limit     int    `json:"limit"`
	Used      int    `json:"used"`
	Remaining int    `json:"remaining"`
	Window    string `json:"window"`
}

// Caller mô tả khách đang dùng tính năng, để giới hạn lượt và phân bổ chi phí.
type Caller struct {
	IP        string `json:"ip" binding:"required,max=64"`
	UserID    string `json:"user_id" binding:"max=64"`
	UserEmail string `json:"user_email" binding:"max=200"`
	UserRole  string `json:"user_role" binding:"max=20"`
	ProductID string `json:"product_id" binding:"max=64"`
}

type OutfitCheckRequest struct {
	Caller Caller `json:"caller"`
}

type OutfitCheckResponse struct {
	LimitReached bool   `json:"limit_reached"`
	Message      string `json:"message"`
	Quota        Quota  `json:"quota"`
}

type OutfitChooseRequest struct {
	Caller     Caller      `json:"caller"`
	Gender     string      `json:"gender"`
	Sport      string      `json:"sport"`
	Candidates []Candidate `json:"candidates" binding:"required,min=1,max=20"`
	Terms      Terms       `json:"terms"`
	Steps      []TraceStep `json:"steps" binding:"max=20"` // các bước đã làm trước khi gọi sang
	ElapsedMs  float64     `json:"elapsed_ms"`
}

type OutfitChooseResponse struct {
	LimitReached bool   `json:"limit_reached"`
	Message      string `json:"message"`
	Index        int    `json:"index"` // vị trí bộ được chọn trong Candidates
	Reason       string `json:"reason"`
	Source       string `json:"source"` // ai | cache | rule
	TraceID      string `json:"trace_id"`
	Quota        Quota  `json:"quota"`
}
