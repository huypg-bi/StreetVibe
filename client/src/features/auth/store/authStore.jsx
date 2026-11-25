import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAPI, registerAPI, getMe } from "../api/authApi";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) return;

        getMe()
            .then(setUser)
            .catch((error) => console.error(error));
    }, [token]);

    const login = useCallback(async (email, password) => {
        try {
            const data = await loginAPI(email, password);

            if (!data || !data.token) {
                alert("Login failed!");
                return;
            }

            localStorage.setItem("token", data.token);
            setToken(data.token);

            const role = data.user?.role;
            navigate(role === "admin" ? "/admin" : role === "supplier" ? "/supplier" : "/");
        } catch (err) {
            console.error("Error caught:", err);
            alert("Error login!");
        }
    }, [navigate]);

    const register = useCallback(async (name, email, password, supplierRequest = false) => {
        try {
            const data = await registerAPI(name, email, password, supplierRequest);

            if (!data || !data.token) {
                alert("Register failed!");
                return;
            }

            localStorage.setItem("token", data.token);
            setToken(data.token);

            const role = data.user?.role;
            navigate(role === "admin" ? "/admin" : role === "supplier" ? "/supplier" : "/");
        } catch (err) {
            console.error(err);
            alert("Error register!");
        }
    }, [navigate]);

    const logout = useCallback((redirectUrl = "/") => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        navigate(redirectUrl);
    }, [navigate]);

    return (
        <AuthContext.Provider value={{ token, user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
