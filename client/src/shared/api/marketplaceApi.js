import { apiClient } from "./apiClient";

const unwrap = (res) => res.data?.data || null;

export const getAttributes = async () => unwrap(await apiClient.get("/marketplace/attributes"));
export const createSize = async (name) => unwrap(await apiClient.post("/marketplace/sizes", { name }));
export const updateSize = async (id, name) => unwrap(await apiClient.put(`/marketplace/sizes/${id}`, { name }));
export const deleteSize = async (id) => unwrap(await apiClient.delete(`/marketplace/sizes/${id}`));
export const createColor = async (payload) => unwrap(await apiClient.post("/marketplace/colors", payload));
export const updateColor = async (id, payload) => unwrap(await apiClient.put(`/marketplace/colors/${id}`, payload));
export const deleteColor = async (id) => unwrap(await apiClient.delete(`/marketplace/colors/${id}`));

export const getSupplierProfile = async () => unwrap(await apiClient.get("/marketplace/supplier/profile"));
export const updateSupplierProfile = async (payload) => unwrap(await apiClient.put("/marketplace/supplier/profile", payload));
export const getSupplierProducts = async () => unwrap(await apiClient.get("/marketplace/supplier/products"));
export const createSupplierProduct = async (payload) =>
    unwrap(await apiClient.post("/marketplace/supplier/products", payload));
export const createProductVariants = async (productId, variants) =>
    unwrap(await apiClient.post(`/marketplace/supplier/products/${productId}/variants`, variants));
export const getSupplierSubOrders = async () => unwrap(await apiClient.get("/marketplace/supplier/suborders"));
export const updateSubOrderStatus = async (id, fulfillmentStatus) =>
    unwrap(await apiClient.put(`/marketplace/supplier/suborders/${id}`, { fulfillment_status: fulfillmentStatus }));
export const getSupplierFinance = async () => unwrap(await apiClient.get("/marketplace/supplier/finance"));

export const getSuppliers = async (status = "") =>
    unwrap(await apiClient.get("/marketplace/suppliers", { params: status ? { status } : {} }));
export const updateSupplier = async (id, payload) => unwrap(await apiClient.put(`/marketplace/suppliers/${id}`, payload));
export const getModerationProducts = async (params = {}) =>
    unwrap(await apiClient.get("/marketplace/admin/products", { params }));
export const moderateProduct = async (id, status, reason = "") =>
    unwrap(await apiClient.post(`/marketplace/admin/products/${id}/moderate`, { status, reason }));
export const getAdminDashboard = async () => unwrap(await apiClient.get("/marketplace/admin/dashboard"));
export const createPayout = async (payload) => unwrap(await apiClient.post("/marketplace/admin/payouts", payload));
export const markPayoutPaid = async (id, transactionNote = "") =>
    unwrap(await apiClient.post(`/marketplace/admin/payouts/${id}/paid`, { transaction_note: transactionNote }));

export const getVouchers = async () => unwrap(await apiClient.get("/marketplace/admin/vouchers"));
export const createVoucher = async (payload) => unwrap(await apiClient.post("/marketplace/admin/vouchers", payload));
export const deleteVoucher = async (id) => unwrap(await apiClient.delete(`/marketplace/admin/vouchers/${id}`));
export const getBanners = async () => unwrap(await apiClient.get("/marketplace/admin/banners"));
export const createBanner = async (payload) => unwrap(await apiClient.post("/marketplace/admin/banners", payload));
export const deleteBanner = async (id) => unwrap(await apiClient.delete(`/marketplace/admin/banners/${id}`));
