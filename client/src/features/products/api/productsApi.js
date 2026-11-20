import { apiClient, normalizeProduct, normalizeCategory } from "../../../shared/api/apiClient";

// ============================================
// PRODUCTS API
// ============================================
export async function getProducts(params = {}) {
    const res = await apiClient.get("/products", { params });
    const items = res.data?.data?.items || res.data?.data || [];
    return Array.isArray(items) ? items.map(normalizeProduct) : [];
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
export async function getCart() {
    const res = await apiClient.get("/cart");
    const items = res.data?.data?.items || [];
    return {
        result: {
            items: items.map((it) => ({
                ...it,
                product: normalizeProduct(it.product),
            })),
        },
    };
}

export async function addToCart(productId, quantity) {
    const res = await apiClient.post("/cart/items", {
        product_id: productId,
        quantity: Number(quantity),
    });
    const items = res.data?.data?.items || [];
    return {
        result: {
            items: items.map((it) => ({
                ...it,
                product: normalizeProduct(it.product),
            })),
        },
    };
}

export async function updateCartQuantity(productId, quantity) {
    const res = await apiClient.put(`/cart/items/${productId}`, {
        quantity: Number(quantity),
    });
    const items = res.data?.data?.items || [];
    return {
        result: {
            items: items.map((it) => ({
                ...it,
                product: normalizeProduct(it.product),
            })),
        },
    };
}

export async function removeCartItem(productId) {
    const res = await apiClient.delete(`/cart/items/${productId}`);
    const items = res.data?.data?.items || [];
    return {
        result: {
            items: items.map((it) => ({
                ...it,
                product: normalizeProduct(it.product),
            })),
        },
    };
}
