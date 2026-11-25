import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { getCategories } from "../../products/api/productsApi";
import {
    getAttributes,
    getSupplierProfile,
    updateSupplierProfile,
    getSupplierProducts,
    createSupplierProduct,
    createProductVariants,
    getSupplierSubOrders,
    updateSubOrderStatus,
    getSupplierFinance,
} from "../../../shared/api/marketplaceApi";
import {
    getProductCategoryOptions,
    isApparelCategory,
} from "../../products/utils/categoryHierarchy";
import "../styles/supplier.css";

const supplierLinks = [
    ["dashboard", "Tổng quan"],
    ["products", "Sản phẩm & biến thể"],
    ["orders", "Đơn hàng con"],
    ["finance", "Doanh thu & đối soát"],
    ["profile", "Hồ sơ thương hiệu"],
];

export default function SupplierPage() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const section = location.pathname.split("/").filter(Boolean)[1] || "dashboard";
    const [profile, setProfile] = useState(null);
    const [products, setProducts] = useState([]);
    const [suborders, setSuborders] = useState([]);
    const [finance, setFinance] = useState({ suborders: [], payouts: [] });
    const [attributes, setAttributes] = useState({ sizes: [], colors: [] });
    const [categories, setCategories] = useState([]);
    const [productCategoryId, setProductCategoryId] = useState("");
    const [productFit, setProductFit] = useState("");
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);

    useEffect(() => {
        getSupplierProfile().then(setProfile).catch(() => {});
        getSupplierProducts().then((data) => setProducts(data?.items || [])).catch(() => {});
        getSupplierSubOrders().then((data) => setSuborders(data?.items || [])).catch(() => {});
        getSupplierFinance().then(setFinance).catch(() => {});
        getAttributes().then(setAttributes).catch(() => {});
        getCategories().then(setCategories).catch(() => {});
    }, []);

    const saveProfile = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const payload = Object.fromEntries(form.entries());
        const saved = await updateSupplierProfile(payload);
        setProfile(saved);
    };

    const createProduct = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await createSupplierProduct({
            name: form.get("name"),
            fit: isApparelCategory(productCategoryId, categories) ? productFit : "",
            description: form.get("description"),
            price: Number(form.get("price")),
            original_price: Number(form.get("original_price") || 0),
            stock: Number(form.get("stock") || 0),
            image: form.get("image"),
            category_id: form.get("category_id"),
        });
        const data = await getSupplierProducts();
        setProducts(data?.items || []);
        setProductCategoryId("");
        setProductFit("");
        event.currentTarget.reset();
    };

    const submitVariants = async () => {
        if (!selectedProduct) return;
        const variants = [];
        selectedColors.forEach((colorId) => {
            selectedSizes.forEach((sizeId) => {
                variants.push({
                    color_id: colorId,
                    size_id: sizeId,
                    sku: `${selectedProduct.slice(0, 8)}-${colorId.slice(0, 4)}-${sizeId.slice(0, 4)}`,
                    stock_quantity: 0,
                });
            });
        });
        await createProductVariants(selectedProduct, variants);
    };

    return (
        <div className="supplier-wrapper">
            <aside className="supplier-sidebar">
                <div className="supplier-brand">STREETVIBE // SUPPLIER</div>
                <nav className="supplier-nav">
                    {supplierLinks.map(([slug, label]) => (
                        <Link key={slug} className={`supplier-nav-link${section === slug ? " active" : ""}`} to={`/supplier/${slug}`}>
                            [{slug.toUpperCase()}] {label}
                        </Link>
                    ))}
                </nav>
                <button type="button" className="supplier-logout" onClick={() => logout("/login")}>ĐĂNG XUẤT</button>
            </aside>

            <main className="supplier-main">
                <header className="supplier-topbar">
                    <span>SUPPLIER CONTROL // {section.toUpperCase()}</span>
                    <strong>{user?.name || "BRAND ACCOUNT"}</strong>
                </header>
                <section className="supplier-content">
                    {section === "dashboard" && (
                        <>
                            <span className="supplier-status">[LIVE BRAND OPERATIONS]</span>
                            <h1>Tổng quan thương hiệu</h1>
                            <div className="supplier-kpi-grid">
                                <article><span>SẢN PHẨM</span><strong>{products.length}</strong></article>
                                <article><span>ĐƠN CHỜ XỬ LÝ</span><strong>{suborders.filter((x) => x.fulfillment_status === "PENDING").length}</strong></article>
                                <article><span>DOANH THU GỘP</span><strong>{(finance.suborders || []).reduce((sum, x) => sum + Number(x.subtotal || 0), 0).toLocaleString("vi-VN")} ₫</strong></article>
                                <article><span>THỰC NHẬN</span><strong>{(finance.suborders || []).reduce((sum, x) => sum + Number(x.net_payout || 0), 0).toLocaleString("vi-VN")} ₫</strong></article>
                            </div>
                        </>
                    )}

                    {section === "products" && (
                        <>
                            <h1>Sản phẩm & ma trận biến thể</h1>
                            <form className="supplier-form" onSubmit={createProduct}>
                                <input name="name" placeholder="Tên sản phẩm" required />
                                <select
                                    name="fit"
                                    value={productFit}
                                    disabled={!isApparelCategory(productCategoryId, categories)}
                                    onChange={(event) => setProductFit(event.target.value)}
                                >
                                    <option value="">
                                        {isApparelCategory(productCategoryId, categories) ? "Chọn form dáng" : "Chỉ áp dụng cho Apparel"}
                                    </option>
                                    <option value="BOXY_FIT">Boxy Fit</option>
                                    <option value="OVERSIZED">Oversized</option>
                                    <option value="RELAXED_DROP">Relaxed Drop</option>
                                </select>
                                <textarea name="description" placeholder="Mô tả" />
                                <input name="price" type="number" min="1" placeholder="Giá bán" required />
                                <input name="original_price" type="number" min="0" placeholder="Giá gốc" />
                                <input name="stock" type="number" min="0" placeholder="Tồn kho" />
                                <input name="image" placeholder="URL ảnh sản phẩm" />
                                <select
                                    name="category_id"
                                    value={productCategoryId}
                                    onChange={(event) => {
                                        const categoryId = event.target.value;
                                        setProductCategoryId(categoryId);
                                        if (!isApparelCategory(categoryId, categories)) setProductFit("");
                                    }}
                                    required
                                >
                                    <option value="">Chọn danh mục</option>
                                    {getProductCategoryOptions(categories).map((category) => (
                                        <option key={category._id} value={category._id}>{category.displayName}</option>
                                    ))}
                                </select>
                                <button type="submit">TẠO SẢN PHẨM // PENDING</button>
                            </form>

                            <h2>Ma trận biến thể</h2>
                            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                                <option value="">Chọn sản phẩm</option>
                                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                            </select>
                            <div className="supplier-checkboxes">
                                {attributes.colors.map((color) => (
                                    <label key={color.id}>
                                        <input type="checkbox" checked={selectedColors.includes(color.id)} onChange={(e) => setSelectedColors((prev) => e.target.checked ? [...prev, color.id] : prev.filter((id) => id !== color.id))} />
                                        <span style={{ color: color.hex_code }}>{color.name}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="supplier-checkboxes">
                                {attributes.sizes.map((size) => (
                                    <label key={size.id}>
                                        <input type="checkbox" checked={selectedSizes.includes(size.id)} onChange={(e) => setSelectedSizes((prev) => e.target.checked ? [...prev, size.id] : prev.filter((id) => id !== size.id))} />
                                        {size.name}
                                    </label>
                                ))}
                            </div>
                            <button type="button" onClick={submitVariants}>SINH BIẾN THỂ</button>

                            <div className="supplier-table">
                                {products.map((product) => (
                                    <div className="supplier-table-row" key={product.id}>
                                        <strong>{product.name}</strong>
                                        <span>{product.status}</span>
                                        <span>{Number(product.price).toLocaleString("vi-VN")} ₫</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {section === "orders" && (
                        <>
                            <h1>Đơn hàng con thương hiệu</h1>
                            {suborders.map((order) => (
                                <div className="supplier-order-row" key={order.id}>
                                    <strong>{order.id}</strong>
                                    <span>{order.subtotal?.toLocaleString?.("vi-VN") || order.subtotal} ₫</span>
                                    <span>{(order.items || []).map((item) => `${item.sku || "-"} / ${item.color_name || "-"} / ${item.size_name || "-"} x${item.quantity}`).join(" | ")}</span>
                                    <select value={order.fulfillment_status} onChange={async (e) => {
                                        await updateSubOrderStatus(order.id, e.target.value);
                                        setSuborders((prev) => prev.map((x) => x.id === order.id ? { ...x, fulfillment_status: e.target.value } : x));
                                    }}>
                                        {["PENDING", "PACKING", "READY_TO_SHIP", "CANCELLED", "COMPLETED"].map((status) => <option key={status}>{status}</option>)}
                                    </select>
                                </div>
                            ))}
                        </>
                    )}

                    {section === "finance" && (
                        <>
                            <h1>Doanh thu & đối soát</h1>
                            {(finance.suborders || []).map((order) => (
                                <div className="supplier-order-row" key={order.id}>
                                    <strong>{order.id}</strong>
                                    <span>Subtotal: {Number(order.subtotal).toLocaleString("vi-VN")} ₫</span>
                                    <span>Hoa hồng: {Number(order.commission_amount).toLocaleString("vi-VN")} ₫</span>
                                    <span>Net: {Number(order.net_payout).toLocaleString("vi-VN")} ₫</span>
                                </div>
                            ))}
                        </>
                    )}

                    {section === "profile" && profile && (
                        <form className="supplier-form" onSubmit={saveProfile}>
                            <input name="brand_name" defaultValue={profile.brand_name} placeholder="Tên thương hiệu" />
                            <input name="logo_url" defaultValue={profile.logo_url} placeholder="Logo URL" />
                            <textarea name="description" defaultValue={profile.description} placeholder="Mô tả thương hiệu" />
                            <textarea name="warehouse_address" defaultValue={profile.warehouse_address} placeholder="Địa chỉ kho" />
                            <textarea name="bank_account_info" defaultValue={profile.bank_account_info} placeholder="Thông tin tài khoản ngân hàng" />
                            <button type="submit">LƯU HỒ SƠ THƯƠNG HIỆU</button>
                        </form>
                    )}
                </section>
            </main>
        </div>
    );
}
