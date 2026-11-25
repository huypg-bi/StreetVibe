import { useCallback, useEffect, useState } from "react";
import {
    getAttributes,
    createSize,
    deleteSize,
    createColor,
    deleteColor,
    getSuppliers,
    updateSupplier,
    getModerationProducts,
    moderateProduct,
    getAdminDashboard,
    createPayout,
    getVouchers,
    createVoucher,
    deleteVoucher,
    getBanners,
    createBanner,
    deleteBanner,
} from "../../../shared/api/marketplaceApi";
import { getAdminOrders, updateAdminOrder } from "../../../shared/api/orderApi";

const COLOR_PRESETS = [
    { name: "Trắng", hex: "#FFFFFF" },
    { name: "Đen", hex: "#000000" },
    { name: "Đỏ", hex: "#D32F2F" },
    { name: "Vàng", hex: "#FBC02D" },
    { name: "Cam", hex: "#F57C00" },
    { name: "Tím", hex: "#7B1FA2" },
    { name: "Xanh dương", hex: "#1976D2" },
    { name: "Xanh lá", hex: "#388E3C" },
    { name: "Hồng", hex: "#E91E63" },
    { name: "Xám", hex: "#9E9E9E" },
];

export default function MarketplaceAdminPanel({ mode = "supplier" }) {
    const [tab, setTab] = useState(mode === "attributes" ? "attributes" : "suppliers");
    const [attributes, setAttributes] = useState({ sizes: [], colors: [] });
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [productStatus, setProductStatus] = useState("PENDING");
    const [dashboard, setDashboard] = useState({});
    const [orders, setOrders] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [banners, setBanners] = useState([]);
    const [sizeName, setSizeName] = useState("");
    const [colorName, setColorName] = useState("");
    const [colorPreset, setColorPreset] = useState("");
    const [colorHex, setColorHex] = useState("#000000");
    const [loadError, setLoadError] = useState("");
    const visibleProducts = productStatus === "ALL"
        ? products
        : products.filter((product) => product.status === productStatus);

    const reload = useCallback(async () => {
        if (mode === "attributes") {
            const attrs = await getAttributes();
            setAttributes(attrs || { sizes: [], colors: [] });
            setLoadError("");
            return;
        }

        const [attrs, supplierData, productData, stats, orderData, voucherData, bannerData] = await Promise.all([
            getAttributes(),
            getSuppliers(),
            getModerationProducts(),
            getAdminDashboard(),
            getAdminOrders(),
            getVouchers(),
            getBanners(),
        ]);
        setAttributes(attrs || { sizes: [], colors: [] });
        setSuppliers(supplierData?.items || []);
        setProducts(productData?.items || []);
        setDashboard(stats || {});
        setOrders(orderData || []);
        setVouchers(voucherData?.items || []);
        setBanners(bannerData?.items || []);
        setLoadError("");
    }, [mode]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            reload().catch(() => setLoadError("Không thể tải dữ liệu quản trị."));
        }, 0);
        return () => window.clearTimeout(timer);
    }, [reload]);

    return (
        <div className="marketplace-admin-panel">
            {loadError && <p className="marketplace-admin-error">{loadError}</p>}
            {mode === "supplier" && (
                <div className="marketplace-admin-tabs">
                    {["suppliers", "products", "orders", "payouts", "marketing"].map((item) => (
                        <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
                            [{item.toUpperCase()}]
                        </button>
                    ))}
                </div>
            )}

            {mode === "supplier" && (
                <div className="marketplace-admin-kpis">
                    <article><span>SUPPLIERS CHỜ DUYỆT</span><strong>{dashboard.pending_suppliers || 0}</strong></article>
                    <article><span>SẢN PHẨM CHỜ DUYỆT</span><strong>{dashboard.pending_products || 0}</strong></article>
                    <article><span>SUBORDERS CHỜ XỬ LÝ</span><strong>{dashboard.pending_suborders || 0}</strong></article>
                </div>
            )}

            {tab === "attributes" && (
                <section className="marketplace-admin-section">
                    <h2>Sizes & Colors</h2>
                    <div className="marketplace-admin-form">
                        <input value={sizeName} onChange={(e) => setSizeName(e.target.value)} placeholder="Tên size (S, M, L...)" />
                        <button type="button" onClick={async () => { if (sizeName.trim()) { await createSize(sizeName.trim()); setSizeName(""); reload(); } }}>THÊM SIZE</button>
                    </div>
                    <div className="marketplace-admin-list">
                        {attributes.sizes.map((size) => (
                            <div key={size.id}>
                                <strong>{size.name}</strong>
                                <button type="button" onClick={async () => { await deleteSize(size.id); reload(); }}>XÓA</button>
                            </div>
                        ))}
                    </div>
                    <div className="marketplace-admin-form marketplace-color-form">
                        <select
                            value={colorPreset}
                            onChange={(event) => {
                                const preset = COLOR_PRESETS.find((item) => item.name === event.target.value);
                                setColorPreset(event.target.value);
                                if (preset) {
                                    setColorName(preset.name);
                                    setColorHex(preset.hex);
                                }
                            }}
                            aria-label="Chọn màu cơ bản"
                        >
                            <option value="">CHỌN MÀU CƠ BẢN</option>
                            {COLOR_PRESETS.map((preset) => (
                                <option key={preset.name} value={preset.name}>{preset.name}</option>
                            ))}
                        </select>
                        <input value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="Tên màu" />
                        <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} aria-label="Hex code" />
                        <button type="button" onClick={async () => {
                            if (colorName.trim()) {
                                await createColor({ name: colorName.trim(), hex_code: colorHex });
                                setColorName("");
                                setColorPreset("");
                                setColorHex("#000000");
                                reload();
                            }
                        }}>THÊM MÀU</button>
                    </div>
                    <div className="marketplace-admin-list marketplace-color-list">
                        {attributes.colors.map((color) => (
                            <div key={color.id}>
                                <strong>
                                    <span className="marketplace-color-swatch" style={{ backgroundColor: color.hex_code }} />
                                    {color.name}
                                </strong>
                                <button type="button" onClick={async () => { await deleteColor(color.id); reload(); }}>XÓA</button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {tab === "suppliers" && (
                <section className="marketplace-admin-section">
                    <h2>Nhà cung cấp & hoa hồng</h2>
                    {suppliers.map((supplier) => (
                        <div className="marketplace-admin-row" key={supplier.id}>
                            <strong>{supplier.brand_name}</strong>
                            <span>{supplier.status}</span>
                            <select defaultValue={supplier.status} onChange={(e) => updateSupplier(supplier.id, { status: e.target.value }).then(reload)}>
                                <option>PENDING</option>
                                <option>APPROVED</option>
                                <option>BLOCKED</option>
                            </select>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                defaultValue={supplier.commission_rate}
                                onBlur={(e) => updateSupplier(supplier.id, { commission_rate: Number(e.target.value) }).then(reload)}
                            />
                        </div>
                    ))}
                </section>
            )}

            {tab === "products" && (
                <section className="marketplace-admin-section">
                    <div className="marketplace-admin-section-header">
                        <h2>Kiểm duyệt sản phẩm</h2>
                        <select
                            value={productStatus}
                            onChange={(event) => setProductStatus(event.target.value)}
                            aria-label="Lọc trạng thái sản phẩm"
                        >
                            <option value="PENDING">PENDING</option>
                            <option value="APPROVED">APPROVED</option>
                            <option value="REJECTED">REJECTED</option>
                            <option value="HIDDEN">HIDDEN</option>
                            <option value="ALL">TẤT CẢ</option>
                        </select>
                    </div>
                    {visibleProducts.map((product) => (
                        <div className="marketplace-admin-row" key={product.id}>
                            <strong>{product.name}</strong>
                            <span>{product.status}</span>
                            <button type="button" onClick={() => moderateProduct(product.id, "APPROVED").then(reload)}>DUYỆT</button>
                            <button type="button" onClick={() => {
                                const reason = window.prompt("Lý do từ chối:");
                                if (reason !== null) moderateProduct(product.id, "REJECTED", reason).then(reload);
                            }}>TỪ CHỐI</button>
                            <button type="button" onClick={() => moderateProduct(product.id, "HIDDEN").then(reload)}>ẨN</button>
                        </div>
                    ))}
                    {visibleProducts.length === 0 && (
                        <p className="marketplace-admin-empty">
                            {productStatus === "PENDING"
                                ? "Chưa có sản phẩm chờ duyệt."
                                : "Không có sản phẩm ở trạng thái này."}
                        </p>
                    )}
                </section>
            )}

            {tab === "orders" && (
                <section className="marketplace-admin-section">
                    <h2>Đơn hàng tổng</h2>
                    {orders.map((order) => (
                        <div className="marketplace-admin-row" key={order.id}>
                            <strong>{order.id}</strong>
                            <span>{order.payment_status}</span>
                            <select defaultValue={order.payment_status} onChange={(e) => updateAdminOrder(order.id, { payment_status: e.target.value }).then(reload)}>
                                <option>UNPAID</option>
                                <option>PAID</option>
                                <option>REFUNDED</option>
                            </select>
                        </div>
                    ))}
                </section>
            )}

            {tab === "payouts" && (
                <section className="marketplace-admin-section">
                    <h2>Tạo đợt đối soát</h2>
                    {suppliers.map((supplier) => (
                        <div className="marketplace-admin-row" key={supplier.id}>
                            <strong>{supplier.brand_name}</strong>
                            <button type="button" onClick={() => {
                                const note = window.prompt("Ghi chú giao dịch:");
                                createPayout({ supplier_id: supplier.id, status: "PENDING", transaction_note: note || "" }).then(reload);
                            }}>TẠO PAYOUT</button>
                        </div>
                    ))}
                </section>
            )}

            {tab === "marketing" && (
                <section className="marketplace-admin-section">
                    <h2>Voucher & Banner</h2>
                    <div className="marketplace-admin-form">
                        <input id="voucher-code" placeholder="Mã voucher" />
                        <input id="voucher-percent" type="number" min="1" max="100" placeholder="% giảm" />
                        <button type="button" onClick={() => {
                            const code = document.getElementById("voucher-code").value;
                            const discount = Number(document.getElementById("voucher-percent").value);
                            if (code && discount) createVoucher({ code, discount_percent: discount, max_uses: 0, is_active: true }).then(reload);
                        }}>THÊM VOUCHER</button>
                    </div>
                    {vouchers.map((voucher) => (
                        <div className="marketplace-admin-row" key={voucher.id}>
                            <strong>{voucher.code} // -{voucher.discount_percent}%</strong>
                            <button type="button" onClick={() => deleteVoucher(voucher.id).then(reload)}>XÓA</button>
                        </div>
                    ))}
                    <div className="marketplace-admin-form">
                        <input id="banner-title" placeholder="Tiêu đề banner" />
                        <input id="banner-url" placeholder="URL ảnh" />
                        <button type="button" onClick={() => {
                            const title = document.getElementById("banner-title").value;
                            const imageUrl = document.getElementById("banner-url").value;
                            if (title && imageUrl) createBanner({ title, image_url: imageUrl, link_url: "", is_active: true }).then(reload);
                        }}>THÊM BANNER</button>
                    </div>
                    {banners.map((banner) => (
                        <div className="marketplace-admin-row" key={banner.id}>
                            <strong>{banner.title}</strong>
                            <button type="button" onClick={() => deleteBanner(banner.id).then(reload)}>XÓA</button>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}
