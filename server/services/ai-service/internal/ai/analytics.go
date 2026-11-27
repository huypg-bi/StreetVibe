package ai

import (
	"math"
	"sort"
	"time"

	"streetvibe/ai-service/internal/llm"
	"streetvibe/ai-service/internal/models"
)

const (
	maxRows        = 20000
	maxGroups      = 10
	maxSamples     = 20
	followUpWindow = 30 * time.Minute
)

type Group struct {
	Key      string  `json:"key"`
	Requests int     `json:"requests"`
	Tokens   int     `json:"tokens"`
	CostUSD  float64 `json:"cost_usd"`
}

type Day struct {
	Date       string  `json:"date"`
	Requests   int     `json:"requests"`
	Input      int     `json:"input_tokens"` // không tính phần đã cache
	Cached     int     `json:"cached_tokens"`
	Output     int     `json:"output_tokens"`
	CostUSD    float64 `json:"cost_usd"`
	LatencyAvg float64 `json:"latency_avg_ms"`
	TTFTAvg    float64 `json:"ttft_avg_ms"`
}

type FinOps struct {
	CostUSD          float64 `json:"cost_usd"`
	PromptTokens     int     `json:"prompt_tokens"`
	CachedTokens     int     `json:"cached_tokens"`
	CompletionTokens int     `json:"completion_tokens"`
	ReasoningTokens  int     `json:"reasoning_tokens"`
	ByFeature        []Group `json:"by_feature"`
	ByRole           []Group `json:"by_role"`
	ByUser           []Group `json:"by_user"`
	ByModel          []Group `json:"by_model"`
}

type Performance struct {
	ModelRequests    int            `json:"model_requests"`
	Attempts         int            `json:"attempts"`
	TTFTAvg          float64        `json:"ttft_avg_ms"`
	TTFTP95          float64        `json:"ttft_p95_ms"`
	LatencyAvg       float64        `json:"latency_avg_ms"`
	LatencyP95       float64        `json:"latency_p95_ms"`
	TotalAvg         float64        `json:"total_avg_ms"`
	TokensPerSecond  float64        `json:"tokens_per_second"`
	FailedAttempts   int            `json:"failed_attempts"`
	Errors           map[string]int `json:"errors"`
	ErrorRate        float64        `json:"error_rate"`
	FallbackRequests int            `json:"fallback_requests"`
	FallbackRate     float64        `json:"fallback_rate"`
	RuleResults      int            `json:"rule_results"`
	Blocked          map[string]int `json:"blocked"`
	QuotaRejections  int            `json:"quota_rejections"`
}

type Sample struct {
	ID            string    `json:"id"`
	CreatedAt     time.Time `json:"created_at"`
	Reason        string    `json:"reason"`
	Flags         []string  `json:"flags"`
	Model         string    `json:"model"`
	PromptVersion int       `json:"prompt_version"`
}

type Quality struct {
	Responses         int      `json:"responses"`
	ValidResponses    int      `json:"valid_responses"`
	FormatRate        float64  `json:"format_rate"`
	Checked           int      `json:"checked"`
	Flagged           int      `json:"flagged"`
	HallucinationRate float64  `json:"hallucination_rate"`
	Likes             int      `json:"likes"`
	Dislikes          int      `json:"dislikes"`
	SatisfactionRate  float64  `json:"satisfaction_rate"`
	Successful        int      `json:"successful"`
	FollowUps         int      `json:"follow_ups"`
	FollowUpRate      float64  `json:"follow_up_rate"`
	Samples           []Sample `json:"samples"`
}

type Cache struct {
	Eligible            int     `json:"eligible"`
	Hits                int     `json:"hits"`
	HitRate             float64 `json:"hit_rate"`
	ProviderCachedRatio float64 `json:"provider_cached_ratio"`
}

type PromptStats struct {
	Version       int     `json:"version"`
	Requests      int     `json:"requests"`
	AvgTokens     float64 `json:"avg_tokens"`
	AvgLatencyMs  float64 `json:"avg_latency_ms"`
	AvgCostUSD    float64 `json:"avg_cost_usd"`
	FormatRate    float64 `json:"format_rate"`
	FlaggedRate   float64 `json:"flagged_rate"`
	Likes         int     `json:"likes"`
	Dislikes      int     `json:"dislikes"`
	calls         int
	valid, answer int
	checked, flag int
	tokens        int
	latency, cost float64
}

type QuotaRow struct {
	IP     string    `json:"ip"`
	Used   int       `json:"used"`
	Emails []string  `json:"emails"`
	LastAt time.Time `json:"last_at"`
}

type Overview struct {
	Days        int           `json:"days"`
	Truncated   bool          `json:"truncated"`
	Requests    int           `json:"requests"`
	FinOps      FinOps        `json:"finops"`
	Performance Performance   `json:"performance"`
	Quality     Quality       `json:"quality"`
	Cache       Cache         `json:"cache"`
	Daily       []Day         `json:"daily"`
	Prompts     []PromptStats `json:"prompts"`
	Quota       []QuotaRow    `json:"quota"`
}

func ratio(part, whole int) float64 {
	if whole == 0 {
		return 0
	}
	return float64(part) / float64(whole)
}

func average(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range values {
		sum += v
	}
	return sum / float64(len(values))
}

// percentile theo phương pháp nearest-rank
func percentile(values []float64, p float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sorted := append([]float64(nil), values...)
	sort.Float64s(sorted)
	rank := int(math.Ceil(p*float64(len(sorted)))) - 1
	return sorted[max(0, min(rank, len(sorted)-1))]
}

func addGroup(groups map[string]*Group, key string, entry models.AILog) {
	group := groups[key]
	if group == nil {
		group = &Group{Key: key}
		groups[key] = group
	}
	group.Requests++
	group.Tokens += entry.PromptTokens + entry.CompletionTokens
	group.CostUSD += entry.CostUSD
}

func topGroups(groups map[string]*Group) []Group {
	list := make([]Group, 0, len(groups))
	for _, group := range groups {
		list = append(list, *group)
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].CostUSD != list[j].CostUSD {
			return list[i].CostUSD > list[j].CostUSD
		}
		if list[i].Requests != list[j].Requests {
			return list[i].Requests > list[j].Requests
		}
		return list[i].Key < list[j].Key
	})
	return list[:min(len(list), maxGroups)]
}

// Summarize tổng hợp nhật ký (xếp theo thời gian tăng dần) cho số ngày gần nhất.
func Summarize(logs []models.AILog, days int, now time.Time) Overview {
	overview := Overview{Days: days}
	perf := &overview.Performance
	perf.Errors, perf.Blocked = map[string]int{}, map[string]int{}
	quality := &overview.Quality
	quality.Samples = []Sample{}

	dayIndex := map[string]int{}
	first := startOfDay(now).AddDate(0, 0, -(days - 1))
	for i := range days {
		date := first.AddDate(0, 0, i).Format("2006-01-02")
		dayIndex[date] = i
		overview.Daily = append(overview.Daily, Day{Date: date})
	}
	dayLatency := make([][]float64, days)
	dayTTFT := make([][]float64, days)

	features, roles, users, modelsUsed := map[string]*Group{}, map[string]*Group{}, map[string]*Group{}, map[string]*Group{}
	prompts := map[int]*PromptStats{}
	var ttft, latency, total []float64
	var completionTokens int
	var completionMs float64
	lastSuccess := map[string]time.Time{}

	for _, entry := range logs {
		if entry.Status == models.AIStatusQuota {
			perf.QuotaRejections++
			continue
		}
		overview.Requests++
		finops := &overview.FinOps
		finops.CostUSD += entry.CostUSD
		finops.PromptTokens += entry.PromptTokens
		finops.CachedTokens += entry.CachedTokens
		finops.CompletionTokens += entry.CompletionTokens
		finops.ReasoningTokens += entry.ReasoningTokens

		role := entry.UserRole
		if role == "" {
			role = "khách vãng lai"
		}
		who := entry.UserEmail
		if who == "" {
			who = "khách // " + entry.ClientIP
		}
		addGroup(features, entry.Feature, entry)
		addGroup(roles, role, entry)
		addGroup(users, who, entry)
		if entry.Model != "" {
			addGroup(modelsUsed, entry.Model, entry)
		}

		index, inRange := dayIndex[entry.CreatedAt.In(vnZone).Format("2006-01-02")]
		if inRange {
			day := &overview.Daily[index]
			day.Requests++
			day.Input += entry.PromptTokens - entry.CachedTokens
			day.Cached += entry.CachedTokens
			day.Output += entry.CompletionTokens
			day.CostUSD += entry.CostUSD
		}

		if entry.Status == models.AIStatusBlocked {
			perf.Blocked[entry.ErrorType]++
		}
		if entry.Source == "rule" {
			perf.RuleResults++
		}
		if entry.CacheHit || entry.Attempts > 0 {
			overview.Cache.Eligible++
		}
		if entry.CacheHit {
			overview.Cache.Hits++
		}

		if entry.Attempts > 0 {
			perf.ModelRequests++
			perf.Attempts += entry.Attempts
			if entry.FallbackUsed {
				perf.FallbackRequests++
			}
			for _, step := range entry.Steps {
				// Bước gọi model thất bại có Status "error" và Detail bắt đầu bằng mã lỗi
				if step.Status == "error" {
					code := llm.OutcomeError
					for _, known := range []string{llm.OutcomeRateLimit, llm.OutcomeTimeout, llm.OutcomeServer, llm.OutcomeInvalid} {
						if len(step.Detail) >= len(known) && step.Detail[:len(known)] == known {
							code = known
						}
					}
					perf.Errors[code]++
					perf.FailedAttempts++
				}
			}
			latency = append(latency, entry.LatencyMs)
			total = append(total, entry.TotalMs)
			if inRange {
				dayLatency[index] = append(dayLatency[index], entry.LatencyMs)
			}
			if entry.Status == models.AIStatusSuccess {
				first := entry.QueueMs + entry.PromptMs
				ttft = append(ttft, first)
				if inRange {
					dayTTFT[index] = append(dayTTFT[index], first)
				}
				completionTokens += entry.CompletionTokens
				completionMs += entry.CompletionMs
			}
		}

		quality.Responses += entry.FormatResponses
		quality.ValidResponses += entry.FormatValid

		if entry.Status == models.AIStatusSuccess {
			quality.Successful++
			quality.Checked++
			if len(entry.Flags) > 0 {
				quality.Flagged++
				quality.Samples = append(quality.Samples, Sample{
					ID: entry.ID.String(), CreatedAt: entry.CreatedAt, Reason: entry.Reason,
					Flags: entry.Flags, Model: entry.Model, PromptVersion: entry.PromptVersion,
				})
			}
			// Cùng người hỏi lại cùng sản phẩm trong 30 phút xem như chưa hài lòng
			key := entry.ClientIP + "|" + entry.UserID + "|" + entry.ProductID
			if previous, ok := lastSuccess[key]; ok && entry.CreatedAt.Sub(previous) <= followUpWindow {
				quality.FollowUps++
			}
			lastSuccess[key] = entry.CreatedAt
		}
		switch entry.Feedback {
		case 1:
			quality.Likes++
		case -1:
			quality.Dislikes++
		}

		if entry.PromptVersion > 0 {
			stats := prompts[entry.PromptVersion]
			if stats == nil {
				stats = &PromptStats{Version: entry.PromptVersion}
				prompts[entry.PromptVersion] = stats
			}
			stats.Requests++
			if entry.Attempts > 0 {
				stats.calls++
				stats.tokens += entry.PromptTokens + entry.CompletionTokens
				stats.latency += entry.LatencyMs
				stats.cost += entry.CostUSD
				stats.answer += entry.FormatResponses
				stats.valid += entry.FormatValid
			}
			if entry.Status == models.AIStatusSuccess {
				stats.checked++
				if len(entry.Flags) > 0 {
					stats.flag++
				}
			}
			if entry.Feedback == 1 {
				stats.Likes++
			} else if entry.Feedback == -1 {
				stats.Dislikes++
			}
		}
	}

	overview.FinOps.ByFeature = topGroups(features)
	overview.FinOps.ByRole = topGroups(roles)
	overview.FinOps.ByUser = topGroups(users)
	overview.FinOps.ByModel = topGroups(modelsUsed)

	perf.TTFTAvg, perf.TTFTP95 = average(ttft), percentile(ttft, 0.95)
	perf.LatencyAvg, perf.LatencyP95 = average(latency), percentile(latency, 0.95)
	perf.TotalAvg = average(total)
	if completionMs > 0 {
		perf.TokensPerSecond = float64(completionTokens) / (completionMs / 1000)
	}
	perf.ErrorRate = ratio(perf.FailedAttempts, perf.Attempts)
	perf.FallbackRate = ratio(perf.FallbackRequests, perf.ModelRequests)

	quality.FormatRate = ratio(quality.ValidResponses, quality.Responses)
	quality.HallucinationRate = ratio(quality.Flagged, quality.Checked)
	quality.SatisfactionRate = ratio(quality.Likes, quality.Likes+quality.Dislikes)
	quality.FollowUpRate = ratio(quality.FollowUps, quality.Successful)
	// Mẫu mới nhất trước
	for i, j := 0, len(quality.Samples)-1; i < j; i, j = i+1, j-1 {
		quality.Samples[i], quality.Samples[j] = quality.Samples[j], quality.Samples[i]
	}
	quality.Samples = quality.Samples[:min(len(quality.Samples), maxSamples)]

	overview.Cache.HitRate = ratio(overview.Cache.Hits, overview.Cache.Eligible)
	overview.Cache.ProviderCachedRatio = ratio(overview.FinOps.CachedTokens, overview.FinOps.PromptTokens)

	for i := range overview.Daily {
		overview.Daily[i].LatencyAvg = average(dayLatency[i])
		overview.Daily[i].TTFTAvg = average(dayTTFT[i])
	}

	overview.Prompts = []PromptStats{}
	for _, stats := range prompts {
		if stats.calls > 0 {
			stats.AvgTokens = float64(stats.tokens) / float64(stats.calls)
			stats.AvgLatencyMs = stats.latency / float64(stats.calls)
			stats.AvgCostUSD = stats.cost / float64(stats.calls)
		}
		stats.FormatRate = ratio(stats.valid, stats.answer)
		stats.FlaggedRate = ratio(stats.flag, stats.checked)
		overview.Prompts = append(overview.Prompts, *stats)
	}
	sort.Slice(overview.Prompts, func(i, j int) bool { return overview.Prompts[i].Version > overview.Prompts[j].Version })
	return overview
}

// Overview đọc nhật ký trong số ngày gần nhất và danh sách IP đang tính lượt.
func (s *Service) Overview(days int, settings models.AISettings) (Overview, error) {
	now := time.Now()
	var logs []models.AILog
	// Lấy các dòng mới nhất nếu quá nhiều, rồi đảo lại thành thứ tự thời gian
	if err := s.db.Omit("question").Where("created_at >= ?", startOfDay(now).AddDate(0, 0, -(days-1))).
		Order("created_at desc").Limit(maxRows).Find(&logs).Error; err != nil {
		return Overview{}, err
	}
	for i, j := 0, len(logs)-1; i < j; i, j = i+1, j-1 {
		logs[i], logs[j] = logs[j], logs[i]
	}
	overview := Summarize(logs, days, now)
	overview.Truncated = len(logs) == maxRows

	var used []models.AILog
	query := s.db.Select("client_ip", "user_email", "created_at").Where("counts_quota = ?", true)
	if settings.OutfitLimitWindow != WindowTotal {
		query = query.Where("created_at >= ?", startOfDay(now))
	}
	if err := query.Order("created_at desc").Limit(maxRows).Find(&used).Error; err != nil {
		return overview, err
	}
	rows := map[string]*QuotaRow{}
	overview.Quota = []QuotaRow{}
	var order []string
	for _, entry := range used {
		row := rows[entry.ClientIP]
		if row == nil {
			row = &QuotaRow{IP: entry.ClientIP, LastAt: entry.CreatedAt, Emails: []string{}}
			rows[entry.ClientIP] = row
			order = append(order, entry.ClientIP)
		}
		row.Used++
		known := entry.UserEmail == ""
		for _, email := range row.Emails {
			known = known || email == entry.UserEmail
		}
		if !known {
			row.Emails = append(row.Emails, entry.UserEmail)
		}
	}
	for _, ip := range order {
		overview.Quota = append(overview.Quota, *rows[ip])
	}
	return overview, nil
}

type TracePage struct {
	Items      []models.AILog `json:"items"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	TotalPages int            `json:"total_pages"`
}

func (s *Service) Traces(status string, page, limit int) (TracePage, error) {
	query := s.db.Model(&models.AILog{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	result := TracePage{Page: page, Items: []models.AILog{}}
	if err := query.Count(&result.Total).Error; err != nil {
		return result, err
	}
	result.TotalPages = max(1, int((result.Total+int64(limit)-1)/int64(limit)))
	err := query.Omit("question", "steps").Order("created_at desc").
		Offset((page - 1) * limit).Limit(limit).Find(&result.Items).Error
	return result, err
}

func (s *Service) Trace(id string) (models.AILog, error) {
	var entry models.AILog
	err := s.db.First(&entry, "id::text = ?", id).Error
	return entry, err
}
