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

export async function updateMe(payload) {
    const res = await apiClient.put("/auth/me", payload);
    return res.data?.data ? { ...res.data.data, _id: res.data.data.id ?? res.data.data._id } : null;
}

export async function updateMyPassword(currentPassword, newPassword) {
    const res = await apiClient.put("/auth/me/password", {
        current_password: currentPassword,
        new_password: newPassword,
    });
    return res.data?.success === true;
}

export async function requestSupplier() {
    const res = await apiClient.put("/auth/me/supplier-request");
    return res.data?.data ? { ...res.data.data, _id: res.data.data.id ?? res.data.data._id } : null;
}
