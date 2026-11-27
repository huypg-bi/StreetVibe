import { apiClient, normalizeProduct, normalizeCategory } from "../../../shared/api/apiClient";

// ============================================
// PRODUCTS API
// ============================================
export async function getProducts(params = {}) {
    const result = await getProductsPage(params);
    return result.items;
}

export async function getProductsPage(params = {}) {
    const res = await apiClient.get("/products", { params });
    const data = res.data?.data;
    const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
            ? data
            : [];
    const limit = Number(data?.limit ?? params.limit ?? 12) || 12;
    const total = Number(data?.total ?? items.length);

    return {
        items: items.map(normalizeProduct),
        total,
        page: Number(data?.page ?? params.page ?? 1),
        limit,
        totalPages: Math.max(1, Number(data?.total_pages ?? Math.ceil(total / limit)) || 1),
    };
}

export async function getBrands() {
    const res = await apiClient.get("/products/brands");
    const brands = res.data?.data?.items || [];
    return Array.isArray(brands) ? brands : [];
}

export async function getTrendingProducts(limit = 8, brand = "") {
    const res = await apiClient.get("/products/trending", { params: { limit, ...(brand ? { brand } : {}) } });
    const items = res.data?.data?.items || [];
    return items.map(normalizeProduct);
}

export async function getFeatured(limit = 8) {
    const res = await apiClient.get("/products/featured", { params: { limit } });
    const items = res.data?.data?.items || [];
    return items.map(normalizeProduct);
}

export async function getBestSellerByCategory(categorySlug = "all", limit = 8) {
    const res = await apiClient.get("/products/best-seller", {
        params: { categorySlug, limit },
    });
    const items = res.data?.data?.items || [];
    return items.map(normalizeProduct);
}

export async function getProductDetail(id) {
    const [prodRes, revRes] = await Promise.all([
        apiClient.get(`/products/${id}`),
        apiClient.get(`/products/${id}/reviews`),
    ]);

    const product = prodRes.data?.data ? normalizeProduct(prodRes.data.data) : null;
    const reviews = revRes.data?.data || [];

    return {
        product,
        reviews,
    };
}

// ============================================
// CATEGORIES API
// ============================================
export async function getCategories() {
    const res = await apiClient.get("/categories");
    const list = res.data?.data || [];
    return Array.isArray(list) ? list.map(normalizeCategory) : [];
}

// ============================================
// WISHLIST API
// ============================================
export async function getWishlist() {
    const res = await apiClient.get("/wishlist");
    const products = res.data?.data?.products || [];
    return {
        result: {
            products: products.map(normalizeProduct),
        },
    };
}

export async function addWishlist(productId) {
    const res = await apiClient.post("/wishlist/items", { product_id: productId });
    const products = res.data?.data?.products || [];
    return {
        result: {
            products: products.map(normalizeProduct),
        },
    };
}

export async function removeWishlist(productId) {
    const res = await apiClient.delete(`/wishlist/items/${productId}`);
    const products = res.data?.data?.products || [];
    return {
        result: {
            products: products.map(normalizeProduct),
        },
    };
}

// ============================================
// REVIEWS API
// ============================================
export async function addOrUpdateReview(productId, rating, comment) {
    const res = await apiClient.post(`/products/${productId}/reviews`, {
        rating: Number(rating),
        comment,
    });
    return res.data;
}

// ============================================
// CART API
// ============================================
export const CART_UPDATED_EVENT = "streetvibe:cart-updated";

// refreshPrices: tải lại giá mới nhất vì chương trình giảm giá có thời hạn
export async function getCart({ refreshPrices = false } = {}) {
    const res = await apiClient.get("/cart");
    const items = res.data?.data?.items || [];
    const hydratedItems = await Promise.all(items.map(async (item) => {
        let product = normalizeProduct(item.product);
        const needsProductData = !product?.name || !Number(product.price) || !product.image;
        // Tồn kho của biến thể trong giỏ; null nghĩa là chưa kiểm tra được
        let available = null;
        if (needsProductData || refreshPrices) {
            const productId = product?._id ?? item.product_id;
            try {
                if (!productId) {
                    throw new Error("Cart item is missing its product ID");
                }
                const productResponse = await apiClient.get(`/products/${productId}`);
                const latestProduct = productResponse.data?.data;
                if (!latestProduct) {
                    throw new Error(`Product ${productId} could not be loaded`);
                }
                product = normalizeProduct({ ...item.product, ...latestProduct });
                if (item.variant_id) {
                    const variant = latestProduct.variants?.find((entry) => entry.id === item.variant_id);
                    available = variant?.stock_quantity ?? 0;
                }
            } catch (error) {
                // Sản phẩm không còn bán: vẫn hiện theo dữ liệu đã lưu trong giỏ nếu đủ
                if (needsProductData) throw error;
                console.error("Không thể cập nhật giá sản phẩm trong giỏ:", error);
                if (error.response?.status === 404) available = 0;
            }
        }
        return { ...item, product, available };
    }));
    return {
        result: {
            items: hydratedItems,
        },
    };
}

export async function addToCart(productId, variantId, quantity) {
    const res = await apiClient.post("/cart/items", {
        product_id: productId,
        variant_id: variantId,
        quantity: Number(quantity),
    });
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    return res.data?.data;
}

export async function updateCartQuantity(itemId, quantity) {
    const res = await apiClient.put(`/cart/items/${itemId}`, { quantity: Number(quantity) });
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    return res.data?.data;
}

export async function removeCartItem(itemId) {
    const res = await apiClient.delete(`/cart/items/${itemId}`);
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    return res.data?.data;
}
