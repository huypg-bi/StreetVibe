import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { CART_UPDATED_EVENT, getCart } from "../../features/products/api/productsApi";
import { Search, ShoppingBag, Shield, User, LogOut } from "lucide-react";
import logoImg from "../../assets/img/logo.png";
import "../../features/products/styles/atelierBrutal.css";

export default function Header() {
    const { token, user, logout } = useAuth();
    const location = useLocation();
    const [currency, setCurrency] = useState("VND");
    const [cartCount, setCartCount] = useState(0);

    const refreshCartCount = useCallback(async () => {
        if (!token) return;
        try {
            const response = await getCart();
            setCartCount(response.result.items.reduce((total, item) => total + item.quantity, 0));
        } catch (error) {
            console.error("Lỗi khi tải số lượng giỏ hàng:", error);
        }
    }, [token]);

    useEffect(() => {
        const timeout = setTimeout(refreshCartCount, 0);
        window.addEventListener(CART_UPDATED_EVENT, refreshCartCount);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener(CART_UPDATED_EVENT, refreshCartCount);
        };
    }, [location.pathname, refreshCartCount]);

    return (
        <header className="atelier-header">
            {/* 1. ARCHIVAL TICKER / MARQUEE */}
            <div className="atelier-ticker">
                <div className="ticker-marquee">
                    <div className="ticker-item">
                        <span className="hot">[HOT DROP // 2026]</span>
                        <span>ARCHIVAL BRUTALISM CAPSULE ONLINE</span>
                    </div>
                    <div className="ticker-item">
                        <span>// FABRIC GRADE: 480–520 GSM HEAVY COTTON ARMOR</span>
                    </div>
                    <div className="ticker-item">
                        <span>// NFC CHIP AUTHENTICATION EMBEDDED</span>
                    </div>
                    <div className="ticker-item">
                        <span>// WORLDWIDE LOGISTICS // DISPATCH IN 24H</span>
                    </div>
                    <div className="ticker-item">
                        <span className="hot">[LIMIT: 02 UNITS PER CLIENT]</span>
                    </div>
                    {/* Duplicate for infinite seamless marquee */}
                    <div className="ticker-item">
                        <span className="hot">[HOT DROP // 2026]</span>
                        <span>ARCHIVAL BRUTALISM CAPSULE ONLINE</span>
                    </div>
                    <div className="ticker-item">
                        <span>// FABRIC GRADE: 480–520 GSM HEAVY COTTON ARMOR</span>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", zIndex: 2, background: "#000", paddingLeft: "10px" }}>
                    <span style={{ color: "#888", fontSize: "10px" }}>SYS_STATUS: OPTIMAL</span>
                </div>
            </div>

            {/* 2. MAIN NAV BAR */}
            <div className="atelier-nav-bar">
                {/* Brand */}
                <Link to="/" className="atelier-brand">
                    <img src={logoImg} alt="StreetVibe Logo" style={{ height: "34px", width: "auto", objectFit: "contain", display: "block" }} />
                    <span>STREETVIBE // ATELIER</span>
                </Link>

                {/* Minimalist Industrial Nav Links */}
                <nav className="atelier-nav-links">
                    <Link to="/" className={location.pathname === "/" ? "active" : ""}>
                        NEW DROPS
                    </Link>
                    <Link to="/best-seller" className={location.pathname === "/best-seller" ? "active" : ""}>
                        CATALOG
                    </Link>
                    <Link to="/best-seller">
                        LOOKBOOK
                    </Link>
                    <Link to="/contact" className={location.pathname === "/contact" ? "active" : ""}>
                        ATELIER REF
                    </Link>
                </nav>

                {/* Actions: Search, Currency, Cart, Account */}
                <div className="atelier-nav-actions">
                    <button
                        type="button"
                        className="atelier-action-btn"
                        onClick={() => setCurrency(c => c === "VND" ? "USD" : "VND")}
                        title="Toggle Currency"
                    >
                        [{currency}]
                    </button>

                    <Link to="/best-seller" className="atelier-action-btn" title="Search">
                        <Search size={14} />
                        <span>SEARCH</span>
                    </Link>

                    <Link to="/cart" className="atelier-action-btn" style={{ background: "#000", color: "#fff" }}>
                        <ShoppingBag size={14} />
                        <span>CART [{token ? cartCount : 0}]</span>
                    </Link>

                    {token ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {user?.role === "admin" && (
                                <Link to="/admin" className="atelier-action-btn" style={{ borderColor: "#d32f2f", color: "#d32f2f" }}>
                                    <Shield size={14} />
                                    <span>[ADMIN]</span>
                                </Link>
                            )}
                            <button
                                type="button"
                                className="atelier-action-btn"
                                onClick={() => logout()}
                                title="Đăng xuất"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="atelier-action-btn">
                            <User size={14} />
                            <span>SIGN IN</span>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
