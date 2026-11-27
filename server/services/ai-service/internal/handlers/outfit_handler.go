package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"streetvibe/ai-service/internal/ai"
	"streetvibe/ai-service/internal/llm"
	"streetvibe/ai-service/internal/models"
	"streetvibe/shared/aiapi"
	"streetvibe/shared/clientip"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// OutfitHandler phần AI của tính năng ghép outfit: lượt theo IP, gọi model, nhật ký, phản hồi.
type OutfitHandler struct {
	stylist *llm.Stylist
	ai      *ai.Service
	secret  string // kiểm tra chữ ký IP do Gateway gắn
}

func NewOutfitHandler(stylist *llm.Stylist, service *ai.Service, secret string) *OutfitHandler {
	return &OutfitHandler{stylist: stylist, ai: service, secret: secret}
}

func newQuota(settings models.AISettings, used int) aiapi.Quota {
	return aiapi.Quota{
		Limit: settings.OutfitLimit, Used: used,
		Remaining: max(0, settings.OutfitLimit-used), Window: settings.OutfitLimitWindow,
	}
}

func limitMessage(settings models.AISettings) string {
	if settings.OutfitLimitWindow == ai.WindowTotal {
		return fmt.Sprintf("Bạn đã dùng hết %d lượt tạo outfit trên máy này.", settings.OutfitLimit)
	}
	return fmt.Sprintf("Bạn đã dùng hết %d lượt tạo outfit hôm nay trên máy này. Vui lòng quay lại vào ngày mai.", settings.OutfitLimit)
}

func (h *OutfitHandler) state(c *gin.Context, ip string) (models.AISettings, int, bool) {
	settings, err := h.ai.Settings()
	if err == nil {
		var used int
		if used, err = h.ai.Used(ip, settings); err == nil {
			return settings, used, true
		}
	}
	log.Printf("Outfit: không đọc được cấu hình AI: %v", err)
	response.InternalError(c, "Không thể kiểm tra lượt tạo outfit")
	return settings, 0, false
}

// Quota (công khai) cho biết máy đang gọi còn bao nhiêu lượt.
func (h *OutfitHandler) Quota(c *gin.Context) {
	settings, used, ok := h.state(c, clientip.From(c.Request, h.secret))
	if !ok {
		return
	}
	response.Success(c, http.StatusOK, "Lượt tạo outfit", newQuota(settings, used))
}

// Feedback (công khai) nhận nút Thích / Không thích cho một bộ đã ghép.
func (h *OutfitHandler) Feedback(c *gin.Context) {
	var req struct {
		TraceID string `json:"trace_id" binding:"required,uuid"`
		Vote    int    `json:"vote" binding:"required,oneof=1 -1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Phản hồi không hợp lệ", err.Error())
		return
	}
	err := h.ai.Feedback(uuid.MustParse(req.TraceID), clientip.From(c.Request, h.secret), req.Vote)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		response.NotFound(c, "Không tìm thấy lượt ghép outfit này")
		return
	}
	if err != nil {
		response.InternalError(c, "Không thể lưu phản hồi")
		return
	}
	response.Success(c, http.StatusOK, "Cảm ơn bạn đã phản hồi", nil)
}

func newLog(caller aiapi.Caller) models.AILog {
	return models.AILog{
		ID: uuid.New(), CreatedAt: time.Now(), Feature: ai.FeatureOutfit, ClientIP: caller.IP, ProductID: caller.ProductID,
		UserID: caller.UserID, UserEmail: caller.UserEmail, UserRole: caller.UserRole,
	}
}

func (h *OutfitHandler) logRejection(caller aiapi.Caller) {
	entry := newLog(caller)
	entry.Status = models.AIStatusQuota
	if err := h.ai.Create(&entry); err != nil {
		log.Printf("Outfit: không ghi được nhật ký: %v", err)
	}
}

// Check (nội bộ) cho service nghiệp vụ hỏi còn lượt không trước khi làm việc nặng.
func (h *OutfitHandler) Check(c *gin.Context) {
	var req aiapi.OutfitCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Yêu cầu nội bộ không hợp lệ", err.Error())
		return
	}
	settings, used, ok := h.state(c, req.Caller.IP)
	if !ok {
		return
	}
	result := aiapi.OutfitCheckResponse{Quota: newQuota(settings, used)}
	if used >= settings.OutfitLimit {
		h.logRejection(req.Caller)
		result.LimitReached, result.Message = true, limitMessage(settings)
	}
	response.Success(c, http.StatusOK, "Đã kiểm tra lượt", result)
}

// tracer ghi từng bước kèm thời gian kể từ bước trước
type tracer struct {
	last  time.Time
	steps []models.AITraceStep
}

func (t *tracer) add(name, status, detail string) {
	now := time.Now()
	t.steps = append(t.steps, models.AITraceStep{
		Name: name, Status: status, Detail: detail, Ms: float64(now.Sub(t.last).Microseconds()) / 1000,
	})
	t.last = now
}

// Choose (nội bộ) giữ một lượt, chọn một bộ bằng AI và ghi nhật ký.
// AI lỗi, bị tắt hoặc hết ngân sách thì trả bộ đầu tiên với nguồn "rule".
func (h *OutfitHandler) Choose(c *gin.Context) {
	started := time.Now()
	var req aiapi.OutfitChooseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Yêu cầu nội bộ không hợp lệ", err.Error())
		return
	}
	settings, _, ok := h.state(c, req.Caller.IP)
	if !ok {
		return
	}
	trace := &tracer{last: started, steps: req.Steps}

	entry := newLog(req.Caller)
	reserved, used, err := h.ai.Reserve(&entry, settings)
	if err != nil {
		log.Printf("Outfit: không giữ được lượt: %v", err)
		response.InternalError(c, "Không thể kiểm tra lượt tạo outfit")
		return
	}
	if !reserved {
		h.logRejection(req.Caller)
		response.Success(c, http.StatusOK, "Hết lượt", aiapi.OutfitChooseResponse{
			LimitReached: true, Message: limitMessage(settings), Quota: newQuota(settings, used),
		})
		return
	}
	trace.add("Giữ lượt theo IP", "ok", fmt.Sprintf("Lượt %d/%d", used, settings.OutfitLimit))

	index, reason := h.askStylist(c, &entry, trace, settings, req)

	// Không gọi được model và không tốn token thì không trừ lượt của khách
	if entry.Source == "rule" && entry.PromptTokens+entry.CompletionTokens == 0 {
		entry.CountsQuota = false
		used--
	}
	entry.Steps = trace.steps
	entry.TotalMs = req.ElapsedMs + float64(time.Since(started).Microseconds())/1000
	if err := h.ai.Save(&entry); err != nil {
		log.Printf("Outfit: không ghi được nhật ký: %v", err)
	}

	response.Success(c, http.StatusOK, "Đã chọn outfit", aiapi.OutfitChooseResponse{
		Index: index, Reason: reason, Source: entry.Source, TraceID: entry.ID.String(), Quota: newQuota(settings, used),
	})
}

// askStylist chọn một bộ bằng AI (hoặc cache) và ghi đủ chi phí, hiệu năng, chất lượng vào entry.
func (h *OutfitHandler) askStylist(
	c *gin.Context, entry *models.AILog, trace *tracer, settings models.AISettings, req aiapi.OutfitChooseRequest,
) (int, string) {
	entry.Source = "rule"

	prompt, err := h.ai.ActivePrompt()
	if err != nil {
		entry.Status, entry.ErrorType, entry.ErrorMessage = models.AIStatusFailed, "config", err.Error()
		trace.add("Tải prompt", "warn", err.Error())
		return 0, ""
	}
	entry.PromptVersion = prompt.Version
	input := llm.Input{
		Gender: req.Gender, Sport: req.Sport, Candidates: req.Candidates,
		SystemPrompt: prompt.Content, Models: []string{settings.Model, settings.FallbackModel},
	}
	entry.Question, _ = llm.Question(input)

	// Admin tắt AI thì không dùng cả cache
	choice, cached := h.stylist.Cached(input)
	if cached && settings.Enabled {
		trace.add("Bộ nhớ đệm", "ok", "Trúng cache, không gọi model")
		entry.Source, entry.CacheHit = "cache", true
	} else {
		trace.add("Bộ nhớ đệm", "ok", "Chưa có trong cache")

		block := func(code, message string) (int, string) {
			entry.Status, entry.ErrorType, entry.ErrorMessage = models.AIStatusBlocked, code, message
			trace.add("Kiểm tra hạn mức", "warn", message)
			return 0, ""
		}
		spending, err := h.ai.Spending()
		if err != nil {
			return block("config", "Không đọc được chi phí đã dùng")
		}
		if code, message := ai.BudgetBlock(settings, spending); code != "" {
			return block(code, message)
		}
		if !h.stylist.Configured() {
			return block("no_key", llm.ErrStylistDisabled.Error())
		}
		if !h.ai.AllowRequest(settings.RequestsPerMinute) {
			return block("rate_guard", "Vượt số yêu cầu AI mỗi phút")
		}
		trace.add("Kiểm tra hạn mức", "ok", "Còn trong ngân sách và giới hạn tốc độ")

		choice, err = h.stylist.Choose(c.Request.Context(), input)
		h.record(entry, trace, settings, choice.Attempts)
		if err != nil {
			log.Printf("Outfit: dùng kết quả theo bộ lọc vì AI không phản hồi: %v", err)
			entry.Status, entry.ErrorMessage = models.AIStatusFailed, err.Error()
			if n := len(choice.Attempts); n > 0 {
				entry.ErrorType = choice.Attempts[n-1].Outcome
			}
			return 0, ""
		}
		entry.Source = "ai"
	}

	entry.Status, entry.Model, entry.Reason = models.AIStatusSuccess, choice.Model, choice.Reason
	entry.Flags = ai.CheckReason(choice.Reason, req.Candidates[choice.Index], req.Sport, req.Terms)
	if len(entry.Flags) == 0 {
		trace.add("Kiểm tra chất lượng", "ok", "Không phát hiện chi tiết ngoài dữ liệu")
	} else {
		trace.add("Kiểm tra chất lượng", "warn", strings.Join(entry.Flags, "; "))
	}
	return choice.Index, choice.Reason
}

// record cộng token, chi phí, thời gian của mọi lần gọi model, kể cả lần thất bại.
func (h *OutfitHandler) record(entry *models.AILog, trace *tracer, settings models.AISettings, attempts []llm.Attempt) {
	for i, attempt := range attempts {
		usage := attempt.Usage
		entry.Attempts++
		entry.PromptTokens += usage.PromptTokens
		entry.CachedTokens += usage.CachedTokens
		entry.CompletionTokens += usage.CompletionTokens
		entry.ReasoningTokens += usage.ReasoningTokens
		entry.CostUSD += ai.Cost(settings.Prices, attempt.Model, usage)
		entry.LatencyMs += attempt.DurationMs
		entry.FallbackUsed = entry.FallbackUsed || i > 0

		switch attempt.Outcome {
		case llm.OutcomeOK:
			entry.FormatResponses++
			entry.FormatValid++
			entry.QueueMs, entry.PromptMs, entry.CompletionMs = usage.QueueMs, usage.PromptMs, usage.CompletionMs
		case llm.OutcomeInvalid:
			entry.FormatResponses++
		}

		status, detail := "ok", fmt.Sprintf("%d token vào, %d token ra", usage.PromptTokens, usage.CompletionTokens)
		if attempt.Outcome != llm.OutcomeOK {
			// Trang thống kê đọc mã lỗi ở đầu Detail
			status, detail = "error", attempt.Outcome+": "+attempt.Error
		}
		trace.steps = append(trace.steps, models.AITraceStep{
			Name: fmt.Sprintf("Gọi %s (lần %d)", attempt.Model, i+1), Status: status, Detail: detail, Ms: attempt.DurationMs,
		})
	}
	trace.last = time.Now()
}
