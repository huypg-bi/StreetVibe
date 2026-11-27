import { apiClient, normalizeProduct, normalizeCategory } from "../../../shared/api/apiClient";
export { getProducts, getProductsPage, getCategories } from "../../products/api/productsApi";

export async function getProductById(productId) {
    const res = await apiClient.get(`/products/${productId}`);
    return normalizeProduct(res.data?.data);
}

// ============================================
// ADMIN PRODUCTS MANAGEMENT
// ============================================
export async function createProduct(payload) {
    const res = await apiClient.post("/products", payload);
    return res.data?.data ? normalizeProduct(res.data.data) : null;
}

export async function updateProduct(productId, payload) {
    const res = await apiClient.put(`/products/${productId}`, payload);
    return res.data?.data ? normalizeProduct(res.data.data) : null;
}

export async function deleteProduct(productId) {
    const res = await apiClient.delete(`/products/${productId}`);
    return res.data?.data;
}

// ============================================
// ADMIN CATEGORIES MANAGEMENT
// ============================================
export async function createCategory(category) {
    const payload = {
        name: category.name,
        parent_id: category.parentId || "",
        is_active: category.isActive === true || category.isActive === "true",
    };
    const res = await apiClient.post("/categories", payload);
    return res.data?.data ? normalizeCategory(res.data.data) : null;
}

export async function updateCategory(category) {
    const id = category.id ?? category._id;
    const payload = {
        name: category.name,
        parent_id: category.parentId || "",
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

export async function approveSupplierRequest(userId) {
    const res = await apiClient.put(`/auth/users/${userId}/approve-supplier`);
    return res.data?.data;
}

export async function updateCustomerStatus(userId, status, adminNote = "") {
    const res = await apiClient.put(`/auth/users/${userId}/status`, { status, admin_note: adminNote });
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
