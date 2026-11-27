package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"streetvibe/ai-service/internal/ai"
	"streetvibe/ai-service/internal/llm"
	"streetvibe/ai-service/internal/models"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AIAdminHandler phục vụ trang Quản lý AI. Mọi route đã được AdminTokenMiddleware bảo vệ.
type AIAdminHandler struct {
	ai      *ai.Service
	stylist *llm.Stylist
}

func NewAIAdminHandler(service *ai.Service, stylist *llm.Stylist) *AIAdminHandler {
	return &AIAdminHandler{ai: service, stylist: stylist}
}

func (h *AIAdminHandler) Overview(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))
	if days < 1 || days > 90 {
		days = 7
	}
	settings, err := h.ai.Settings()
	if err != nil {
		response.InternalError(c, "Không thể đọc cấu hình AI")
		return
	}
	overview, err := h.ai.Overview(days, settings)
	if err != nil {
		response.InternalError(c, "Không thể tổng hợp số liệu AI")
		return
	}
	spending, err := h.ai.Spending()
	if err != nil {
		response.InternalError(c, "Không thể tính chi phí AI")
		return
	}
	code, message := ai.BudgetBlock(settings, spending)
	response.Success(c, http.StatusOK, "Số liệu AI", gin.H{
		"overview": overview, "settings": settings, "spending": spending,
		"requests_last_minute": h.ai.RequestsLastMinute(),
		"blocked":              gin.H{"code": code, "message": message},
		"key_configured":       h.stylist.Configured(),
	})
}

func (h *AIAdminHandler) UpdateSettings(c *gin.Context) {
	var req models.AISettings
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Cấu hình không hợp lệ", err.Error())
		return
	}
	req.Model, req.FallbackModel = strings.TrimSpace(req.Model), strings.TrimSpace(req.FallbackModel)
	switch {
	case req.Model == "" || len(req.Model) > 100 || len(req.FallbackModel) > 100:
		response.BadRequest(c, "Vui lòng nhập tên model chính (tối đa 100 ký tự)", "")
		return
	case req.DailyBudgetUSD < 0 || req.MonthlyBudgetUSD < 0 || req.DailyTokenLimit < 0 || req.RequestsPerMinute < 0:
		response.BadRequest(c, "Ngân sách và giới hạn không được âm", "")
		return
	case req.OutfitLimit < 1 || req.OutfitLimit > 1000:
		response.BadRequest(c, "Số lượt tạo outfit mỗi IP phải từ 1 đến 1000", "")
		return
	case req.OutfitLimitWindow != ai.WindowDay && req.OutfitLimitWindow != ai.WindowTotal:
		response.BadRequest(c, "Chu kỳ giới hạn không hợp lệ", "")
		return
	}
	for _, price := range req.Prices {
		if price.Input < 0 || price.Cached < 0 || price.Output < 0 {
			response.BadRequest(c, "Giá token không được âm", "")
			return
		}
	}
	if err := h.ai.SaveSettings(req); err != nil {
		response.InternalError(c, "Không thể lưu cấu hình AI")
		return
	}
	response.Success(c, http.StatusOK, "Đã lưu cấu hình AI", req)
}

func (h *AIAdminHandler) ListPrompts(c *gin.Context) {
	prompts, err := h.ai.Prompts()
	if err != nil {
		response.InternalError(c, "Không thể tải các phiên bản prompt")
		return
	}
	response.Success(c, http.StatusOK, "Danh sách prompt", gin.H{"items": prompts})
}

func (h *AIAdminHandler) CreatePrompt(c *gin.Context) {
	var req struct {
		Content  string `json:"content" binding:"required,min=20,max=4000"`
		Note     string `json:"note" binding:"max=300"`
		Activate bool   `json:"activate"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Prompt cần từ 20 đến 4000 ký tự, ghi chú tối đa 300 ký tự", err.Error())
		return
	}
	prompt, err := h.ai.CreatePrompt(strings.TrimSpace(req.Content), strings.TrimSpace(req.Note), c.GetString("email"), req.Activate)
	if err != nil {
		response.InternalError(c, "Không thể lưu prompt")
		return
	}
	response.Success(c, http.StatusCreated, "Đã tạo phiên bản prompt", prompt)
}

func (h *AIAdminHandler) ActivatePrompt(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.BadRequest(c, "ID prompt không hợp lệ", "")
		return
	}
	if err := h.ai.ActivatePrompt(uint(id)); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.NotFound(c, "Không tìm thấy phiên bản prompt")
			return
		}
		response.InternalError(c, "Không thể chuyển phiên bản prompt")
		return
	}
	response.Success(c, http.StatusOK, "Đã chuyển phiên bản prompt", nil)
}

func (h *AIAdminHandler) ListTraces(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	result, err := h.ai.Traces(c.Query("status"), max(1, page), 15)
	if err != nil {
		response.InternalError(c, "Không thể tải dấu vết")
		return
	}
	response.Success(c, http.StatusOK, "Danh sách dấu vết", result)
}

func (h *AIAdminHandler) GetTrace(c *gin.Context) {
	entry, err := h.ai.Trace(c.Param("id"))
	if errors.Is(err, gorm.ErrRecordNotFound) {
		response.NotFound(c, "Không tìm thấy dấu vết")
		return
	}
	if err != nil {
		response.InternalError(c, "Không thể tải dấu vết")
		return
	}
	response.Success(c, http.StatusOK, "Chi tiết dấu vết", entry)
}

func (h *AIAdminHandler) ResetQuota(c *gin.Context) {
	var req struct {
		IP string `json:"ip" binding:"required,max=64"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Thiếu địa chỉ IP", err.Error())
		return
	}
	if err := h.ai.ResetQuota(req.IP); err != nil {
		response.InternalError(c, "Không thể đặt lại lượt")
		return
	}
	response.Success(c, http.StatusOK, "Đã đặt lại lượt cho IP", nil)
}
