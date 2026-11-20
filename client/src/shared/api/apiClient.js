import axios from "axios";

// Đọc URL từ biến môi trường .env (VITE_API_BASE_URL)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

/**
 * Cấu hình Axios instance chuẩn mực dùng cho toàn bộ ứng dụng
 */
export const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 15000, // Timeout sau 15 giây
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Request Interceptor: Tự động gắn Bearer Token vào Header cho mọi request
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Response Interceptor: Xử lý lỗi tập trung theo chuẩn Axios
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Log lỗi hoặc xử lý tập trung khi gặp lỗi từ server
        if (error.response) {
            console.error(`[Axios Error ${error.response.status}]:`, error.response.data);
            // Nếu token hết hạn hoặc không hợp lệ (401)
            if (error.response.status === 401) {
                // Có thể clear token nếu cần
            }
        } else if (error.request) {
            console.error("[Axios Network Error]: Không thể kết nối đến server", error.message);
        }
        return Promise.reject(error);
    }
);

/**
 * Helper lấy token thủ công khi cần
 */
export function authHeader() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Helper chuẩn hóa dữ liệu Product tương thích với toàn bộ component UI
 */
export function normalizeProduct(p) {
    if (!p) return p;
    return {
        ...p,
        _id: p.id ?? p._id,
        originalPrice: p.original_price ?? p.originalPrice ?? (p.price ? Number((p.price * 1.25).toFixed(2)) : 0),
        isFeatured: p.is_featured ?? p.isFeatured ?? false,
        soldCount: p.sold_count ?? p.soldCount ?? 0,
        averageRating: p.average_rating ?? p.averageRating ?? 5,
        ratingCount: p.rating_count ?? p.ratingCount ?? 0,
        category: p.category ? normalizeCategory(p.category) : p.category,
    };
}

/**
 * Helper chuẩn hóa dữ liệu Category tương thích với UI
 */
export function normalizeCategory(c) {
    if (!c) return c;
    return {
        ...c,
        _id: c.id ?? c._id,
        isActive: c.is_active ?? c.isActive ?? true,
    };
}

export default apiClient;
