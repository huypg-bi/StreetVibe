export const CATEGORY_GROUP_NAMES = ["Apparel", "Footwear", "Accessories"];

export function isCategoryGroup(category) {
    return CATEGORY_GROUP_NAMES.some((name) =>
        name.toLowerCase() === String(category?.name || "").trim().toLowerCase()
    ) && !getCategoryParentId(category);
}

export function getCategoryId(category) {
    return category?._id ?? category?.id;
}

export function getCategoryParentId(category) {
    return category?.parentId ?? category?.parent_id ?? null;
}

export function getParentCategories(categories, excludedId = "") {
    return categories.filter((category) =>
        isCategoryGroup(category) && String(getCategoryId(category)) !== String(excludedId)
    );
}

export function getProductCategoryOptions(categories) {
    const parentsWithChildren = new Set(
        categories
            .map(getCategoryParentId)
            .filter(Boolean)
            .map(String)
    );
    const categoryById = new Map(categories.map((category) => [String(getCategoryId(category)), category]));

    return categories
        .filter((category) => {
            const parentId = getCategoryParentId(category);
            return Boolean(parentId) || (
                !isCategoryGroup(category) && !parentsWithChildren.has(String(getCategoryId(category)))
            );
        })
        .map((category) => {
            const parentId = getCategoryParentId(category);
            const parent = parentId ? categoryById.get(String(parentId)) : null;
            return {
                ...category,
                displayName: parent ? `${parent.name} / ${category.name}` : category.name,
            };
        });
}

export function getCategoryFamilyName(categoryId, categories) {
    const category = categories.find((item) => String(getCategoryId(item)) === String(categoryId));
    if (!category) return "";

    const parentId = getCategoryParentId(category);
    const parent = parentId
        ? categories.find((item) => String(getCategoryId(item)) === String(parentId))
        : null;
    return (parent ?? category).name.trim().toLowerCase();
}

export function isFootwearCategory(categoryId, categories = []) {
    const category = categories.find((item) => String(getCategoryId(item)) === String(categoryId));
    const catName = String(category?.name || "").trim().toLowerCase();
    const catSlug = String(category?.slug || "").trim().toLowerCase();
    if (["sneaker", "sneakers", "footwear", "shoe", "shoes", "giày", "sandals", "boots"].some((kw) => catName.includes(kw) || catSlug.includes(kw))) {
        return true;
    }
    const familyName = getCategoryFamilyName(categoryId, categories);
    return familyName === "footwear" || familyName === "shoes";
}

export function isApparelCategory(categoryId, categories = []) {
    return getCategoryFamilyName(categoryId, categories) === "apparel";
}

export function isFootwearProduct(product, categories = []) {
    if (!product) return false;
    const catId = product.category_id ?? product.categoryId ?? product.category?.id ?? product.category?._id;
    if (catId && categories.length > 0 && isFootwearCategory(catId, categories)) {
        return true;
    }
    const catName = String(product.category?.name || "").toLowerCase();
    const parentName = String(product.category?.parent?.name || "").toLowerCase();
    const prodName = String(product.name || "").toLowerCase();
    return ["sneaker", "footwear", "shoe", "giày", "boot"].some(
        (kw) => catName.includes(kw) || parentName.includes(kw) || prodName.includes(kw)
    );
}

export function isFootwearSizeValue(size) {
    if (!size) return false;
    if (size.size_type === "footwear") return true;
    if (size.size_type === "apparel") return false;
    const num = Number(String(size.name || "").trim());
    return !Number.isNaN(num) && num >= 35 && num <= 48;
}

export function filterSizesByFootwear(sizes = [], isFootwear = false) {
    return sizes.filter((s) => (isFootwear ? isFootwearSizeValue(s) : !isFootwearSizeValue(s)));
}

const APPAREL_SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "5XL"];

// Xếp size từ nhỏ đến lớn: size chữ theo bảng trên, size số theo giá trị
export function sortSizeNames(names = []) {
    const rank = (name) => {
        const index = APPAREL_SIZE_ORDER.indexOf(String(name).trim().toUpperCase());
        return index === -1 ? APPAREL_SIZE_ORDER.length : index;
    };
    return [...names].sort((a, b) =>
        rank(a) - rank(b) || String(a).localeCompare(String(b), "vi", { numeric: true })
    );
}

// Các màu đã đăng ký qua biến thể, kèm tổng tồn kho của mọi size
export function getVariantColorOptions(variants = []) {
    const options = new Map();
    variants.forEach(({ color_id: id, color, stock_quantity: quantity }) => {
        if (!color?.name) return;
        const option = options.get(id) ?? { id, name: color.name, hex: color.hex_code, stock: 0 };
        option.stock += Number(quantity || 0);
        options.set(id, option);
    });
    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

// Các size đã đăng ký qua biến thể, kèm tổng tồn kho của các biến thể truyền vào
export function getVariantSizeOptions(variants = []) {
    const options = new Map();
    variants.forEach(({ size, stock_quantity: quantity }) => {
        if (!size?.name) return;
        const option = options.get(size.name) ?? { name: size.name, isFootwear: isFootwearSizeValue(size), stock: 0 };
        option.stock += Number(quantity || 0);
        options.set(size.name, option);
    });
    return sortSizeNames([...options.keys()]).map((name) => options.get(name));
}
