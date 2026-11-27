package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"streetvibe/product-service/internal/aiclient"
	"streetvibe/product-service/internal/models"
	"streetvibe/product-service/internal/outfit"
	"streetvibe/shared/aiapi"
	"streetvibe/shared/clientip"
	"streetvibe/shared/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// OutfitHandler ghép bộ từ dữ liệu sản phẩm, rồi nhờ AI Service chọn một bộ.
type OutfitHandler struct {
	db     *gorm.DB
	ai     *aiclient.Client
	secret string // kiểm tra chữ ký IP do Gateway gắn
}

func NewOutfitHandler(db *gorm.DB, ai *aiclient.Client, secret string) *OutfitHandler {
	return &OutfitHandler{db: db, ai: ai, secret: secret}
}

type outfitRequest struct {
	ProductID        string   `json:"product_id" binding:"required,uuid"`
	AnchorColorID    string   `json:"anchor_color_id"`
	Brands           []string `json:"brands" binding:"max=30"`
	AllowOtherBrands bool     `json:"allow_other_brands"`
	PriceMode        string   `json:"price_mode" binding:"required,oneof=best sale budget"`
	Budget           float64  `json:"budget" binding:"gte=0"`
	SportID          string   `json:"sport_id"`
	Gender           string   `json:"gender" binding:"required,oneof=Nam Nữ"`
	TopSize          string   `json:"top_size" binding:"required,max=10"`
	BottomSize       string   `json:"bottom_size" binding:"required,max=10"`
	ShoeSize         string   `json:"shoe_size" binding:"required,max=10"`
	IncludeSocks     bool     `json:"include_socks"`
	IncludeAccessory bool     `json:"include_accessory"`
}

func millisSince(t time.Time) float64 { return float64(time.Since(t).Microseconds()) / 1000 }

func rejectOverLimit(c *gin.Context, message string) {
	response.Error(c, http.StatusTooManyRequests, "OUTFIT_LIMIT", message)
}

// Suggest ghép outfit quanh sản phẩm đang xem.
// AI Service lỗi hoặc không phản hồi thì trả bộ đứng đầu theo bộ lọc, không tốn token và không trừ lượt.
func (h *OutfitHandler) Suggest(c *gin.Context) {
	started := time.Now()
	var req outfitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Vui lòng điền đủ giới tính, size áo, size quần, size giày và kiểu giá", err.Error())
		return
	}
	if req.PriceMode == outfit.PriceBudget && req.Budget <= 0 {
		response.BadRequest(c, "Vui lòng nhập ngân sách", "")
		return
	}
	// Các header định danh do Gateway gắn từ JWT hợp lệ
	caller := aiapi.Caller{
		IP: clientip.From(c.Request, h.secret), ProductID: req.ProductID,
		UserID: c.GetHeader("X-User-Id"), UserEmail: c.GetHeader("X-User-Email"), UserRole: c.GetHeader("X-User-Role"),
	}
	check, err := h.ai.CheckOutfit(c.Request.Context(), aiapi.OutfitCheckRequest{Caller: caller})
	aiAvailable := err == nil
	if !aiAvailable {
		log.Printf("Outfit: không gọi được AI Service: %v", err)
	}
	if check.LimitReached {
		rejectOverLimit(c, check.Message)
		return
	}

	step := time.Now()
	anchorID := uuid.MustParse(req.ProductID)
	var products []models.Product
	if err := h.db.Preload("Category.Parent").Preload("Sport").Preload("Variants.Color").Preload("Variants.Size").
		Where("status = ?", "APPROVED").Find(&products).Error; err != nil {
		response.InternalError(c, "Không thể tải sản phẩm để ghép outfit")
		return
	}
	var anchor *models.Product
	for i := range products {
		if products[i].ID == anchorID {
			anchor = &products[i]
			break
		}
	}
	if anchor == nil {
		response.NotFound(c, "Sản phẩm không còn bán")
		return
	}
	steps := []aiapi.TraceStep{{
		Name: "Tải sản phẩm", Status: "ok", Detail: fmt.Sprintf("%d sản phẩm đã duyệt", len(products)), Ms: millisSince(step),
	}}

	step = time.Now()
	result := outfit.Build(products, *anchor, outfit.Preferences{
		Gender: req.Gender, TopSize: req.TopSize, BottomSize: req.BottomSize, ShoeSize: req.ShoeSize,
		Brands: req.Brands, AllowOtherBrands: req.AllowOtherBrands,
		PriceMode: req.PriceMode, Budget: req.Budget, SportID: req.SportID,
		IncludeSocks: req.IncludeSocks, IncludeAccessory: req.IncludeAccessory,
		AnchorColorID: req.AnchorColorID,
	})
	data := gin.H{
		"status": result.Status, "message": result.Message,
		"missing": result.Missing, "notes": result.Notes,
	}
	// Chưa ghép được thì không gọi AI và không trừ lượt
	if result.Status != outfit.StatusOK {
		if aiAvailable {
			data["quota"] = check.Quota
		}
		response.Success(c, http.StatusOK, "Đã xử lý yêu cầu ghép outfit", data)
		return
	}
	steps = append(steps, aiapi.TraceStep{
		Name: "Lọc và ghép bộ", Status: "ok",
		Detail: fmt.Sprintf("%d bộ ứng viên, kiểu giá %s", len(result.Candidates), req.PriceMode), Ms: millisSince(step),
	})

	index, reason, source := 0, "", "rule"
	if aiAvailable {
		choice, err := h.ai.ChooseOutfit(c.Request.Context(), aiapi.OutfitChooseRequest{
			Caller: caller, Gender: req.Gender, Sport: h.sportName(req.SportID),
			Candidates: toCandidates(result.Candidates), Terms: h.knownTerms(),
			Steps: steps, ElapsedMs: millisSince(started),
		})
		switch {
		case err != nil:
			log.Printf("Outfit: dùng kết quả theo bộ lọc vì AI Service lỗi: %v", err)
		case choice.LimitReached:
			rejectOverLimit(c, choice.Message)
			return
		case choice.Index >= 0 && choice.Index < len(result.Candidates):
			index, reason, source = choice.Index, choice.Reason, choice.Source
			data["trace_id"], data["quota"] = choice.TraceID, choice.Quota
		}
	}

	data["outfit"], data["reason"], data["source"] = result.Candidates[index], reason, source
	response.Success(c, http.StatusOK, "Đã xử lý yêu cầu ghép outfit", data)
}

// toCandidates chỉ giữ thông tin cần để chọn đồ: không gửi giá, kho hay mã sản phẩm sang AI.
func toCandidates(outfits []outfit.Outfit) []aiapi.Candidate {
	candidates := make([]aiapi.Candidate, len(outfits))
	for i, entry := range outfits {
		for _, item := range entry.Items {
			candidates[i].Items = append(candidates[i].Items, aiapi.Item{
				Slot: string(item.Slot), Name: item.Name, Brand: item.Brand, Color: item.Color, Sport: item.Sport,
			})
		}
	}
	return candidates
}

func (h *OutfitHandler) sportName(id string) string {
	if id == "" {
		return ""
	}
	var sport models.Sport
	if err := h.db.Limit(1).Find(&sport, "id::text = ?", id).Error; err != nil {
		return ""
	}
	return sport.Name
}

func (h *OutfitHandler) knownTerms() aiapi.Terms {
	var terms aiapi.Terms
	h.db.Model(&models.Color{}).Pluck("name", &terms.Colors)
	h.db.Model(&models.Sport{}).Pluck("name", &terms.Sports)
	h.db.Model(&models.Product{}).Distinct("brand").Where("brand <> ''").Pluck("brand", &terms.Brands)
	return terms
}
