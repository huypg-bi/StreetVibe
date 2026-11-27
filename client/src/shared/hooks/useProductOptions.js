import { useState } from "react";
import { isFootwearCategory } from "../../features/products/utils/categoryHierarchy";
import {
    createOptionsDraft,
    getDiscountChange,
    getTotalStock,
    getVariantChanges,
    getVisibleSizes,
    validateOptions,
} from "../utils/productOptions";

// Trạng thái khối "Màu sắc & Kích cỡ" của form tạo / sửa sản phẩm, dùng chung cho Admin và Supplier.
// api: { syncVariants(productId, changes), saveDiscount(productId, discount) }
export function useProductOptions({ product, attributes, categoryId, categories, api }) {
    const [draft, setDraft] = useState(() => createOptionsDraft(product));
    const isFootwear = isFootwearCategory(categoryId, categories);
    const colors = attributes.colors || [];
    const sizes = getVisibleSizes(attributes.sizes || [], isFootwear, product);
    const changes = getVariantChanges(product, draft, colors, sizes);
    const totalStock = getTotalStock(product, draft, colors, sizes);
    // Có biến thể thì tồn kho sản phẩm là tổng các ô, không nhập tay
    const usesVariants = Boolean(product?.variants?.length) || changes.upsert.length > 0;

    // target là sản phẩm đã có trên server (vừa tạo hoặc đang sửa)
    const save = async (target) => {
        // Giảm giá lưu trước: biến thể lưu trong một giao dịch ở bước cuối nên thử lại luôn an toàn
        const discount = getDiscountChange(draft, target);
        if (discount) await api.saveDiscount(target.id, discount);

        const { upsert, remove, added } = getVariantChanges(target, draft, colors, sizes);
        if (upsert.length > 0 || remove.length > 0) await api.syncVariants(target.id, { upsert, remove });
        return { added };
    };

    return {
        draft,
        setDraft,
        colors,
        sizes,
        isFootwear,
        totalStock,
        usesVariants,
        removedCount: changes.remove.length,
        validate: () => validateOptions(draft, colors, sizes),
        save,
    };
}
