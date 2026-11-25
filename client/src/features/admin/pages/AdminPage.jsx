import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import ProductsPanel from "../components/ProductsPanel";
import CategoriesPanel from "../components/CategoriesPanel";
import UsersPanel from "../components/UsersPanel";
import MarketplaceAdminPanel from "../components/MarketplaceAdminPanel";
import {
    LogOut,
    Users,
    Package,
    FolderTree,
    LayoutDashboard,
    TrendingUp,
    ShieldAlert,
    Clock,
    Activity,
    ExternalLink,
    Tags,
} from "lucide-react";
import { getAdminDashboard } from "../../../shared/api/marketplaceApi";
import "../styles/admin.css";

export default function AdminPage() {
    const { logout, user } = useAuth();
    const [activePage, setActivePage] = useState(null); // null | "products" | "categories" | "users" | "marketplace"
    const [adminStats, setAdminStats] = useState({});

    useEffect(() => {
        getAdminDashboard().then(setAdminStats).catch(() => {});
    }, []);

    const breadcrumbLabel =
        activePage === "products"
            ? "INVENTORY MATRIX // PRODUCTS"
            : activePage === "categories"
            ? "CATEGORIES // TAXONOMY"
            : activePage === "users"
            ? "USERS & ACCESS RBAC"
            : activePage === "marketplace"
            ? "SUPPLIER OPERATIONS"
            : activePage === "attributes"
            ? "MARKETPLACE // ATTRIBUTES"
            : "DROP OPERATIONS DASHBOARD";

    // Mock live inventory matrix items
    const inventoryMatrix = [
        { sku: "SV-HD-480-BLK", name: "HEAVY HOODIE // ACID WASH", gsm: "480 GSM", stock: 18, price: "1.450.000 ₫", status: "Active" },
        { sku: "SV-CG-380-GRY", name: "TACTICAL CARGO // TITANIUM", gsm: "380 GSM", stock: 3, price: "1.850.000 ₫", status: "Low Stock" },
        { sku: "SV-TE-320-WHT", name: "BOXY SLUB TEE", gsm: "320 GSM", stock: 45, price: "790.000 ₫", status: "Active" },
        { sku: "SV-SN-001-BLK", name: "CYBER SNEAKER // NFC PASS", gsm: "ARMOR NYLON", stock: 0, price: "2.950.000 ₫", status: "Sold Out" },
        { sku: "SV-ZP-520-DRK", name: "HEAVY FLEECE ZIP-UP", gsm: "520 GSM", stock: 12, price: "1.650.000 ₫", status: "Active" },
    ];

    // Mock real-time security log
    const securityLogs = [
        { time: "19:28:12", ip: "118.69.182.4", event: "BOT ATTEMPT BLOCKED", detail: "Automated cart script detected (Rate limit: 429)" },
        { time: "19:25:40", ip: "14.162.240.11", event: "NFC TOKEN AUTHENTICATED", detail: "Unit #048 passport verified by buyer" },
        { time: "19:20:05", ip: "171.244.33.89", event: "VIP PASS REDEEMED", detail: "Code DROPPASS applied on checkout" },
        { time: "19:15:32", ip: "27.72.101.65", event: "ORDER DISPATCH PROCESSED", detail: "VietQR 3.300.000₫ settled via Gateway" },
    ];

    return (
        <div className="admin-wrapper">
            {/* ================ SIDEBAR (ATELIER BRUTAL) ================ */}
            <aside className="admin-sidebar">
                <div>
                    <div className="sidebar-logo">
                        <div className="logo-icon">
                            <span>SV</span>
                        </div>
                        <div className="logo-text">
                            ATELIER // OPS
                        </div>
                    </div>

                    <nav className="sidebar-nav">
                        <p className="nav-section-title">[COMMAND MATRIX]</p>

                        <button
                            type="button"
                            className={`nav-item${activePage === null ? " active" : ""}`}
                            onClick={() => setActivePage(null)}
                        >
                            <LayoutDashboard size={15} />
                            <span>DROP DASHBOARD</span>
                        </button>

                        <button
                            type="button"
                            className={`nav-item${activePage === "products" ? " active" : ""}`}
                            onClick={() => setActivePage("products")}
                        >
                            <Package size={15} />
                            <span>INVENTORY MATRIX</span>
                        </button>

                        <button
                            type="button"
                            className={`nav-item${activePage === "categories" ? " active" : ""}`}
                            onClick={() => setActivePage("categories")}
                        >
                            <FolderTree size={15} />
                            <span>DROP CATEGORIES</span>
                        </button>

                        <button
                            type="button"
                            className={`nav-item${activePage === "users" ? " active" : ""}`}
                            onClick={() => setActivePage("users")}
                        >
                            <Users size={15} />
                            <span>USERS &amp; ROLES</span>
                        </button>

                        <button
                            type="button"
                            className={`nav-item${activePage === "attributes" ? " active" : ""}`}
                            onClick={() => setActivePage("attributes")}
                        >
                            <Tags size={15} />
                            <span>ATTRIBUTES</span>
                        </button>

                        <button
                            type="button"
                            className={`nav-item${activePage === "marketplace" ? " active" : ""}`}
                            onClick={() => setActivePage("marketplace")}
                        >
                            <Package size={15} />
                            <span>SUPPLIER</span>
                        </button>

                        <p className="nav-section-title">[SYSTEM EXIT]</p>
                        <Link to="/" className="nav-item">
                            <ExternalLink size={15} />
                            <span>XEM STOREFRONT</span>
                        </Link>
                    </nav>
                </div>

                <div style={{ borderTop: "1px solid #222", paddingTop: "16px" }}>
                    <div className="mono-spec" style={{ fontSize: "10px", color: "#666", marginBottom: "8px" }}>
                        SYS_USER: {user?.name || "ROOT_ADMIN"}
                    </div>
                    <button
                        type="button"
                        className="nav-item"
                        style={{ color: "#d32f2f" }}
                        onClick={() => logout("/login")}
                    >
                        <LogOut size={15} />
                        <span>ĐĂNG XUẤT HỆ THỐNG</span>
                    </button>
                </div>
            </aside>

            {/* ================ MAIN PANEL ================ */}
            <main className="admin-main">
                {/* Topbar */}
                <header className="admin-topbar">
                    <div className="page-breadcrumb">
                        <span>OPS_CONTROL</span>
                        <span>//</span>
                        <span className="breadcrumb-current">{breadcrumbLabel}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <span className="mono-spec" style={{ color: "#16a34a", fontWeight: "700" }}>
                            &bull; LIVE SYNC: 100%
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="mono-spec" style={{ fontWeight: "700" }}>{user?.name || "ADMINISTRATOR"}</span>
                            <button
                                type="button"
                                className="logout-btn"
                                title="Đăng xuất"
                                onClick={() => logout("/login")}
                            >
                                <LogOut size={15} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content Render Area */}
                <div className="admin-content">
                    {activePage === "products" && <ProductsPanel />}
                    {activePage === "categories" && <CategoriesPanel />}
                    {activePage === "users" && <UsersPanel />}
                    {activePage === "marketplace" && <MarketplaceAdminPanel key="supplier" mode="supplier" />}
                    {activePage === "attributes" && <MarketplaceAdminPanel key="attributes" mode="attributes" />}

                    {/* ================= COMMAND CENTER DASHBOARD (WHEN activePage === null) ================= */}
                    {activePage === null && (
                        <div>
                            {/* 1. TOP METRICS: 4 KPI CARDS */}
                            <div className="brutal-kpi-grid">
                                <div className="brutal-kpi-card">
                                    <div className="kpi-label">
                                        <span>TỔNG DOANH THU DROP</span>
                                        <TrendingUp size={16} color="#000" />
                                    </div>
                                    <div className="kpi-val">{adminStats.pending_suborders || 0} SubOrders</div>
                                    <div className="kpi-sub">TỔNG ĐƠN CON CHỜ XỬ LÝ</div>
                                </div>

                                <div className="brutal-kpi-card">
                                    <div className="kpi-label">
                                        <span>SẢN PHẨM CHỜ KIỂM DUYỆT</span>
                                        <Activity size={16} color="#000" />
                                    </div>
                                    <div className="kpi-val">{adminStats.pending_products || 0}</div>
                                    <div className="kpi-sub">CẦN DUYỆT / TỪ CHỐI / ẨN</div>
                                </div>

                                <div className="brutal-kpi-card">
                                    <div className="kpi-label">
                                        <span>ĐƠN HÀNG CHỜ ĐÓNG GÓI</span>
                                        <Clock size={16} color="#000" />
                                    </div>
                                    <div className="kpi-val">{adminStats.pending_suborders || 0} ĐƠN</div>
                                    <div className="kpi-sub" style={{ color: "#d32f2f" }}>YÊU CẦU XỬ LÝ TRONG 2 GIỜ</div>
                                </div>

                                <div className="brutal-kpi-card">
                                    <div className="kpi-label">
                                        <span>NHÀ CUNG CẤP CHỜ DUYỆT</span>
                                        <Package size={16} color="#000" />
                                    </div>
                                    <div className="kpi-val">{adminStats.pending_suppliers || 0} BRAND</div>
                                    <div className="kpi-sub" style={{ color: "#d32f2f" }}>CẦN PHÊ DUYỆT TÀI KHOẢN</div>
                                </div>
                            </div>

                            {/* 2. DROP VELOCITY & PEAK CHART TRACKER */}
                            <div className="brutal-chart-section">
                                <div className="chart-header-row">
                                    <div>
                                        <span className="mono-spec" style={{ color: "#d32f2f" }}>[HOURLY VELOCITY MATRIX]</span>
                                        <h3 style={{ fontSize: "16px", fontWeight: "800", textTransform: "uppercase", marginTop: "4px" }}>
                                            BIỂU ĐỒ LƯU LƯỢNG &amp; VẬN TỐC CHUYỂN ĐỔI DROP 007
                                        </h3>
                                    </div>
                                    <div className="mono-spec">PEAK VELOCITY: 42 ORDERS / 10 MINS</div>
                                </div>

                                <div className="velocity-bar-chart">
                                    {[
                                        { hour: "18:00", height: "15%", peak: false },
                                        { hour: "18:15", height: "45%", peak: false },
                                        { hour: "18:30", height: "85%", peak: false },
                                        { hour: "18:45", height: "98%", peak: true },
                                        { hour: "19:00", height: "70%", peak: false },
                                        { hour: "19:15", height: "55%", peak: false },
                                        { hour: "19:30", height: "40%", peak: false },
                                        { hour: "19:45", height: "30%", peak: false },
                                        { hour: "20:00", height: "60%", peak: false },
                                        { hour: "20:15", height: "50%", peak: false },
                                        { hour: "20:30", height: "35%", peak: false },
                                        { hour: "20:45", height: "25%", peak: false },
                                    ].map((col, idx) => (
                                        <div className={`velocity-col ${col.peak ? "peak" : ""}`} key={idx}>
                                            <div className="bar" style={{ height: col.height }} />
                                            <span>{col.hour}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "11px", color: "#888", marginTop: "10px" }}>
                                    <span>&bull; MÀU ĐEN: LƯỢNG TRUY CẬP BÌNH THƯỜNG</span>
                                    <span style={{ color: "#d32f2f", fontWeight: "700" }}>&bull; MÀU ĐỎ: PEAK DROP RUSH (VIP ACCESS)</span>
                                </div>
                            </div>

                            {/* 3. INVENTORY MATRIX (BẢNG QUẢN TRỊ KHO) */}
                            <div className="brutal-chart-section">
                                <div className="chart-header-row">
                                    <div>
                                        <span className="mono-spec" style={{ color: "#d32f2f" }}>[INVENTORY CONTROL MATRIX]</span>
                                        <h3 style={{ fontSize: "16px", fontWeight: "800", textTransform: "uppercase", marginTop: "4px" }}>
                                            BẢNG ĐIỀU HÀNH KHO CHI TIẾT
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-brutal"
                                        style={{ padding: "8px 16px" }}
                                        onClick={() => setActivePage("products")}
                                    >
                                        [QUẢN LÝ TẤT CẢ SẢN PHẨM] &rarr;
                                    </button>
                                </div>

                                <table className="stream-table">
                                    <thead>
                                        <tr>
                                            <th>MÃ SKU</th>
                                            <th>TÊN SẢN PHẨM</th>
                                            <th>ĐỊNH LƯỢNG GSM</th>
                                            <th>TỒN KHO</th>
                                            <th>GIÁ BÁN</th>
                                            <th>TRẠNG THÁI</th>
                                            <th>THAO TÁC</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventoryMatrix.map((item) => (
                                            <tr key={item.sku}>
                                                <td style={{ fontWeight: "700" }}>[{item.sku}]</td>
                                                <td>{item.name}</td>
                                                <td>{item.gsm}</td>
                                                <td style={{ fontWeight: "700" }}>{item.stock} UNITS</td>
                                                <td>{item.price}</td>
                                                <td>
                                                    <span className={`tag-badge ${item.status === "Low Stock" ? "alert" : item.status === "Sold Out" ? "dim" : "outline"}`}>
                                                        [{item.status}]
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        style={{ padding: "4px 8px", background: "#000", color: "#fff", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "11px" }}
                                                        onClick={() => alert(`Đã mở điều chỉnh kho cho mã: ${item.sku}`)}
                                                    >
                                                        SỬA KHO
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 4. REAL-TIME ORDERS STREAM & SECURITY AUDIT LOG */}
                            <div className="admin-stream-grid">
                                <div className="admin-stream-box">
                                    <div className="mono-spec" style={{ color: "#d32f2f" }}>[REALTIME DISPATCH FEED]</div>
                                    <h4 style={{ fontSize: "15px", fontWeight: "800", textTransform: "uppercase", marginTop: "4px" }}>
                                        LUỒNG ĐƠN HÀNG MỚI NHẤT
                                    </h4>
                                    <table className="stream-table">
                                        <thead>
                                            <tr>
                                                <th>MÃ ĐƠN</th>
                                                <th>KHÁCH HÀNG</th>
                                                <th>GIÁ TRỊ</th>
                                                <th>PHƯƠNG THỨC</th>
                                                <th>TRẠNG THÁI</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>#SV-9482</td>
                                                <td>Nguyễn Văn An</td>
                                                <td>3.300.000 ₫</td>
                                                <td>VietQR</td>
                                                <td><span className="tag-badge" style={{ background: "#16a34a" }}>ĐÃ DUYỆT</span></td>
                                            </tr>
                                            <tr>
                                                <td>#SV-9481</td>
                                                <td>Trần Minh Tuấn</td>
                                                <td>1.450.000 ₫</td>
                                                <td>MoMo</td>
                                                <td><span className="tag-badge" style={{ background: "#16a34a" }}>ĐÃ DUYỆT</span></td>
                                            </tr>
                                            <tr>
                                                <td>#SV-9480</td>
                                                <td>Lê Hải Đăng</td>
                                                <td>1.850.000 ₫</td>
                                                <td>COD</td>
                                                <td><span className="tag-badge alert">CHỜ GÓI</span></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="admin-stream-box">
                                    <div className="mono-spec" style={{ color: "#d32f2f" }}>
                                        <ShieldAlert size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                                        [ANTI-BOT &amp; SECURITY LOG]
                                    </div>
                                    <h4 style={{ fontSize: "15px", fontWeight: "800", textTransform: "uppercase", marginTop: "4px" }}>
                                        NHẬT KÝ BẢO MẬT HỆ THỐNG
                                    </h4>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
                                        {securityLogs.map((log, i) => (
                                            <div key={i} style={{ borderBottom: "1px solid #eee", paddingBottom: "8px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", color: "#888" }}>
                                                    <span>{log.time} &bull; {log.ip}</span>
                                                    <span style={{ color: log.event.includes("BLOCKED") ? "#d32f2f" : "#000", fontWeight: "700" }}>
                                                        [{log.event}]
                                                    </span>
                                                </div>
                                                <p style={{ margin: "2px 0 0", color: "#444" }}>{log.detail}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
