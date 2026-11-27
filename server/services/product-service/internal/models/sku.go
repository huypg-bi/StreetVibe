package models

import (
	"strings"

	"github.com/google/uuid"
	"golang.org/x/text/unicode/norm"
)

// Quy tắc SKU dùng chung toàn hệ thống: <THƯƠNG HIỆU>-<6 ký tự cuối của ID>, vd: PUMA-F4CAF2.
// Mỗi sản phẩm chỉ có một mã, cấp một lần khi tạo; biến thể (màu, size) dùng chung mã này.
const defaultSKUBrand = "SV"

func BuildProductSKU(brand string, id uuid.UUID) string {
	prefix := skuSegment(brand)
	if prefix == "" {
		prefix = defaultSKUBrand
	}
	if len(prefix) > 12 {
		prefix = prefix[:12]
	}
	compactID := strings.ReplaceAll(id.String(), "-", "")
	return prefix + "-" + strings.ToUpper(compactID[len(compactID)-6:])
}

// skuSegment bỏ dấu tiếng Việt và chỉ giữ A-Z, 0-9 (vd: "Xanh lá" -> "XANHLA").
func skuSegment(value string) string {
	var segment strings.Builder
	for _, r := range strings.ToUpper(norm.NFD.String(value)) {
		if r == 'Đ' {
			r = 'D'
		}
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			segment.WriteRune(r)
		}
	}
	return segment.String()
}
