import { apiClient } from "../../../shared/api/apiClient";

/**
 * API Đăng nhập
 */
export async function loginAPI(email, password) {
    const res = await apiClient.post("/auth/login", { email, password });
    if (!res.data?.success || !res.data?.data) {
        return null;
    }
    const { access_token, user } = res.data.data;
    return {
        token: access_token,
        user: {
            ...user,
            _id: user.id ?? user._id,
        },
    };
}

/**
 * API Đăng ký
 */
export async function registerAPI(name, email, password, supplierRequest = false) {
    const res = await apiClient.post("/auth/register", {
        name,
        email,
        password,
        supplier_request: supplierRequest,
    });
    if (!res.data?.success || !res.data?.data) {
        return null;
    }
    const { access_token, user } = res.data.data;
    return {
        token: access_token,
        user: {
            ...user,
            _id: user.id ?? user._id,
        },
    };
}

/**
 * API Lấy thông tin cá nhân của người dùng hiện tại
 */
export async function getMe() {
    const res = await apiClient.get("/auth/me");
    if (!res.data?.success || !res.data?.data) {
        return null;
    }
    const user = res.data.data;
    return {
        ...user,
        _id: user.id ?? user._id,
    };
}
