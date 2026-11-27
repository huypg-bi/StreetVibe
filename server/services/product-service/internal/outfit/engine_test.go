package outfit

import (
	"testing"

	"streetvibe/product-service/internal/models"

	"github.com/google/uuid"
)

func category(parent, slug string) *models.Category {
	return &models.Category{Slug: slug, Parent: &models.Category{Slug: parent}}
}

func product(name, brand string, cat *models.Category, price, sale float64, sizeType string, sizes ...string) models.Product {
	color := &models.Color{ID: uuid.New(), Name: "Đen"}
	p := models.Product{ID: uuid.New(), Name: name, Brand: brand, Category: cat, Price: price, SalePrice: sale, IsOnSale: sale < price}
	for _, size := range sizes {
		p.Variants = append(p.Variants, models.ProductVariant{
			ID: uuid.New(), ColorID: color.ID, Color: color, StockQuantity: 5,
			Size: &models.Size{Name: size, SizeType: sizeType},
		})
	}
	return p
}

func catalog() []models.Product {
	return []models.Product{
		product("Áo A", "Puma", category("apparel", "t-shirt"), 700, 630, "apparel", "M", "L"),
		product("Áo B", "Adidas", category("apparel", "hoodie"), 500, 500, "apparel", "M"),
		product("Quần A", "Puma", category("apparel", "apparel-short"), 900, 900, "apparel", "M"),
		product("Giày A", "Puma", category("footwear", "sneakers"), 1000, 1000, "footwear", "41"),
		product("Giày B", "Puma", category("footwear", "sneakers"), 2000, 1500, "footwear", "41"),
		product("Tất", "Adidas", category("footwear", "sock"), 100, 100, "footwear", "41"),
	}
}

func prefs() Preferences {
	return Preferences{Gender: "Nam", TopSize: "M", BottomSize: "M", ShoeSize: "41", PriceMode: PriceBest}
}

func TestSlotOf(t *testing.T) {
	cases := map[[2]string]Slot{
		{"apparel", "t-shirt"}: SlotTop, {"apparel", "hoodie"}: SlotTop, {"apparel", "apparel-jacket"}: SlotTop,
		{"apparel", "apparel-short"}: SlotBottom, {"apparel", "apparel-sport-pant"}: SlotBottom, {"apparel", "apparel-jogger"}: SlotBottom,
		{"footwear", "sneakers"}: SlotShoes, {"footwear", "sock"}: SlotSocks,
		{"accessories", "accessories-bag"}: SlotAccessory,
	}
	for input, want := range cases {
		if got, ok := SlotOf(category(input[0], input[1])); !ok || got != want {
			t.Errorf("%v: got %q want %q", input, got, want)
		}
	}
}

func TestBestPriceAndSavings(t *testing.T) {
	items := catalog()
	result := Build(items, items[2], prefs())
	if result.Status != StatusOK {
		t.Fatalf("status %s %s", result.Status, result.Message)
	}
	best := result.Candidates[0]
	if best.Total != 500+900+1000 || best.Savings != 0 || len(best.Items) != 3 {
		t.Fatalf("bộ rẻ nhất sai: %+v", best)
	}
	for _, candidate := range result.Candidates {
		if candidate.Total != best.Total {
			t.Fatalf("chế độ giá tốt nhất không được trả bộ đắt hơn: %v", candidate.Total)
		}
		if !candidate.Items[1].IsAnchor {
			t.Fatal("món đang xem phải nằm trong bộ")
		}
	}
}

func TestSaleBudgetAndOptional(t *testing.T) {
	items := catalog()
	p := prefs()
	p.PriceMode = PriceSale
	p.IncludeSocks, p.IncludeAccessory = true, true
	result := Build(items, items[2], p)
	best := result.Candidates[0]
	if best.SaleCount != 2 || best.Savings != 70+500 || len(best.Items) != 4 || len(result.Notes) != 1 {
		t.Fatalf("bộ giảm giá sai: %+v notes=%v", best, result.Notes)
	}

	p = prefs()
	p.PriceMode, p.Budget = PriceBudget, 2500
	for _, candidate := range Build(items, items[2], p).Candidates {
		if candidate.Total > 2500 {
			t.Fatalf("vượt ngân sách: %v", candidate.Total)
		}
	}
	p.Budget = 100
	if got := Build(items, items[2], p); got.Status != StatusNoMatch {
		t.Fatalf("ngân sách quá thấp phải báo no_match, got %s", got.Status)
	}
}

func TestBrandMissingThenFill(t *testing.T) {
	items := catalog()
	p := prefs()
	p.Brands = []string{"Adidas"}
	result := Build(items, items[1], p)
	if result.Status != StatusMissing || len(result.Missing) != 2 {
		t.Fatalf("phải báo thiếu quần và giày: %+v", result)
	}
	p.AllowOtherBrands = true
	if got := Build(items, items[1], p); got.Status != StatusOK || got.Candidates[0].Items[1].Note == "" {
		t.Fatalf("phải bù được từ nhãn khác: %+v", got)
	}
}

func TestSizes(t *testing.T) {
	items := catalog()
	p := prefs()
	p.ShoeSize = "44"
	if got := Build(items, items[0], p); got.Status != StatusUnavailable {
		t.Fatalf("không có giày size 44: %+v", got)
	}

	oversize := product("Áo rộng", "Puma", category("apparel", "t-shirt"), 100, 100, "apparel", "L", "XL")
	if len(itemsFor(oversize, SlotTop, prefs())) != 0 {
		t.Fatal("form thường không được tự đổi size")
	}
	oversize.Fit = "OVERSIZED"
	got := itemsFor(oversize, SlotTop, prefs())
	if len(got) != 1 || got[0].Size != "L" || got[0].Note == "" {
		t.Fatalf("oversize: khách mặc M phải được L kèm ghi chú: %+v", got)
	}
	small := prefs()
	small.TopSize = "S"
	if len(itemsFor(oversize, SlotTop, small)) != 0 {
		t.Fatal("chỉ nới từ M lên L")
	}
	alias := product("Áo XXL", "Puma", category("apparel", "t-shirt"), 100, 100, "apparel", "XXL")
	big := prefs()
	big.TopSize = "2XL"
	if len(itemsFor(alias, SlotTop, big)) != 1 {
		t.Fatal("2XL và XXL là một")
	}
}

func TestGender(t *testing.T) {
	items := catalog()
	for i := range items {
		items[i].Gender = "Unisex"
	}
	items[1].Gender = "Nữ" // Áo B
	result := Build(items, items[2], prefs())
	for _, candidate := range result.Candidates {
		if candidate.Items[0].Name == "Áo B" {
			t.Fatal("khách Nam không được gợi ý đồ Nữ")
		}
	}
	if anchored := Build(items, items[1], prefs()); anchored.Status != StatusOK || anchored.Candidates[0].Items[0].Note == "" {
		t.Fatalf("món đang xem được giữ kèm ghi chú: %+v", anchored)
	}
}
