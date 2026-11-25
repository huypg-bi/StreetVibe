import { apiClient, normalizeProduct, normalizeCategory } from "../../../shared/api/apiClient";

// ============================================
// PRODUCTS API
// ============================================
export async function getProducts(params = {}) {
    const res = await apiClient.get("/products", { params });
    const items = res.data?.data?.items || res.data?.data || [];
    return Array.isArray(items) ? items.map(normalizeProduct) : [];
}

export async function getBrands() {
    const res = await apiClient.get("/products/brands");
    const brands = res.data?.data?.items || [];
    return Array.isArray(brands) ? brands : [];
}

export async function getTrendingProducts(limit = 8) {
    const res = await apiClient.get("/products/trending", { params: { limit } });
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

export async function getCart() {
    const res = await apiClient.get("/cart");
    const items = res.data?.data?.items || [];
    const hydratedItems = await Promise.all(items.map(async (item) => {
        let product = normalizeProduct(item.product);
        const needsProductData = !product?.name || !Number(product.price) || !product.image;
        if (needsProductData) {
            const productId = product?._id ?? item.product_id;
            if (!productId) {
                throw new Error("Cart item is missing its product ID");
            }
            const productResponse = await apiClient.get(`/products/${productId}`);
            const latestProduct = productResponse.data?.data;
            if (!latestProduct) {
                throw new Error(`Product ${productId} could not be loaded`);
            }
            product = normalizeProduct({ ...item.product, ...latestProduct });
        }
        return { ...item, product };
    }));
    return {
        result: {
            items: hydratedItems,
        },
    };
}

export async function addToCart(productId, quantity, product) {
    const res = await apiClient.post("/cart/items", {
        product_id: productId,
        quantity: Number(quantity),
        product_name: product?.name || "",
        product_price: Number(product?.price || 0),
        product_image: product?.image || "",
    });
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
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
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
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
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
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
