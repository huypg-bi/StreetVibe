package ai

import (
	"math"
	"testing"
	"time"

	"streetvibe/ai-service/internal/llm"
	"streetvibe/ai-service/internal/models"
	"streetvibe/shared/aiapi"
)

func chosen() aiapi.Candidate {
	return aiapi.Candidate{Items: []aiapi.Item{
		{Name: "Áo", Brand: "Puma", Color: "Trắng", Sport: "Gym"},
		{Name: "Quần", Brand: "Puma", Color: "Đen"},
		{Name: "Giày", Brand: "Puma", Color: "Xanh lá", Sport: "LifeStyle"},
	}}
}

func TestCheckReason(t *testing.T) {
	terms := aiapi.Terms{Colors: []string{"Trắng", "Đen", "Xanh lá", "Đỏ"}, Sports: []string{"Gym", "Chạy bộ"}, Brands: []string{"Puma", "Nike"}}
	clean := []string{
		"Áo trắng, quần đen và giày xanh lá tạo điểm nhấn gọn gàng.",
		"Tông trắng đen của Puma hợp phong cách gym.",
		"Cam kết một tổng thể hài hoà, trung tính.",
	}
	for i, reason := range clean[:2] {
		if flags := CheckReason(reason, chosen(), "", terms); len(flags) != 0 {
			t.Errorf("câu sạch %d bị gắn cờ: %v", i, flags)
		}
	}
	for _, reason := range []string{
		"Giày đỏ nổi bật trên nền đen.", "Bộ này hợp chạy bộ.", "Phối cùng phụ kiện Nike.",
		"Cả bộ chỉ 3.470.000 ₫.", "Giá chỉ 500k", "",
	} {
		if len(CheckReason(reason, chosen(), "", terms)) == 0 {
			t.Errorf("phải gắn cờ: %q", reason)
		}
	}
	if flags := CheckReason("Hợp để chạy bộ.", chosen(), "Chạy bộ", terms); len(flags) != 0 {
		t.Errorf("môn khách chọn thì không gắn cờ: %v", flags)
	}
}

func TestCostAndBudget(t *testing.T) {
	prices := map[string]models.ModelPrice{"m": {Input: 1, Cached: 0.5, Output: 4}}
	got := Cost(prices, "m", llm.Usage{PromptTokens: 1000, CachedTokens: 400, CompletionTokens: 100})
	if math.Abs(got-(600+200+400)/1e6) > 1e-12 {
		t.Fatalf("chi phí sai: %v", got)
	}
	if Cost(prices, "khác", llm.Usage{PromptTokens: 10}) != 0 {
		t.Fatal("model chưa có giá phải tính 0")
	}
	s := models.AISettings{Enabled: true, DailyBudgetUSD: 1, MonthlyBudgetUSD: 2, DailyTokenLimit: 100}
	cases := map[string]Spending{"": {0.5, 0.5, 50}, "daily_budget": {1, 1, 0}, "monthly_budget": {0, 2, 0}, "daily_tokens": {0, 0, 100}}
	for want, spending := range cases {
		if code, _ := BudgetBlock(s, spending); code != want {
			t.Errorf("muốn %q được %q", want, code)
		}
	}
	if code, _ := BudgetBlock(models.AISettings{}, Spending{}); code != "disabled" {
		t.Error("tắt AI phải chặn")
	}
	service := &Service{}
	if !service.AllowRequest(2) || !service.AllowRequest(2) || service.AllowRequest(2) {
		t.Error("giới hạn yêu cầu mỗi phút sai")
	}
}

func TestSummarize(t *testing.T) {
	now := time.Date(2026, 11, 28, 12, 0, 0, 0, vnZone)
	ok := models.AILog{
		CreatedAt: now.Add(-20 * time.Minute), Feature: FeatureOutfit, ClientIP: "1", ProductID: "p", Status: models.AIStatusSuccess,
		Source: "ai", Model: "m", PromptVersion: 1, Attempts: 2, FallbackUsed: true, PromptTokens: 1000, CachedTokens: 400,
		CompletionTokens: 100, CostUSD: 0.01, QueueMs: 100, PromptMs: 50, CompletionMs: 500, LatencyMs: 900, TotalMs: 950,
		FormatResponses: 1, FormatValid: 1, Feedback: 1,
		Steps: []models.AITraceStep{{Status: "error", Detail: "rate_limit: Groq 429"}, {Status: "ok"}},
	}
	cached := models.AILog{
		CreatedAt: now.Add(-5 * time.Minute), Feature: FeatureOutfit, ClientIP: "1", ProductID: "p", Status: models.AIStatusSuccess,
		Source: "cache", CacheHit: true, PromptVersion: 1, Flags: []string{"x"}, Feedback: -1,
	}
	blocked := models.AILog{CreatedAt: now, Status: models.AIStatusBlocked, Source: "rule", ErrorType: "daily_budget"}
	quota := models.AILog{CreatedAt: now, Status: models.AIStatusQuota}

	o := Summarize([]models.AILog{ok, cached, blocked, quota}, 7, now)
	checks := map[string]bool{
		"requests":  o.Requests == 3 && o.Performance.QuotaRejections == 1,
		"cost":      o.FinOps.CostUSD == 0.01 && o.FinOps.CachedTokens == 400,
		"daily":     len(o.Daily) == 7 && o.Daily[6].Input == 600 && o.Daily[6].Cached == 400 && o.Daily[6].Output == 100,
		"errors":    o.Performance.Errors["rate_limit"] == 1 && o.Performance.ErrorRate == 0.5 && o.Performance.FallbackRate == 1,
		"speed":     o.Performance.TTFTAvg == 150 && o.Performance.TokensPerSecond == 200 && o.Performance.LatencyP95 == 900,
		"blocked":   o.Performance.Blocked["daily_budget"] == 1 && o.Performance.RuleResults == 1,
		"cache":     o.Cache.Eligible == 2 && o.Cache.Hits == 1 && o.Cache.HitRate == 0.5 && o.Cache.ProviderCachedRatio == 0.4,
		"quality":   o.Quality.FormatRate == 1 && o.Quality.HallucinationRate == 0.5 && o.Quality.SatisfactionRate == 0.5,
		"follow-up": o.Quality.FollowUps == 1 && len(o.Quality.Samples) == 1,
		"prompts":   len(o.Prompts) == 1 && o.Prompts[0].Requests == 2 && o.Prompts[0].AvgTokens == 1100,
	}
	for name, passed := range checks {
		if !passed {
			t.Errorf("tổng hợp sai ở %s: %+v", name, o)
		}
	}
}
