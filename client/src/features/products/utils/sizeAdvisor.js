// Gợi ý size quần áo bằng cách tra bảng size tiêu chuẩn của người Việt (cm / kg).
// Các dòng trong mỗi bảng phải xếp từ size nhỏ đến size lớn.
const row = (size, height, weight) => ({ size, height, weight });

// Áo nam và quần nam dùng chung số liệu
const MEN_ROWS = [
    row("M", [160, 164], [55, 60]),
    row("L", [165, 169], [61, 68]),
    row("XL", [170, 174], [69, 73]),
    row("2XL", [175, 180], [74, 78]),
    row("3XL", [165, 185], [79, 82]),
    row("4XL", [165, 185], [80, 90]),
];

export const SIZE_CHARTS = {
    Nam: {
        top: MEN_ROWS,
        bottom: MEN_ROWS,
    },
    Nữ: {
        top: [
            row("S", [153, 155], [43, 46]),
            row("M", [153, 158], [46, 53]),
            row("L", [155, 162], [53, 57]),
            row("XL", [155, 170], [57, 63]),
            row("2XL", [155, 175], [63, 65]),
        ],
        bottom: [
            row("S", [148, 155], [43, 47]),
            row("M", [153, 158], [48, 53]),
            row("L", [155, 162], [54, 58]),
        ],
    },
};

export const SIZE_GENDERS = Object.keys(SIZE_CHARTS);

export const GARMENT_LABELS = { top: "Áo", bottom: "Quần" };

// Cùng một size nhưng cửa hàng có thể đặt tên khác nhau
const SIZE_ALIASES = {
    "2XL": ["2XL", "XXL"],
    "3XL": ["3XL", "XXXL"],
};

// Quần nam đánh số: size 29 tương đương size M
const MEN_BOTTOM_ALIASES = { M: ["M", "29"] };

const LETTER_OR_WAIST_SIZE = /^(X{0,3}S|M|X{0,3}L|[2-5]XL|29)$/i;
const NON_GARMENT_CATEGORY = /sock|tất|vớ|bag|túi|balo|hat|cap|mũ|nón|accessor|phụ kiện|footwear|sneaker|shoe|giày|dép/i;
const BOTTOM_CATEGORY = /quần|pants?\b|shorts?\b|jeans?\b|cargo|jogger|legging|trouser|bottom/i;

const inRange = (value, [min, max]) => value >= min && value <= max;

// "top" | "bottom" nếu sản phẩm là quần áo tính được size, ngược lại null
export function getGarmentType(product, sizeOptions = []) {
    if (!product) return null;
    const hasGarmentSize = sizeOptions.some(
        (option) => !option.isFootwear && LETTER_OR_WAIST_SIZE.test(String(option.name).trim())
    );
    if (!hasGarmentSize) return null;

    const category = [product.category?.name, product.category?.slug, product.category?.parent?.name]
        .filter(Boolean)
        .join(" ");
    if (NON_GARMENT_CATEGORY.test(category)) return null;
    return BOTTOM_CATEGORY.test(category) ? "bottom" : "top";
}

// Trả null khi thiếu dữ liệu; size = null khi cân nặng vượt size lớn nhất của bảng.
// Cân nặng quyết định size; nếu chiều cao ứng với size lớn hơn thì chỉ nới thêm tối đa 1 size.
export function recommendSize({ gender, garment, heightCm, weightKg }) {
    const rows = SIZE_CHARTS[gender]?.[garment];
    const height = Number(heightCm);
    const weight = Number(weightKg);
    if (!rows || !(height > 0) || !(weight > 0)) return null;

    const weightIndex = rows.findIndex((item) => weight <= item.weight[1]);
    if (weightIndex === -1) {
        return {
            size: null,
            exact: false,
            note: `Cân nặng của bạn vượt bảng size ${GARMENT_LABELS[garment].toLowerCase()} ${gender.toLowerCase()} (tối đa ${rows.at(-1).weight[1]} kg).`,
        };
    }

    // Nhẹ hơn cả size nhỏ nhất thì không nới theo chiều cao, tránh đồ càng rộng
    if (weight < rows[0].weight[0]) {
        return {
            size: rows[0].size,
            exact: false,
            note: "Cân nặng của bạn thấp hơn bảng size nên size nhỏ nhất có thể hơi rộng.",
        };
    }

    const foundHeightIndex = rows.findIndex((item) => height <= item.height[1]);
    const heightIndex = foundHeightIndex === -1 ? rows.length - 1 : foundHeightIndex;
    const match = rows[heightIndex > weightIndex ? weightIndex + 1 : weightIndex];
    const exact = inRange(height, match.height) && inRange(weight, match.weight);
    const note = exact
        ? "Khớp cả chiều cao và cân nặng trong bảng size."
        : "Số đo của bạn không nằm trọn trong một dòng, size được ước lượng chủ yếu theo cân nặng.";
    return { size: match.size, exact, note };
}

// Tìm size của sản phẩm ứng với size gợi ý (kể cả tên gọi khác)
export function findSizeOption(sizeOptions, size, { gender, garment } = {}) {
    if (!size) return undefined;
    const aliases = (gender === "Nam" && garment === "bottom" && MEN_BOTTOM_ALIASES[size])
        || SIZE_ALIASES[size]
        || [size];
    const matches = sizeOptions.filter((option) => aliases.includes(String(option.name).trim().toUpperCase()));
    return matches.find((option) => option.stock > 0) ?? matches[0];
}
