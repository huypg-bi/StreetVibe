import { apiClient } from "./apiClient";

export async function checkout(payload) {
    const res = await apiClient.post("/orders/checkout", payload);
    return res.data?.data || null;
}

export async function getMyOrders() {
    const res = await apiClient.get("/orders/my");
    return res.data?.data?.items || [];
}

export async function getAdminOrders(params = {}) {
    const res = await apiClient.get("/orders/admin", { params });
    return res.data?.data?.items || [];
}

export async function updateAdminOrder(id, payload) {
    const res = await apiClient.put(`/orders/admin/${id}`, payload);
    return res.data?.data || null;
}
