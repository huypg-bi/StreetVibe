import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import AdminModal from "./AdminModal";
import PaginatedList from "../../../shared/components/PaginatedList";
import ProductDetailView from "../../../shared/components/ProductDetailView";
import { isFootwearSizeValue } from "../../products/utils/categoryHierarchy";
import {
    getAttributes,
    createSize,
    deleteSize,
    createColor,
    deleteColor,
    createSport,
    deleteSport,
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
import { getErrorMessage, toast } from "../../../shared/utils/toast";

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
    const [attributes, setAttributes] = useState({ sizes: [], colors: [], sports: [] });
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [productStatus, setProductStatus] = useState("PENDING");
    const [detailProduct, setDetailProduct] = useState(null);
    const [dashboard, setDashboard] = useState({});
    const [orders, setOrders] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [banners, setBanners] = useState([]);
    const [sizeName, setSizeName] = useState("");
    const [sizeType, setSizeType] = useState("apparel");
    const [sportName, setSportName] = useState("");
    const [colorName, setColorName] = useState("");
    const [colorPreset, setColorPreset] = useState("");
    const [colorHex, setColorHex] = useState("#000000");
    const apparelSizes = (attributes.sizes || []).filter((size) => !isFootwearSizeValue(size));
    const footwearSizes = (attributes.sizes || []).filter((size) => isFootwearSizeValue(size));
    const sports = attributes.sports || [];
    const visibleProducts = productStatus === "ALL"
        ? products
        : products.filter((product) => product.status === productStatus);

    const reload = useCallback(async () => {
        if (mode === "attributes") {
            const attrs = await getAttributes();
            setAttributes(attrs || { sizes: [], colors: [] });
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
    }, [mode]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            reload().catch(() => toast.error("Không thể tải dữ liệu quản trị."));
        }, 0);
        return () => window.clearTimeout(timer);
    }, [reload]);

    // Chạy một thao tác quản trị, báo kết quả rồi tải lại dữ liệu
    const runAction = async (action, successMessage) => {
        let succeeded = true;
        try {
            await action();
            toast.success(successMessage);
        } catch (error) {
            succeeded = false;
            console.error(error);
            toast.error(getErrorMessage(error, "Thao tác không thành công."));
        }
        await reload().catch(() => toast.error("Không thể tải lại dữ liệu quản trị."));
        return succeeded;
    };

    return (
        <div className="marketplace-admin-panel">
            {mode === "supplier" && (
                <div className="marketplace-admin-tabs">
                    {["suppliers", "products", "orders", "payouts", "marketing"].map((item) => (
                        <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
                            [{item.toUpperCase()}]
                        </button>
                    ))}
                </div>
            )}

            {mode === "supplier" && tab === "suppliers" && (
                <div className="marketplace-admin-kpis">
                    <article><span>SUPPLIERS CHỜ DUYỆT</span><strong>{dashboard.pending_suppliers || 0}</strong></article>
                    <article><span>SẢN PHẨM CHỜ DUYỆT</span><strong>{dashboard.pending_products || 0}</strong></article>
                    <article><span>SUBORDERS CHỜ XỬ LÝ</span><strong>{dashboard.pending_suborders || 0}</strong></article>
                </div>
            )}

            {tab === "attributes" && (
                <section className="marketplace-admin-section">
                    <h2>Sizes, Colors &amp; Sports</h2>
                    <div className="marketplace-admin-form">
                        <select
                            value={sizeType}
                            onChange={(e) => setSizeType(e.target.value)}
                            aria-label="Loại size"
                        >
                            <option value="apparel">Size Quần áo (Apparel)</option>
                            <option value="footwear">Size Chân (Footwear)</option>
                        </select>
                        <input
                            value={sizeName}
                            onChange={(e) => setSizeName(e.target.value)}
                            placeholder={sizeType === "footwear" ? "Số size chân (37, 38... 45)" : "Tên size (S, M, L...)"}
                        />
                        <button type="button" onClick={async () => {
                            if (!sizeName.trim()) return toast.error("Vui lòng nhập tên size.");
                            if (await runAction(() => createSize(sizeName.trim(), sizeType), "Đã thêm size.")) setSizeName("");
                        }}>THÊM SIZE</button>
                    </div>

                    <h3 style={{ fontSize: "12px", marginTop: "14px", marginBottom: "8px", textTransform: "uppercase" }}>Size Quần áo (Apparel)</h3>
                    <PaginatedList items={apparelSizes}>
                        {(rows) => (
                            <div className="marketplace-admin-list">
                                {rows.map((size) => (
                                    <div key={size.id}>
                                        <strong>{size.name}</strong>
                                        <button type="button" className="marketplace-danger-btn" onClick={() => runAction(() => deleteSize(size.id), "Đã xóa size.")}>XÓA</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </PaginatedList>

                    <h3 style={{ fontSize: "12px", marginTop: "14px", marginBottom: "8px", textTransform: "uppercase" }}>Size Chân (Footwear)</h3>
                    <PaginatedList items={footwearSizes}>
                        {(rows) => (
                            <div className="marketplace-admin-list">
                                {rows.map((size) => (
                                    <div key={size.id}>
                                        <strong>{size.name}</strong>
                                        <button type="button" className="marketplace-danger-btn" onClick={() => runAction(() => deleteSize(size.id), "Đã xóa size.")}>XÓA</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </PaginatedList>

                    <div className="marketplace-admin-form" style={{ marginTop: "20px" }}>
                        <input
                            value={sportName}
                            onChange={(e) => setSportName(e.target.value)}
                            placeholder="Môn thể thao (Chạy bộ, Bóng rổ, Tập Gym...)"
                        />
                        <button type="button" onClick={async () => {
                            if (!sportName.trim()) return toast.error("Vui lòng nhập tên môn thể thao.");
                            if (await runAction(() => createSport(sportName.trim()), "Đã thêm môn thể thao.")) setSportName("");
                        }}>THÊM THỂ THAO</button>
                    </div>
                    <PaginatedList items={sports}>
                        {(rows) => (
                            <div className="marketplace-admin-list">
                                {rows.map((sport) => (
                                    <div key={sport.id}>
                                        <strong>{sport.name}</strong>
                                        <button type="button" className="marketplace-danger-btn" onClick={() => runAction(() => deleteSport(sport.id), "Đã xóa môn thể thao.")}>XÓA</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </PaginatedList>
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
                            if (!colorName.trim()) return toast.error("Vui lòng nhập tên màu.");
                            if (await runAction(() => createColor({ name: colorName.trim(), hex_code: colorHex }), "Đã thêm màu.")) {
                                setColorName("");
                                setColorPreset("");
                                setColorHex("#000000");
                            }
                        }}>THÊM MÀU</button>
                    </div>
                    <PaginatedList items={attributes.colors}>
                        {(rows) => (
                            <div className="marketplace-admin-list marketplace-color-list">
                                {rows.map((color) => (
                                    <div key={color.id}>
                                        <strong>
                                            <span className="marketplace-color-swatch" style={{ backgroundColor: color.hex_code }} />
                                            {color.name}
                                        </strong>
                                        <button type="button" className="marketplace-danger-btn" onClick={() => runAction(() => deleteColor(color.id), "Đã xóa màu.")}>XÓA</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </PaginatedList>
                </section>
            )}

            {tab === "suppliers" && (
                <section className="marketplace-admin-section marketplace-supplier-section">
                    <h2>Nhà cung cấp & hoa hồng</h2>
                    <PaginatedList items={suppliers}>
                        {(rows) => (
                            <div className="marketplace-supplier-table-wrap">
                                <table className="marketplace-supplier-table">
                                    <thead>
                                        <tr>
                                            <th scope="col">Nhà cung cấp</th>
                                            <th scope="col">Trạng thái</th>
                                            <th scope="col">Hoa hồng (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((supplier) => (
                                            <tr key={supplier.id}>
                                                <td><strong>{supplier.brand_name}</strong></td>
                                                <td>
                                                    <select
                                                        aria-label={`Trạng thái ${supplier.brand_name}`}
                                                        defaultValue={supplier.status}
                                                        onChange={(e) => runAction(() => updateSupplier(supplier.id, { status: e.target.value }), "Đã cập nhật trạng thái nhà cung cấp.")}
                                                    >
                                                        <option>PENDING</option>
                                                        <option>APPROVED</option>
                                                        <option>BLOCKED</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <input
                                                        aria-label={`Hoa hồng của ${supplier.brand_name} (%)`}
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        defaultValue={supplier.commission_rate}
                                                        onBlur={(e) => {
                                                            const rate = Number(e.target.value);
                                                            // Chỉ lưu khi hoa hồng thật sự thay đổi
                                                            if (rate !== Number(supplier.commission_rate)) {
                                                                runAction(() => updateSupplier(supplier.id, { commission_rate: rate }), "Đã cập nhật hoa hồng.");
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                        {suppliers.length === 0 && (
                                            <tr>
                                                <td className="marketplace-supplier-empty" colSpan={3}>Chưa có nhà cung cấp.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </PaginatedList>
                </section>
            )}

            {tab === "products" && (
                <section className="marketplace-admin-section marketplace-supplier-section">
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
                    <PaginatedList items={visibleProducts} resetKey={productStatus}>
                        {(rows) => (
                            <div className="marketplace-product-table-wrap">
                                <table className="marketplace-product-table">
                                    <thead>
                                        <tr>
                                            <th scope="col">Sản phẩm</th>
                                            <th scope="col">Trạng thái</th>
                                            <th scope="col">Chi tiết</th>
                                            <th scope="col">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((product) => (
                                            <tr key={product.id}>
                                                <td>
                                                    <strong>{product.name}</strong>
                                                    <span className="admin-sku-code">{product.sku}</span>
                                                    {product.supplier?.brand_name && (
                                                        <div style={{ fontSize: "11px", color: "#666" }}>
                                                            Supplier: {product.supplier.brand_name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{product.status}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="marketplace-product-eye-btn"
                                                        title="Xem chi tiết sản phẩm"
                                                        aria-label={`Xem chi tiết ${product.name}`}
                                                        onClick={() => setDetailProduct(product)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </td>
                                                <td>
                                                    <div className="marketplace-product-actions">
                                                        <button
                                                            type="button"
                                                            className="marketplace-product-action-btn approve"
                                                            onClick={() => runAction(() => moderateProduct(product.id, "APPROVED"), "Đã duyệt sản phẩm.")}
                                                        >DUYỆT</button>
                                                        <button
                                                            type="button"
                                                            className="marketplace-product-action-btn reject"
                                                            onClick={() => {
                                                                const reason = window.prompt("Lý do từ chối:");
                                                                if (reason !== null) runAction(() => moderateProduct(product.id, "REJECTED", reason), "Đã từ chối sản phẩm.");
                                                            }}
                                                        >TỪ CHỐI</button>
                                                        <button
                                                            type="button"
                                                            className="marketplace-product-action-btn hide"
                                                            onClick={() => runAction(() => moderateProduct(product.id, "HIDDEN"), "Đã ẩn sản phẩm.")}
                                                        >ẨN</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {visibleProducts.length === 0 && (
                                            <tr>
                                                <td className="marketplace-product-empty" colSpan={4}>
                                                    {productStatus === "PENDING"
                                                        ? "Chưa có sản phẩm chờ duyệt."
                                                        : "Không có sản phẩm ở trạng thái này."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </PaginatedList>
                </section>
            )}

            {tab === "orders" && (
                <section className="marketplace-admin-section marketplace-supplier-section">
                    <h2>Đơn hàng tổng</h2>
                    <PaginatedList items={orders}>
                        {(rows) => rows.map((order) => (
                            <div className="marketplace-admin-row" key={order.id}>
                                <strong>{order.id}</strong>
                                <span>{order.payment_status}</span>
                                <select defaultValue={order.payment_status} onChange={(e) => runAction(() => updateAdminOrder(order.id, { payment_status: e.target.value }), "Đã cập nhật đơn hàng.")}>
                                    <option>UNPAID</option>
                                    <option>PAID</option>
                                    <option>REFUNDED</option>
                                </select>
                            </div>
                        ))}
                    </PaginatedList>
                </section>
            )}

            {tab === "payouts" && (
                <section className="marketplace-admin-section marketplace-supplier-section">
                    <h2>Tạo đợt đối soát</h2>
                    <PaginatedList items={suppliers}>
                        {(rows) => rows.map((supplier) => (
                            <div className="marketplace-admin-row" key={supplier.id}>
                                <strong>{supplier.brand_name}</strong>
                                <button type="button" onClick={() => {
                                    const note = window.prompt("Ghi chú giao dịch:");
                                    runAction(() => createPayout({ supplier_id: supplier.id, status: "PENDING", transaction_note: note || "" }), "Đã tạo đợt đối soát.");
                                }}>TẠO PAYOUT</button>
                            </div>
                        ))}
                    </PaginatedList>
                </section>
            )}

            {tab === "marketing" && (
                <section className="marketplace-admin-section marketplace-supplier-section">
                    <h2>Voucher & Banner</h2>
                    <div className="marketplace-admin-form">
                        <input id="voucher-code" placeholder="Mã voucher" />
                        <input id="voucher-percent" type="number" min="1" max="100" placeholder="% giảm" />
                        <button type="button" onClick={() => {
                            const code = document.getElementById("voucher-code").value;
                            const discount = Number(document.getElementById("voucher-percent").value);
                            if (!code || !discount) return toast.error("Vui lòng nhập mã voucher và % giảm.");
                            runAction(() => createVoucher({ code, discount_percent: discount, max_uses: 0, is_active: true }), "Đã thêm voucher.");
                        }}>THÊM VOUCHER</button>
                    </div>
                    <PaginatedList items={vouchers}>
                        {(rows) => rows.map((voucher) => (
                            <div className="marketplace-admin-row" key={voucher.id}>
                                <strong>{voucher.code} // -{voucher.discount_percent}%</strong>
                                <button type="button" className="marketplace-danger-btn" onClick={() => runAction(() => deleteVoucher(voucher.id), "Đã xóa voucher.")}>XÓA</button>
                            </div>
                        ))}
                    </PaginatedList>
                    <div className="marketplace-admin-form">
                        <input id="banner-title" placeholder="Tiêu đề banner" />
                        <input id="banner-url" placeholder="URL ảnh" />
                        <button type="button" onClick={() => {
                            const title = document.getElementById("banner-title").value;
                            const imageUrl = document.getElementById("banner-url").value;
                            if (!title || !imageUrl) return toast.error("Vui lòng nhập tiêu đề và URL ảnh banner.");
                            runAction(() => createBanner({ title, image_url: imageUrl, link_url: "", is_active: true }), "Đã thêm banner.");
                        }}>THÊM BANNER</button>
                    </div>
                    <PaginatedList items={banners}>
                        {(rows) => rows.map((banner) => (
                            <div className="marketplace-admin-row" key={banner.id}>
                                <strong>{banner.title}</strong>
                                <button type="button" className="marketplace-danger-btn" onClick={() => runAction(() => deleteBanner(banner.id), "Đã xóa banner.")}>XÓA</button>
                            </div>
                        ))}
                    </PaginatedList>
                </section>
            )}

            {detailProduct && (
                <AdminModal
                    eyebrow="[ PRODUCT REVIEW ]"
                    titleId="moderation-detail-title"
                    title={`CHI TIẾT SẢN PHẨM // ${detailProduct.name}`}
                    onClose={() => setDetailProduct(null)}
                >
                    <ProductDetailView product={detailProduct} />
                </AdminModal>
            )}
        </div>
    );
}
