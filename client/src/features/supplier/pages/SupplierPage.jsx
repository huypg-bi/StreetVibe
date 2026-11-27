import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Eye, PackagePlus, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { getCategories } from "../../products/api/productsApi";
import { uploadImage } from "../../../shared/api/mediaApi";
import {
    getAttributes,
    getSupplierDashboard,
    getSupplierProfile,
    updateSupplierProfile,
    getSupplierProducts,
    deleteSupplierProduct,
    getSupplierInventory,
    getSupplierSubOrders,
    updateSubOrderStatus,
    getSupplierFinance,
} from "../../../shared/api/marketplaceApi";
import SupplierModal from "../components/SupplierModal";
import StockEditModal from "../components/StockEditModal";
import SupplierProductFormModal from "../components/SupplierProductFormModal";
import PaginatedList from "../../../shared/components/PaginatedList";
import ProductDetailView from "../../../shared/components/ProductDetailView";
import "../styles/supplier.css";
import { getErrorMessage, toast } from "../../../shared/utils/toast";

const supplierLinks = [
    ["dashboard", "Tổng quan"],
    ["profile", "Hồ sơ thương hiệu"],
    ["products", "Sản phẩm & biến thể"],
    ["inventory", "Quản lý kho"],
    ["orders", "Đơn hàng"],
    ["finance", "Doanh thu & đối soát"],
];

export default function SupplierPage() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const section = location.pathname.split("/").filter(Boolean)[1] || "dashboard";
    const [dashboard, setDashboard] = useState(null);
    const [profile, setProfile] = useState(null);
    const [products, setProducts] = useState([]);
    const [suborders, setSuborders] = useState([]);
    const [finance, setFinance] = useState({ suborders: [], payouts: [] });
    const [attributes, setAttributes] = useState({ sizes: [], colors: [], sports: [] });
    const [categories, setCategories] = useState([]);
    const [inventorySummary, setInventorySummary] = useState({ total_products: 0, total_stock: 0, total_sold: 0 });
    const [detailProduct, setDetailProduct] = useState(null);
    const [stockProduct, setStockProduct] = useState(null);
    const [profileLogoFile, setProfileLogoFile] = useState(null);
    const [productSearch, setProductSearch] = useState("");
    const [productForm, setProductForm] = useState(null); // { product } | null; product = null là tạo mới
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const financeSuborders = finance.suborders || [];
    const visibleProducts = products.filter((product) =>
        `${product.name || ""} ${product.description || ""}`.toLowerCase().includes(productSearch.toLowerCase())
    );

    useEffect(() => {
        let active = true;
        const loadSection = async () => {
            setLoading(true);
            try {
                if (section === "dashboard") {
                    const data = await getSupplierDashboard();
                    if (active) setDashboard(data);
                } else if (section === "products") {
                    const [productData, attributeData, categoryData] = await Promise.all([
                        getSupplierProducts(),
                        getAttributes(),
                        getCategories(),
                    ]);
                    if (active) {
                        setProducts(productData?.items || []);
                        setAttributes(attributeData || { sizes: [], colors: [], sports: [] });
                        setCategories(categoryData || []);
                    }
                } else if (section === "inventory") {
                    const invData = await getSupplierInventory();
                    if (active) {
                        setProducts(invData?.items || []);
                        setInventorySummary(invData?.summary || { total_products: 0, total_stock: 0, total_sold: 0 });
                    }
                } else if (section === "orders") {
                    const data = await getSupplierSubOrders();
                    if (active) setSuborders(data?.items || []);
                } else if (section === "finance") {
                    const data = await getSupplierFinance();
                    if (active) setFinance(data || { suborders: [], payouts: [] });
                } else if (section === "profile") {
                    const data = await getSupplierProfile();
                    if (active) setProfile(data);
                }
            } catch (error) {
                console.error(`Không thể tải dữ liệu Supplier (${section}):`, error);
                if (active) {
                    toast.error(getErrorMessage(error, "Không thể tải dữ liệu. Vui lòng thử tải lại."));
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        loadSection();
        return () => { active = false; };
    }, [section]);

    const reloadInventory = async () => {
        const data = await getSupplierInventory();
        setProducts(data?.items || []);
        setInventorySummary(data?.summary || { total_products: 0, total_stock: 0, total_sold: 0 });
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const payload = Object.fromEntries(form.entries());
        setSubmitting(true);
        try {
            if (profileLogoFile) {
                const image = await uploadImage(profileLogoFile);
                if (!image?.url) throw new Error("Ảnh tải lên không có đường dẫn hợp lệ.");
                payload.logo_url = image.url;
            } else {
                payload.logo_url = profile?.logo_url || "";
            }
            const saved = await updateSupplierProfile(payload);
            setProfile(saved);
            toast.success("Đã cập nhật hồ sơ thương hiệu.");
            setProfileLogoFile(null);
            setShowProfileModal(false);
        } catch (error) {
            console.error("Không thể cập nhật hồ sơ Supplier:", error);
            toast.error(getErrorMessage(error, "Không thể lưu hồ sơ thương hiệu."));
        } finally {
            setSubmitting(false);
        }
    };

    const reloadProducts = async () => {
        const data = await getSupplierProducts();
        setProducts(data?.items || []);
    };

    const handleDeleteProduct = async (product) => {
        if (!window.confirm(`Bạn muốn xóa sản phẩm "${product.name}"?`)) return;
        try {
            await deleteSupplierProduct(product.id);
            await reloadProducts();
            toast.success(`Đã xóa sản phẩm ${product.name}`);
        } catch (error) {
            console.error("Không thể xóa sản phẩm Supplier:", error);
            toast.error(getErrorMessage(error, "Không thể xóa sản phẩm."));
        }
    };

    return (
        <div className="supplier-wrapper">
            <aside className="supplier-sidebar">
                <div className="supplier-brand">STREETVIBE // SUPPLIER</div>
                <nav className="supplier-nav">
                    {supplierLinks.map(([slug, label]) => (
                        <Link key={slug} className={`supplier-nav-link${section === slug ? " active" : ""}`} to={`/supplier/${slug}`}>
                            {label}
                        </Link>
                    ))}
                </nav>
                <button type="button" className="supplier-logout" onClick={() => logout("/login")}>ĐĂNG XUẤT</button>
            </aside>

            <main className="supplier-main">
                <header className="supplier-topbar">
                    <span>SUPPLIER CONTROL // {section.toUpperCase()}</span>
                    {profile?.logo_url ? (
                        <img
                            className="supplier-topbar-logo"
                            src={profile.logo_url}
                            alt={`Logo ${profile.brand_name || "thương hiệu"}`}
                        />
                    ) : (
                        <strong>{profile?.brand_name || dashboard?.brand_name || user?.name || "BRAND ACCOUNT"}</strong>
                    )}
                </header>
                <section className="supplier-content">
                    {loading && <p className="supplier-feedback" role="status">ĐANG TẢI DỮ LIỆU...</p>}

                    {section === "dashboard" && (
                        <div className="supplier-dashboard-view">
                            <span className="supplier-status">[HỒ SƠ THƯƠNG HIỆU // {dashboard?.supplier_status || "SYNCING"}]</span>
                            <h1>Tổng quan thương hiệu</h1>
                            {dashboard && (
                                <>
                                    <h2 className="supplier-dashboard-brand">{dashboard.brand_name}</h2>
                                    <div className="supplier-kpi-grid">
                                        <article><span>DOANH THU GỘP</span><strong>{Number(dashboard.gross_revenue || 0).toLocaleString("vi-VN")} ₫</strong></article>
                                        <article><span>THỰC NHẬN SAU HOA HỒNG</span><strong>{Number(dashboard.net_revenue || 0).toLocaleString("vi-VN")} ₫</strong></article>
                                        <article><span>SẢN PHẨM ĐANG BÁN</span><strong>{dashboard.products_on_sale ?? 0}</strong></article>
                                        <article><span>SẢN PHẨM CHỜ DUYỆT</span><strong>{dashboard.products_pending ?? 0}</strong></article>
                                        <article><span>ĐƠN CHỜ XÁC NHẬN</span><strong>{dashboard.pending_suborders ?? 0}</strong></article>
                                    </div>
                                </>
                            )}
                            <div className="supplier-dashboard-quick-links">
                                <Link to="/supplier/products">QUẢN LÝ SẢN PHẨM <span>→</span></Link>
                                <Link to="/supplier/orders">XỬ LÝ ĐƠN HÀNG <span>→</span></Link>
                                <Link to="/supplier/profile">CẬP NHẬT HỒ SƠ <span>→</span></Link>
                            </div>
                        </div>
                    )}

                    {section === "products" && (
                        <div className="supplier-products-panel">
                            <div className="supplier-panel-header">
                                <div>
                                    <h1>Quản lý sản phẩm</h1>
                                    <p>Tổng số: {products.length} sản phẩm của thương hiệu</p>
                                </div>
                                <div className="supplier-panel-actions">
                                    <button
                                        type="button"
                                        className="supplier-refresh-button"
                                        title="Tải lại danh sách"
                                        disabled={loading}
                                        onClick={async () => {
                                            setLoading(true);
                                            try {
                                                const data = await getSupplierProducts();
                                                setProducts(data?.items || []);
                                            } catch (error) {
                                                console.error("Không thể tải lại sản phẩm Supplier:", error);
                                                toast.error(getErrorMessage(error, "Không thể tải lại danh sách sản phẩm."));
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                    >
                                        <RefreshCw size={15} />
                                    </button>
                                    <button type="button" className="supplier-primary-button" onClick={() => setProductForm({ product: null })}>
                                        <PackagePlus size={15} /> THÊM SẢN PHẨM
                                    </button>
                                </div>
                            </div>

                            <div className="supplier-search-row">
                                <input
                                    type="search"
                                    aria-label="Tìm sản phẩm"
                                    placeholder="Tìm theo tên hoặc mô tả..."
                                    value={productSearch}
                                    onChange={(event) => setProductSearch(event.target.value)}
                                />
                            </div>

                            <PaginatedList items={visibleProducts} resetKey={productSearch}>
                                {(rows) => (
                                    <div className="supplier-products-table-wrap">
                                        <table className="supplier-products-table">
                                            <thead>
                                                <tr>
                                                    <th>Sản phẩm</th>
                                                    <th>Mô tả</th>
                                                    <th>Giá</th>
                                                    <th>Danh mục</th>
                                                    <th>Trạng thái</th>
                                                    <th>Hành động</th>
                                                    <th>Chi tiết</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {visibleProducts.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="supplier-table-empty">
                                                            {productSearch ? "Không tìm thấy sản phẩm phù hợp." : "Chưa có sản phẩm. Hãy chọn “Thêm sản phẩm” để bắt đầu."}
                                                        </td>
                                                    </tr>
                                                ) : rows.map((product) => (
                                                    <tr key={product.id}>
                                                        <td>
                                                            <div className="supplier-product-name-cell">
                                                                {product.image && <img src={product.image} alt="" />}
                                                                <div>
                                                                    <strong>{product.name}</strong>
                                                                    <span className="supplier-sku-code">{product.sku}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="supplier-product-description">{product.description || "—"}</td>
                                                        <td className="supplier-product-price">{Number(product.price).toLocaleString("vi-VN")} ₫</td>
                                                        <td>{product.category?.name || "—"}</td>
                                                        <td><span className={`supplier-product-status ${String(product.status || "").toLowerCase()}`}>{product.status || "—"}</span></td>
                                                        <td>
                                                            <div className="supplier-table-actions">
                                                                <button type="button" className="supplier-outline-button" onClick={() => setProductForm({ product })}>
                                                                    <Pencil size={13} /> SỬA
                                                                </button>
                                                                <button type="button" className="supplier-danger-button" onClick={() => handleDeleteProduct(product)}>
                                                                    <Trash2 size={13} /> XÓA
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="supplier-icon-button"
                                                                title="Xem chi tiết sản phẩm"
                                                                aria-label={`Xem chi tiết ${product.name}`}
                                                                onClick={() => setDetailProduct(product)}
                                                            >
                                                                <Eye size={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </PaginatedList>
                        </div>
                    )}

                    {section === "inventory" && (
                        <div className="supplier-products-panel">
                            <div className="supplier-panel-header">
                                <div>
                                    <h1>Quản lý kho hàng</h1>
                                    <p>Bấm biểu tượng cây bút để xem và chỉnh sửa tồn kho của từng sản phẩm</p>
                                </div>
                            </div>

                            <div className="supplier-kpi-grid supplier-inventory-kpis">
                                <article><span>TỔNG SẢN PHẨM</span><strong>{inventorySummary.total_products}</strong></article>
                                <article><span>LƯỢNG HÀNG HIỆN CÓ</span><strong>{inventorySummary.total_stock}</strong></article>
                                <article><span>ĐÃ BÁN</span><strong>{inventorySummary.total_sold}</strong></article>
                            </div>

                            <PaginatedList items={products}>
                                {(rows) => (
                                    <div className="supplier-products-table-wrap">
                                        <table className="supplier-products-table">
                                            <thead>
                                                <tr>
                                                    <th>Sản phẩm</th>
                                                    <th>Danh mục</th>
                                                    <th>Đã bán</th>
                                                    <th>Lượng hàng hiện có</th>
                                                    <th>Chỉnh sửa</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((product) => (
                                                    <tr key={product.id}>
                                                        <td>
                                                            <div className="supplier-product-name-cell">
                                                                {product.image && <img src={product.image} alt="" />}
                                                                <div>
                                                                    <strong>{product.name}</strong>
                                                                    <span className="supplier-sku-code">{product.sku}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{product.category?.name || "—"}</td>
                                                        <td><strong>{product.sold_count ?? 0}</strong></td>
                                                        <td><strong>{product.stock ?? 0}</strong></td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="supplier-icon-button"
                                                                title="Chỉnh sửa tồn kho"
                                                                aria-label={`Chỉnh sửa tồn kho ${product.name}`}
                                                                onClick={() => setStockProduct(product)}
                                                            >
                                                                <Pencil size={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {products.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="supplier-table-empty">
                                                            Chưa có sản phẩm nào trong kho.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </PaginatedList>
                        </div>
                    )}

                    {section === "orders" && (
                        <>
                            <h1>Đơn hàng con thương hiệu</h1>
                            <PaginatedList items={suborders}>
                                {(rows) => rows.map((order) => (
                                    <div className="supplier-order-row" key={order.id}>
                                        <strong>{order.id}</strong>
                                        <span>{order.subtotal?.toLocaleString?.("vi-VN") || order.subtotal} ₫</span>
                                        <span>{(order.items || []).map((item) => `${item.sku || "-"} / ${item.color_name || "-"} / ${item.size_name || "-"} x${item.quantity}`).join(" | ")}</span>
                                        <select value={order.fulfillment_status} onChange={async (e) => {
                                            try {
                                                await updateSubOrderStatus(order.id, e.target.value);
                                                setSuborders((prev) => prev.map((x) => x.id === order.id ? { ...x, fulfillment_status: e.target.value } : x));
                                            } catch (error) {
                                                console.error("Không thể cập nhật trạng thái SubOrder:", error);
                                                toast.error(getErrorMessage(error, "Không thể cập nhật trạng thái đơn hàng."));
                                            }
                                        }}>
                                            {["PENDING", "PACKING", "READY_TO_SHIP", "CANCELLED", "COMPLETED"].map((status) => <option key={status}>{status}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </PaginatedList>
                        </>
                    )}

                    {section === "finance" && (
                        <>
                            <h1>Doanh thu & đối soát</h1>
                            <PaginatedList items={financeSuborders}>
                                {(rows) => rows.map((order) => (
                                    <div className="supplier-order-row" key={order.id}>
                                        <strong>{order.id}</strong>
                                        <span>Subtotal: {Number(order.subtotal).toLocaleString("vi-VN")} ₫</span>
                                        <span>Hoa hồng: {Number(order.commission_amount).toLocaleString("vi-VN")} ₫</span>
                                        <span>Net: {Number(order.net_payout).toLocaleString("vi-VN")} ₫</span>
                                    </div>
                                ))}
                            </PaginatedList>
                        </>
                    )}

                    {section === "profile" && profile && (
                        <div className="supplier-profile-panel">
                            <div className="supplier-panel-header">
                                <div>
                                    <h1>Hồ sơ thương hiệu</h1>
                                    <p>Thông tin nhận diện và vận hành của Supplier</p>
                                </div>
                                <button type="button" className="supplier-primary-button" onClick={() => setShowProfileModal(true)}>
                                    <Pencil size={15} /> CHỈNH SỬA HỒ SƠ
                                </button>
                            </div>
                            <div className="supplier-profile-card">
                                <div className="supplier-profile-logo">
                                    {profile.logo_url
                                        ? <img src={profile.logo_url} alt={`Logo ${profile.brand_name}`} />
                                        : <span>{profile.brand_name?.slice(0, 1)?.toUpperCase() || "S"}</span>}
                                </div>
                                <div className="supplier-profile-details">
                                    <div className="supplier-profile-heading">
                                        <div className="supplier-profile-title">
                                            <h2>{profile.brand_name}</h2>
                                            <span className={`supplier-product-status ${String(profile.status || "").toLowerCase()}`}>{profile.status}</span>
                                        </div>
                                        <strong className="supplier-profile-commission">
                                            CHIẾT KHẤU: {Number(profile.commission_rate || 0)}%
                                        </strong>
                                    </div>
                                    <p>{profile.description || "Chưa có mô tả thương hiệu."}</p>
                                    <dl>
                                        <div><dt>ĐỊA CHỈ KHO</dt><dd>{profile.warehouse_address || "Chưa cập nhật"}</dd></div>
                                        <div><dt>TÀI KHOẢN NHẬN TIỀN</dt><dd>{profile.bank_account_info || "Chưa cập nhật"}</dd></div>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </main>

            {detailProduct && (
                <SupplierModal
                    title={detailProduct.name}
                    eyebrow="[ PRODUCT DETAIL ]"
                    onClose={() => setDetailProduct(null)}
                >
                    <ProductDetailView product={detailProduct} />
                </SupplierModal>
            )}

            {stockProduct && (
                <StockEditModal
                    product={stockProduct}
                    onClose={() => setStockProduct(null)}
                    onReload={reloadInventory}
                    onSaved={(product) => {
                        toast.success(`Đã cập nhật tồn kho cho ${product.name}`);
                        setStockProduct(null);
                    }}
                />
            )}

            {productForm && (
                <SupplierProductFormModal
                    product={productForm.product}
                    categories={categories}
                    attributes={attributes}
                    onClose={() => setProductForm(null)}
                    onReload={() => reloadProducts().catch(() => toast.error("Không thể tải lại danh sách sản phẩm."))}
                    onSaved={async ({ needsApproval }) => {
                        const isEdit = Boolean(productForm.product);
                        setProductForm(null);
                        if (!isEdit) toast.success("Đã tạo sản phẩm. Sản phẩm đang chờ Admin duyệt.");
                        else if (needsApproval) toast.success("Đã cập nhật sản phẩm. Sản phẩm chuyển về trạng thái chờ Admin duyệt.");
                        else toast.success("Đã cập nhật sản phẩm.");
                        await reloadProducts().catch(() => toast.error("Không thể tải lại danh sách sản phẩm."));
                    }}
                />
            )}

            {showProfileModal && profile && (
                <SupplierModal
                    title="Chỉnh sửa hồ sơ"
                    eyebrow="[ BRAND PROFILE // UPDATE ]"
                    onClose={() => {
                        setShowProfileModal(false);
                        setProfileLogoFile(null);
                    }}
                >
                    <form className="supplier-modal-form" onSubmit={saveProfile}>
                                                <div className="supplier-modal-grid">
                            <label className="supplier-modal-field-full">
                                TÊN THƯƠNG HIỆU
                                <input name="brand_name" defaultValue={profile.brand_name} required />
                            </label>
                            <label className="supplier-modal-field-full">
                                LOGO THƯƠNG HIỆU
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => setProfileLogoFile(event.target.files?.[0] || null)}
                                />
                                <small>{profileLogoFile ? `Đã chọn: ${profileLogoFile.name}` : "Chọn ảnh logo từ thiết bị để tải lên."}</small>
                                {profile.logo_url && <img className="supplier-logo-preview" src={profile.logo_url} alt={`Logo ${profile.brand_name}`} />}
                            </label>
                            <label className="supplier-modal-field-full">
                                MÔ TẢ THƯƠNG HIỆU
                                <textarea name="description" defaultValue={profile.description} rows="3" />
                            </label>
                            <label className="supplier-modal-field-full">
                                ĐỊA CHỈ KHO
                                <textarea name="warehouse_address" defaultValue={profile.warehouse_address} rows="2" />
                            </label>
                            <label className="supplier-modal-field-full">
                                TÀI KHOẢN NGÂN HÀNG NHẬN ĐỐI SOÁT
                                <textarea name="bank_account_info" defaultValue={profile.bank_account_info} rows="2" />
                            </label>
                        </div>
                        <div className="supplier-modal-actions">
                            <button type="button" className="supplier-secondary-button" onClick={() => {
                                setShowProfileModal(false);
                                setProfileLogoFile(null);
                            }}>HỦY</button>
                            <button type="submit" className="supplier-primary-button" disabled={submitting}>
                                {submitting ? "ĐANG LƯU..." : "LƯU HỒ SƠ"}
                            </button>
                        </div>
                    </form>
                </SupplierModal>
            )}

        </div>
    );
}
