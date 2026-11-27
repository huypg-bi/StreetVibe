package ai

import (
	"regexp"
	"strings"
	"unicode"

	"streetvibe/shared/aiapi"
)

// Màu hay gặp, kể cả màu chưa đăng ký trong hệ thống
var commonColors = []string{"trắng", "đen", "xám", "đỏ", "vàng", "hồng", "tím", "cam", "nâu", "be", "xanh lá", "xanh dương", "xanh navy", "xanh rêu"}

var pricePattern = regexp.MustCompile(`(?i)\d[\d.,]*\s*(₫|đ($|[^\p{L}])|vnd|vnđ|k($|[^\p{L}])|nghìn|ngàn|triệu)|giá rẻ|giảm giá`)

// words chuẩn hóa thành chuỗi các từ cách nhau một dấu cách, có đệm hai đầu để khớp trọn từ.
func words(text string) string {
	fields := strings.FieldsFunc(strings.ToLower(text), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r) && !unicode.IsMark(r)
	})
	return " " + strings.Join(fields, " ") + " "
}

func mentions(text, term string) bool {
	term = strings.TrimSpace(words(term))
	return term != "" && strings.Contains(text, " "+term+" ")
}

// CheckReason đối chiếu lời giải thích với dữ liệu gốc của bộ đã chọn. Đây là kiểm tra theo quy tắc,
// chỉ phát hiện được màu, môn, nhãn và giá bị nhắc sai, không thay được người đánh giá.
func CheckReason(reason string, chosen aiapi.Candidate, preferredSport string, terms aiapi.Terms) []string {
	var flags []string
	if strings.TrimSpace(reason) == "" {
		return []string{"AI không đưa ra lời giải thích"}
	}
	text := words(reason)

	var colors, sports, brands, names strings.Builder
	for _, item := range chosen.Items {
		colors.WriteString(words(item.Color))
		sports.WriteString(words(item.Sport))
		brands.WriteString(words(item.Brand))
		names.WriteString(words(item.Name))
	}

	seen := map[string]bool{}
	for _, color := range append(append([]string(nil), commonColors...), terms.Colors...) {
		key := strings.TrimSpace(words(color))
		if seen[key] || !mentions(text, color) {
			continue
		}
		seen[key] = true
		// Màu có trong tên sản phẩm (ví dụ "White Black") cũng tính là đúng
		if !mentions(colors.String(), color) && !mentions(names.String(), color) {
			flags = append(flags, "Nhắc màu \""+color+"\" không có trong bộ")
		}
	}
	for _, sport := range terms.Sports {
		if mentions(text, sport) && !mentions(sports.String(), sport) && !strings.EqualFold(sport, preferredSport) {
			flags = append(flags, "Nhắc môn \""+sport+"\" không liên quan tới bộ")
		}
	}
	for _, brand := range terms.Brands {
		if mentions(text, brand) && !mentions(brands.String(), brand) {
			flags = append(flags, "Nhắc nhãn \""+brand+"\" không có trong bộ")
		}
	}
	if pricePattern.MatchString(reason) {
		flags = append(flags, "Nhắc đến giá tiền dù không được cung cấp")
	}
	return flags
}
