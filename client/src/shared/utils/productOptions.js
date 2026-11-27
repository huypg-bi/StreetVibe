// Logic của khối "Màu sắc & Kích cỡ": mỗi ô (màu × size) có số lượng thì là một biến thể được bán.
import { fromVnDateTimeInput, toVnDateTimeInput } from "./pricing";
import { filterSizesByFootwear, sortSizeNames } from "../../features/products/utils/categoryHierarchy";

export const cellKey = (colorId, sizeId) => `${colorId}:${sizeId}`;

const unique = (values) => Array.from(new Set(values));

// Trạng thái ban đầu: màu, size, số lượng đã có của sản phẩm được chọn sẵn
export function createOptionsDraft(product) {
    const variants = product?.variants ?? [];
    return {
        colorIds: unique(variants.map((variant) => variant.color_id)),
        sizeIds: unique(variants.map((variant) => variant.size_id)),
        cells: Object.fromEntries(
            variants.map((variant) => [cellKey(variant.color_id, variant.size_id), String(variant.stock_quantity)])
        ),
        discount: {
            percent: String(product?.discount_percent || 0),
            start: toVnDateTimeInput(product?.discount_start),
            end: toVnDateTimeInput(product?.discount_end),
        },
    };
}

// Size đúng loại (giày / quần áo), kèm size sản phẩm đang dùng để vẫn bỏ chọn được khi đổi danh mục
export function getVisibleSizes(allSizes, isFootwear, product) {
    const used = new Set((product?.variants ?? []).map((variant) => variant.size_id));
    const matching = new Set(filterSizesByFootwear(allSizes, isFootwear).map((size) => size.id));
    const byName = new Map(
        allSizes.filter((size) => matching.has(size.id) || used.has(size.id)).map((size) => [size.name, size])
    );
    return sortSizeNames([...byName.keys()]).map((name) => byName.get(name));
}

// Tách biến thể hiện có thành loại hiển thị được trên bảng và loại không (màu/size đã bị xóa)
function splitVariants(product, colors, sizes) {
    const colorIds = new Set(colors.map((color) => color.id));
    const sizeIds = new Set(sizes.map((size) => size.id));
    const shown = [];
    const hidden = [];
    (product?.variants ?? []).forEach((variant) => {
        (colorIds.has(variant.color_id) && sizeIds.has(variant.size_id) ? shown : hidden).push(variant);
    });
    return { shown, hidden };
}

// Các ô đang được chọn và đã nhập số lượng
function filledCells(draft, colors, sizes) {
    return colors
        .filter((color) => draft.colorIds.includes(color.id))
        .flatMap((color) => sizes
            .filter((size) => draft.sizeIds.includes(size.id))
            .map((size) => ({ color, size, value: draft.cells[cellKey(color.id, size.id)] ?? "" })))
        .filter((cell) => String(cell.value).trim() !== "");
}

export function getTotalStock(product, draft, colors, sizes) {
    const { hidden } = splitVariants(product, colors, sizes);
    return filledCells(draft, colors, sizes).reduce((sum, cell) => sum + Number(cell.value || 0), 0)
        + hidden.reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0);
}

// So với dữ liệu đang lưu: ô mới hoặc đổi số lượng thì upsert, biến thể bị bỏ chọn hoặc xóa trống thì remove
export function getVariantChanges(product, draft, colors, sizes) {
    const cells = filledCells(draft, colors, sizes);
    const { shown } = splitVariants(product, colors, sizes);
    const current = new Map(shown.map((variant) => [cellKey(variant.color_id, variant.size_id), variant]));
    const kept = new Set();
    const upsert = [];
    let added = 0;

    cells.forEach(({ color, size, value }) => {
        const key = cellKey(color.id, size.id);
        const existing = current.get(key);
        kept.add(key);
        if (!existing) added += 1;
        if (!existing || existing.stock_quantity !== Number(value)) {
            upsert.push({ color_id: color.id, size_id: size.id, stock_quantity: Number(value) });
        }
    });
    const removed = shown.filter((variant) => !kept.has(cellKey(variant.color_id, variant.size_id)));

    return { upsert, remove: removed.map((variant) => variant.id), added };
}

// Trả câu báo lỗi, hoặc chuỗi rỗng khi hợp lệ
export function validateOptions(draft, colors, sizes) {
    const cells = filledCells(draft, colors, sizes);
    if (cells.some((cell) => !Number.isInteger(Number(cell.value)) || Number(cell.value) < 0)) {
        return "Số lượng phải là số nguyên từ 0 trở lên.";
    }
    const selectedColors = colors.filter((color) => draft.colorIds.includes(color.id));
    const selectedSizes = sizes.filter((size) => draft.sizeIds.includes(size.id));
    if (selectedColors.length > 0 && selectedSizes.length === 0) return "Hãy chọn ít nhất một kích cỡ cho màu đã chọn.";
    if (selectedSizes.length > 0 && selectedColors.length === 0) return "Hãy chọn ít nhất một màu cho kích cỡ đã chọn.";
    const emptyColor = selectedColors.find((color) => !cells.some((cell) => cell.color.id === color.id));
    if (emptyColor) return `Nhập số lượng cho màu ${emptyColor.name}, hoặc bỏ chọn màu này.`;
    const emptySize = selectedSizes.find((size) => !cells.some((cell) => cell.size.id === size.id));
    if (emptySize) return `Nhập số lượng cho size ${emptySize.name}, hoặc bỏ chọn size này.`;

    const { percent, start, end } = draft.discount;
    const value = Number(percent || 0);
    if (!Number.isInteger(value) || value < 0 || value > 99) return "Giảm giá phải là số nguyên từ 0 đến 99.";
    if (value > 0) {
        if (!start || !end) return "Vui lòng nhập đủ thời gian bắt đầu và kết thúc giảm giá.";
        if (end <= start) return "Thời gian kết thúc giảm giá phải sau thời gian bắt đầu.";
    }
    return "";
}

export const PRODUCT_GENDERS = ["Unisex", "Nam", "Nữ"];

const TEXT_FIELDS = ["name", "brand", "fit", "gender", "description", "category_id", "sport_id"];
const asText = (value) => String(value ?? "").replace(/\r\n/g, "\n");

// Chỉ gọi API sửa sản phẩm khi thông tin thật sự đổi, để sửa riêng tồn kho không phải duyệt lại
export function hasProductChanges(product, payload, compareStock) {
    const numberFields = ["price", "original_price", ...(compareStock ? ["stock"] : [])];
    return TEXT_FIELDS.some((key) => key in payload && asText(product[key]) !== asText(payload[key]))
        || numberFields.some((key) => Number(product[key] || 0) !== Number(payload[key] || 0));
}

// null khi chương trình giảm giá không đổi so với sản phẩm
export function getDiscountChange(draft, product) {
    const before = createOptionsDraft(product).discount;
    const { percent, start, end } = draft.discount;
    const value = Number(percent || 0);
    const oldValue = Number(before.percent);
    if (value === oldValue && (value === 0 || (start === before.start && end === before.end))) return null;
    return {
        discount_percent: value,
        discount_start: fromVnDateTimeInput(start),
        discount_end: fromVnDateTimeInput(end),
    };
}
