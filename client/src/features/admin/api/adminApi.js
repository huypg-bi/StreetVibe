import { apiClient, normalizeProduct, normalizeCategory } from "../../../shared/api/apiClient";
export { getProducts, getCategories } from "../../products/api/productsApi";

// ============================================
// ADMIN PRODUCTS MANAGEMENT
// ============================================
export async function createProduct(product) {
    const payload = {
        name: product.name,
        description: product.description,
        price: Number(product.price),
        stock: Number(product.stock),
        sold_count: Number(product.soldCount || 0),
        is_featured: product.isFeatured === true || product.isFeatured === "true",
        category_id: product.categoryId,
        image: product.image,
    };

    const res = await apiClient.post("/products", payload);
    return res.data?.data ? normalizeProduct(res.data.data) : null;
}

export async function updateProduct(product) {
    const payload = {
        name: product.name,
        description: product.description,
        price: Number(product.price),
        stock: Number(product.stock),
        sold_count: Number(product.soldCount || 0),
        is_featured: product.isFeatured === true || product.isFeatured === "true",
        category_id: product.categoryId,
        image: product.image,
    };

    const id = product.id ?? product._id;
    const res = await apiClient.put(`/products/${id}`, payload);
    return res.data?.data ? normalizeProduct(res.data.data) : null;
}

export async function deleteProduct(productId) {
    const res = await apiClient.delete(`/products/${productId}`);
    return res.data?.data;
}

export async function patchFlagProduct(productId, flags) {
    const payload = {
        is_featured: flags.isFeatured,
    };
    const res = await apiClient.patch(`/products/${productId}/flags`, payload);
    return res.data?.data;
}

// ============================================
// ADMIN CATEGORIES MANAGEMENT
// ============================================
export async function createCategory(category) {
    const payload = {
        name: category.name,
        description: category.description,
        is_active: category.isActive === true || category.isActive === "true",
    };
    const res = await apiClient.post("/categories", payload);
    return res.data?.data ? normalizeCategory(res.data.data) : null;
}

export async function updateCategory(category) {
    const id = category.id ?? category._id;
    const payload = {
        name: category.name,
        description: category.description,
        is_active: category.isActive === true || category.isActive === "true",
    };
    const res = await apiClient.put(`/categories/${id}`, payload);
    return res.data?.data ? normalizeCategory(res.data.data) : null;
}

export async function deleteCategory(id) {
    const res = await apiClient.delete(`/categories/${id}`);
    return res.data?.data;
}

// ============================================
// ADMIN MEDIA UPLOAD
// ============================================
export async function uploadImg(img) {
    const formData = new FormData();
    formData.append("image", img);

    const res = await apiClient.post("/media/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return res.data?.data;
}

// ============================================
// ADMIN USER MANAGEMENT
// ============================================
export async function getUsers({ search = "", role = "", page = 1, limit = 50 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (role) params.append("role", role);
    if (page) params.append("page", page);
    if (limit) params.append("limit", limit);

    const res = await apiClient.get(`/auth/users?${params.toString()}`);
    return res.data?.data || { users: [], pagination: {} };
}

export async function updateUserRole(userId, role) {
    const res = await apiClient.put(`/auth/users/${userId}/role`, { role });
    return res.data?.data;
}

export async function deleteUser(userId) {
    const res = await apiClient.delete(`/auth/users/${userId}`);
    return res.data?.data;
}

export async function createUser(userData) {
    const res = await apiClient.post("/auth/users", userData);
    return res.data?.data;
}
