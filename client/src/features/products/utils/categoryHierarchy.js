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

export function isFootwearCategory(categoryId, categories) {
    const familyName = getCategoryFamilyName(categoryId, categories);
    return familyName === "footwear" || familyName === "shoes";
}

export function isApparelCategory(categoryId, categories) {
    return getCategoryFamilyName(categoryId, categories) === "apparel";
}
