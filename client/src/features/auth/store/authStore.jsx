import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAPI, registerAPI, getMe } from "../api/authApi";
import { AuthContext } from "./AuthContext";
import { getErrorMessage, toast } from "../../../shared/utils/toast";
import {
    SESSION_EXPIRED_EVENT,
    SESSION_EXPIRED_MESSAGE,
    expireSession,
    getTokenExpiry,
    isTokenExpired,
} from "../../../shared/utils/session";

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // Phiên hết hạn: xóa trạng thái đăng nhập, báo cho người dùng và đưa về trang đăng nhập
    const handleSessionExpired = useCallback(() => {
        setToken(null);
        setUser(null);
        toast.error(SESSION_EXPIRED_MESSAGE);
        navigate("/login", { replace: true });
    }, [navigate]);

    useEffect(() => {
        window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    }, [handleSessionExpired]);

    // Đăng xuất đúng lúc hết hạn, kể cả khi người dùng không bấm gì
    useEffect(() => {
        if (!token) return undefined;

        const check = () => {
            if (!isTokenExpired(token)) return;
            const stored = localStorage.getItem("token");
            if (!stored) handleSessionExpired();
            else if (stored !== token) setToken(stored); // đã đăng nhập lại ở tab khác
            else expireSession(token);
        };
        const timer = setTimeout(check, Math.max(0, getTokenExpiry(token) - Date.now()));
        // Hẹn giờ có thể trễ khi máy ngủ hoặc tab chạy nền, nên kiểm tra lại khi quay lại tab
        document.addEventListener("visibilitychange", check);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("visibilitychange", check);
        };
    }, [token, handleSessionExpired]);

    useEffect(() => {
        if (!token) return;

        getMe()
            .then(setUser)
            .catch((error) => console.error(error));
    }, [token]);

    const refreshUser = useCallback(async () => {
        if (!token) return null;
        try {
            const latestUser = await getMe();
            setUser(latestUser);
            return latestUser;
        } catch (error) {
            console.error(error);
            return null;
        }
    }, [token]);

    const login = useCallback(async (email, password) => {
        try {
            const data = await loginAPI(email, password);

            if (!data || !data.token) {
                toast.error("Đăng nhập không thành công.");
                return;
            }

            localStorage.setItem("token", data.token);
            setToken(data.token);
            toast.success("Đăng nhập thành công.");

            const role = data.user?.role;
            navigate(role === "admin" ? "/admin" : role === "supplier" ? "/supplier" : "/");
        } catch (err) {
            console.error("Error caught:", err);
            toast.error(getErrorMessage(err, "Đăng nhập không thành công. Kiểm tra lại email và mật khẩu."));
        }
    }, [navigate]);

    const register = useCallback(async (name, email, password, supplierRequest = false) => {
        try {
            const data = await registerAPI(name, email, password, supplierRequest);

            if (!data || !data.token) {
                toast.error("Đăng ký không thành công.");
                return;
            }

            localStorage.setItem("token", data.token);
            setToken(data.token);
            toast.success("Đăng ký thành công.");

            const role = data.user?.role;
            navigate(role === "admin" ? "/admin" : role === "supplier" ? "/supplier" : "/");
        } catch (err) {
            console.error(err);
            toast.error(getErrorMessage(err, "Đăng ký không thành công. Vui lòng thử lại."));
        }
    }, [navigate]);

    const logout = useCallback((redirectUrl = "/") => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        navigate(redirectUrl);
    }, [navigate]);

    return (
        <AuthContext.Provider value={{ token, user, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}
