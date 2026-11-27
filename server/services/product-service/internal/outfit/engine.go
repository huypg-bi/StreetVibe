// Package outfit lọc sản phẩm theo lựa chọn của khách, ghép thành các bộ hợp lệ và tính giá.
// AI chỉ được chọn trong các bộ do package này tạo ra, nên không thể bịa sản phẩm hay giá.
package outfit

import (
	"fmt"
	"math"
	"regexp"
	"sort"
	"strings"

	"streetvibe/product-service/internal/models"
)

type Slot string

const (
	SlotTop       Slot = "top"
	SlotBottom    Slot = "bottom"
	SlotShoes     Slot = "shoes"
	SlotSocks     Slot = "socks"
	SlotAccessory Slot = "accessory"
)

const (
	PriceBest   = "best"
	PriceSale   = "sale"
	PriceBudget = "budget"
)

const (
	StatusOK          = "ok"
	StatusMissing     = "missing"     // nhãn đã chọn thiếu món, có thể bù bằng nhãn khác
	StatusUnavailable = "unavailable" // không nhãn nào có món phù hợp size
	StatusNoMatch     = "no_match"    // có đủ món nhưng không đạt điều kiện giá
)

// Thứ tự hiển thị và ghép; ba món đầu là bắt buộc
var slotOrder = []Slot{SlotTop, SlotBottom, SlotShoes, SlotSocks, SlotAccessory}

var slotLabels = map[Slot]string{
	SlotTop: "áo", SlotBottom: "quần", SlotShoes: "giày", SlotSocks: "tất", SlotAccessory: "phụ kiện",
}

const (
	maxCoreOptions     = 12
	maxOptionalOptions = 6
	maxCandidates      = 6
)

type Preferences struct {
	Gender           string
	TopSize          string
	BottomSize       string
	ShoeSize         string
	Brands           []string
	AllowOtherBrands bool
	PriceMode        string
	Budget           float64
	SportID          string
	IncludeSocks     bool
	IncludeAccessory bool
	AnchorColorID    string
}

type Item struct {
	Slot      Slot    `json:"slot"`
	ProductID string  `json:"product_id"`
	VariantID string  `json:"variant_id"`
	Name      string  `json:"name"`
	Brand     string  `json:"brand"`
	Image     string  `json:"image"`
	Color     string  `json:"color"`
	Size      string  `json:"size"`
	Sport     string  `json:"sport"`
	Price     float64 `json:"price"`      // giá bán
	SalePrice float64 `json:"sale_price"` // giá khách trả lúc này
	OnSale    bool    `json:"on_sale"`
	IsAnchor  bool    `json:"is_anchor"`
	Note      string  `json:"note,omitempty"`
	sportID   string
}

type Outfit struct {
	Items      []Item  `json:"items"`
	Total      float64 `json:"total"`
	ListTotal  float64 `json:"list_total"`
	Savings    float64 `json:"savings"`
	SaleCount  int     `json:"-"`
	SportCount int     `json:"-"`
}

type Result struct {
	Status     string
	Message    string
	Missing    []string
	Notes      []string
	Candidates []Outfit // xếp từ phù hợp nhất
}

var (
	bottomPattern = regexp.MustCompile(`pant|short|jogger|jean|trouser|cargo|legging|bottom|quan`)
	sockPattern   = regexp.MustCompile(`sock|(^|-)tat($|-)|(^|-)vo($|-)`)
)

// SlotOf xác định vị trí trong bộ đồ từ slug danh mục và nhóm cha.
func SlotOf(category *models.Category) (Slot, bool) {
	if category == nil || category.Parent == nil {
		return "", false
	}
	slug := strings.ToLower(category.Slug)
	// Bỏ tiền tố nhóm cha ("apparel-short") để không nhận nhầm
	slug = strings.TrimPrefix(slug, strings.ToLower(category.Parent.Slug)+"-")
	switch strings.ToLower(category.Parent.Slug) {
	case "apparel":
		// "t-shirt" chứa "shirt", không chứa "short"
		if bottomPattern.MatchString(slug) {
			return SlotBottom, true
		}
		return SlotTop, true
	case "footwear":
		if sockPattern.MatchString(slug) {
			return SlotSocks, true
		}
		return SlotShoes, true
	case "accessories":
		return SlotAccessory, true
	}
	return "", false
}

var sizeAliases = map[string][]string{
	"2XL": {"2XL", "XXL"}, "XXL": {"2XL", "XXL"},
	"3XL": {"3XL", "XXXL"}, "XXXL": {"3XL", "XXXL"},
}

func sizeMatches(name string, wanted ...string) bool {
	name = strings.TrimSpace(name)
	for _, size := range wanted {
		if strings.EqualFold(name, size) {
			return true
		}
	}
	return false
}

func apparelSizes(slot Slot, prefs Preferences) []string {
	size := prefs.TopSize
	if slot == SlotBottom {
		size = prefs.BottomSize
	}
	size = strings.ToUpper(strings.TrimSpace(size))
	if size == "" {
		return nil
	}
	if aliases, ok := sizeAliases[size]; ok {
		return aliases
	}
	// Quần nam đánh số: size 29 tương đương M
	if slot == SlotBottom && prefs.Gender == "Nam" && size == "M" {
		return []string{"M", "29"}
	}
	return []string{size}
}

// itemsFor trả các lựa chọn (mỗi màu một lựa chọn) còn hàng và đúng size của một sản phẩm.
func itemsFor(product models.Product, slot Slot, prefs Preferences) []Item {
	var inStock []models.ProductVariant
	for _, variant := range product.Variants {
		if variant.StockQuantity > 0 && variant.Color != nil && variant.Size != nil {
			inStock = append(inStock, variant)
		}
	}
	pick := func(match func(models.ProductVariant) bool, note string) []Item {
		seen := map[string]bool{}
		var items []Item
		for _, variant := range inStock {
			if !match(variant) || seen[variant.Color.Name] {
				continue
			}
			seen[variant.Color.Name] = true
			items = append(items, newItem(product, variant, slot, note))
		}
		sort.SliceStable(items, func(i, j int) bool { return items[i].Color < items[j].Color })
		return items
	}

	switch slot {
	case SlotTop, SlotBottom:
		wanted := apparelSizes(slot, prefs)
		items := pick(func(v models.ProductVariant) bool { return sizeMatches(v.Size.Name, wanted...) }, "")
		// Form oversize thường bắt đầu từ L: khách mặc M vẫn chọn L được, kèm ghi chú
		if len(items) == 0 && strings.EqualFold(product.Fit, "OVERSIZED") && sizeMatches("M", wanted...) {
			items = pick(func(v models.ProductVariant) bool { return sizeMatches(v.Size.Name, "L") },
				"Form oversize không có size M, chọn size L nên mặc sẽ rộng hơn.")
		}
		return items
	case SlotShoes:
		return pick(func(v models.ProductVariant) bool { return sizeMatches(v.Size.Name, prefs.ShoeSize) }, "")
	case SlotSocks:
		return pick(func(v models.ProductVariant) bool {
			// Tất đăng ký theo size chân thì phải đúng size giày
			return v.Size.SizeType != "footwear" || sizeMatches(v.Size.Name, prefs.ShoeSize)
		}, "")
	default:
		return pick(func(models.ProductVariant) bool { return true }, "")
	}
}

func newItem(product models.Product, variant models.ProductVariant, slot Slot, note string) Item {
	item := Item{
		Slot: slot, ProductID: product.ID.String(), VariantID: variant.ID.String(),
		Name: product.Name, Brand: product.Brand, Image: product.Image,
		Color: variant.Color.Name, Size: variant.Size.Name,
		Price: product.Price, SalePrice: product.SalePrice, OnSale: product.IsOnSale, Note: note,
	}
	if product.Sport != nil && product.SportID != nil {
		item.Sport = product.Sport.Name
		item.sportID = product.SportID.String()
	}
	return item
}

// fitsGender: sản phẩm Unisex (hoặc chưa đặt) hợp với mọi khách.
func fitsGender(product models.Product, gender string) bool {
	return product.Gender == "" || product.Gender == models.GenderUnisex || product.Gender == gender
}

func inBrands(brand string, brands []string) bool {
	if len(brands) == 0 {
		return true
	}
	for _, wanted := range brands {
		if strings.EqualFold(strings.TrimSpace(brand), strings.TrimSpace(wanted)) {
			return true
		}
	}
	return false
}

func isRequired(slot Slot) bool {
	return slot == SlotTop || slot == SlotBottom || slot == SlotShoes
}

// Build ghép các bộ đồ quanh sản phẩm đang xem (anchor).
func Build(products []models.Product, anchor models.Product, prefs Preferences) Result {
	anchorSlot, ok := SlotOf(anchor.Category)
	if !ok {
		return Result{Status: StatusUnavailable, Message: "Sản phẩm này chưa thuộc nhóm có thể ghép outfit."}
	}

	anchorItems := itemsFor(anchor, anchorSlot, prefs)
	if len(anchorItems) == 0 {
		return Result{Status: StatusUnavailable, Message: fmt.Sprintf(
			"Sản phẩm đang xem không còn hàng đúng size của bạn (%s).", sizeText(anchorSlot, prefs))}
	}
	// Giữ màu khách đang xem nếu màu đó có đúng size
	for _, variant := range anchor.Variants {
		if variant.ColorID.String() != prefs.AnchorColorID || variant.Color == nil {
			continue
		}
		for _, item := range anchorItems {
			if item.Color == variant.Color.Name {
				anchorItems = []Item{item}
				break
			}
		}
		break
	}
	for i := range anchorItems {
		anchorItems[i].IsAnchor = true
		// Khách đang chủ động xem món này nên vẫn giữ, chỉ báo cho biết
		if !fitsGender(anchor, prefs.Gender) {
			anchorItems[i].Note = strings.TrimSpace(anchorItems[i].Note + " Sản phẩm này dành cho " + anchor.Gender + ".")
		}
	}

	preferred := map[Slot][]Item{}
	others := map[Slot][]Item{}
	for _, product := range products {
		slot, ok := SlotOf(product.Category)
		if !ok || slot == anchorSlot || product.ID == anchor.ID || !fitsGender(product, prefs.Gender) {
			continue
		}
		items := itemsFor(product, slot, prefs)
		if inBrands(product.Brand, prefs.Brands) {
			preferred[slot] = append(preferred[slot], items...)
		} else {
			others[slot] = append(others[slot], items...)
		}
	}

	result := Result{Status: StatusOK}
	pools := map[Slot][]Item{anchorSlot: anchorItems}
	var fillable, unavailable []Slot
	for _, slot := range slotOrder {
		if slot == anchorSlot ||
			(slot == SlotSocks && !prefs.IncludeSocks) ||
			(slot == SlotAccessory && !prefs.IncludeAccessory) {
			continue
		}
		items := preferred[slot]
		if len(items) == 0 && len(others[slot]) > 0 {
			// Món tuỳ chọn được tự bù; món bắt buộc phải hỏi khách trước
			if prefs.AllowOtherBrands || !isRequired(slot) {
				items = others[slot]
				for i := range items {
					items[i].Note = strings.TrimSpace(items[i].Note + " Bù từ nhãn khác.")
				}
			} else {
				fillable = append(fillable, slot)
				continue
			}
		}
		if len(items) == 0 {
			if isRequired(slot) {
				unavailable = append(unavailable, slot)
			} else {
				result.Notes = append(result.Notes, fmt.Sprintf("Chưa có %s phù hợp nên bộ này không kèm %s.", slotLabels[slot], slotLabels[slot]))
			}
			continue
		}
		pools[slot] = limitOptions(items, slot, prefs)
	}

	if len(unavailable) > 0 {
		parts := make([]string, len(unavailable))
		for i, slot := range unavailable {
			parts[i] = fmt.Sprintf("%s (%s)", slotLabels[slot], sizeText(slot, prefs))
		}
		return Result{Status: StatusUnavailable, Missing: labels(unavailable),
			Message: "Chưa có sản phẩm còn hàng cho: " + strings.Join(parts, ", ") + "."}
	}
	if len(fillable) > 0 {
		return Result{Status: StatusMissing, Missing: labels(fillable), Message: fmt.Sprintf(
			"Nhãn bạn chọn chưa có %s đúng size.", strings.Join(labels(fillable), ", "))}
	}

	return selectOutfits(combine(pools), prefs, result)
}

func labels(slots []Slot) []string {
	out := make([]string, len(slots))
	for i, slot := range slots {
		out[i] = slotLabels[slot]
	}
	return out
}

func sizeText(slot Slot, prefs Preferences) string {
	switch slot {
	case SlotTop:
		return "size " + prefs.TopSize
	case SlotBottom:
		return "size " + prefs.BottomSize
	case SlotShoes, SlotSocks:
		return "size giày " + prefs.ShoeSize
	}
	return "còn hàng"
}

func matchesSport(item Item, prefs Preferences) bool {
	return prefs.SportID != "" && item.sportID == prefs.SportID
}

// limitOptions giữ số lựa chọn vừa phải, ưu tiên theo kiểu giá nhưng luôn còn món rẻ nhất.
func limitOptions(items []Item, slot Slot, prefs Preferences) []Item {
	limit := maxCoreOptions
	if !isRequired(slot) {
		limit = maxOptionalOptions
	}
	sorted := append([]Item(nil), items...)
	sort.SliceStable(sorted, func(i, j int) bool {
		a, b := sorted[i], sorted[j]
		if prefs.PriceMode == PriceSale && a.OnSale != b.OnSale {
			return a.OnSale
		}
		if prefs.PriceMode != PriceBest && matchesSport(a, prefs) != matchesSport(b, prefs) {
			return matchesSport(a, prefs)
		}
		if a.SalePrice != b.SalePrice {
			return a.SalePrice < b.SalePrice
		}
		if matchesSport(a, prefs) != matchesSport(b, prefs) {
			return matchesSport(a, prefs)
		}
		return a.Name < b.Name
	})
	if len(sorted) <= limit {
		return sorted
	}
	cheapest := sorted[0]
	for _, item := range sorted {
		if item.SalePrice < cheapest.SalePrice {
			cheapest = item
		}
	}
	kept := sorted[:limit]
	for _, item := range kept {
		if item.VariantID == cheapest.VariantID {
			return kept
		}
	}
	kept[limit-1] = cheapest
	return kept
}

func combine(pools map[Slot][]Item) []Outfit {
	combos := [][]Item{{}}
	for _, slot := range slotOrder {
		items, ok := pools[slot]
		if !ok {
			continue
		}
		next := make([][]Item, 0, len(combos)*len(items))
		for _, combo := range combos {
			for _, item := range items {
				next = append(next, append(append([]Item(nil), combo...), item))
			}
		}
		combos = next
	}
	outfits := make([]Outfit, len(combos))
	for i, items := range combos {
		outfit := Outfit{Items: items}
		for _, item := range items {
			outfit.Total += item.SalePrice
			outfit.ListTotal += item.Price
			if item.OnSale {
				outfit.SaleCount++
			}
		}
		outfit.Savings = math.Max(0, outfit.ListTotal-outfit.Total)
		outfits[i] = outfit
	}
	return outfits
}

func selectOutfits(outfits []Outfit, prefs Preferences, result Result) Result {
	if len(outfits) == 0 {
		return Result{Status: StatusUnavailable, Message: "Chưa ghép được bộ nào."}
	}
	for i := range outfits {
		for _, item := range outfits[i].Items {
			if matchesSport(item, prefs) {
				outfits[i].SportCount++
			}
		}
	}
	cheapest := outfits[0].Total
	for _, outfit := range outfits {
		cheapest = math.Min(cheapest, outfit.Total)
	}

	var matched []Outfit
	switch prefs.PriceMode {
	case PriceSale:
		most := 0
		for _, outfit := range outfits {
			if outfit.SaleCount > most {
				most = outfit.SaleCount
			}
		}
		if most == 0 {
			return Result{Status: StatusNoMatch, Message: "Hiện không có món đang giảm giá phù hợp. Hãy thử kiểu giá khác."}
		}
		for _, outfit := range outfits {
			if outfit.SaleCount == most {
				matched = append(matched, outfit)
			}
		}
	case PriceBudget:
		for _, outfit := range outfits {
			if outfit.Total <= prefs.Budget {
				matched = append(matched, outfit)
			}
		}
		if len(matched) == 0 {
			message := fmt.Sprintf("Ngân sách chưa đủ. Bộ rẻ nhất phù hợp là %s.", formatVnd(cheapest))
			if prefs.IncludeSocks || prefs.IncludeAccessory {
				message += " Bạn có thể bỏ chọn tất hoặc phụ kiện."
			}
			return Result{Status: StatusNoMatch, Message: message}
		}
	default: // PriceBest: chỉ lấy các bộ rẻ nhất
		for _, outfit := range outfits {
			if outfit.Total-cheapest < 1 {
				matched = append(matched, outfit)
			}
		}
	}

	sort.SliceStable(matched, func(i, j int) bool {
		a, b := matched[i], matched[j]
		if a.SportCount != b.SportCount {
			return a.SportCount > b.SportCount
		}
		if a.Savings != b.Savings {
			return a.Savings > b.Savings
		}
		return a.Total < b.Total
	})
	result.Candidates = diverse(matched, maxCandidates)
	return result
}

// diverse chọn các bộ khác nhau rõ rệt (khác ít nhất 2 món) trước, rồi mới bù bộ gần giống.
func diverse(sorted []Outfit, limit int) []Outfit {
	var picked []Outfit
	used := make([]bool, len(sorted))
	for _, minDifference := range []int{2, 1} {
		for i, outfit := range sorted {
			if len(picked) >= limit {
				return picked
			}
			if used[i] {
				continue
			}
			distinct := true
			for _, other := range picked {
				if difference(outfit, other) < minDifference {
					distinct = false
					break
				}
			}
			if distinct {
				picked = append(picked, outfit)
				used[i] = true
			}
		}
	}
	return picked
}

func difference(a, b Outfit) int {
	ids := map[string]bool{}
	for _, item := range b.Items {
		ids[item.VariantID] = true
	}
	count := 0
	for _, item := range a.Items {
		if !ids[item.VariantID] {
			count++
		}
	}
	return count
}

func formatVnd(value float64) string {
	digits := fmt.Sprintf("%.0f", value)
	for i := len(digits) - 3; i > 0; i -= 3 {
		digits = digits[:i] + "." + digits[i:]
	}
	return digits + " ₫"
}
