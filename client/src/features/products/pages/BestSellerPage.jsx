import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { getBrands, getCategories, getProducts } from "../api/productsApi";
import { getAttributes } from "../../../shared/api/marketplaceApi";
import AtelierProductCard from "../components/AtelierProductCard";
import "../styles/atelierBrutal.css";

const FIT_OPTIONS = [
    { value: "BOXY_FIT", label: "BOXY FIT" },
    { value: "OVERSIZED", label: "OVERSIZED" },
    { value: "RELAXED_DROP", label: "RELAXED DROP" },
];

export default function BestSellerPage() {
    const [products, setProducts] = useState([]);
    const [productsError, setProductsError] = useState("");
    const [productsLoading, setProductsLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [categoryError, setCategoryError] = useState("");
    const [brandError, setBrandError] = useState("");
    const [attributeError, setAttributeError] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedBrand, setSelectedBrand] = useState("");
    const [selectedFit, setSelectedFit] = useState("");
    const [selectedSize, setSelectedSize] = useState("");
    const [stockFilter, setStockFilter] = useState("ALL");

    // Countdown timer for next drop
    const [countdown, setCountdown] = useState({
        days: 3,
        hours: 14,
        minutes: 28,
        seconds: 45,
    });

    useEffect(() => {
        let active = true;
        const params = {};
        if (selectedCategory) params.category_id = selectedCategory;
        if (selectedBrand) params.brand = selectedBrand;
        if (selectedFit) params.fit = selectedFit;
        if (selectedSize) params.size = selectedSize;
        if (stockFilter !== "ALL") params.in_stock = stockFilter === "IN_STOCK";
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProductsLoading(true);
        getProducts(params)
            .then((items) => {
                if (active) {
                    setProducts(items);
                    setProductsError("");
                }
            })
            .catch(() => { if (active) setProductsError("Không thể tải danh sách sản phẩm. Vui lòng thử lại sau."); })
            .finally(() => { if (active) setProductsLoading(false); });
        return () => { active = false; };
    }, [selectedCategory, selectedBrand, selectedFit, selectedSize, stockFilter]);

    useEffect(() => {
        let active = true;
        getCategories()
            .then((items) => { if (active) setCategories(items); })
            .catch(() => { if (active) setCategoryError("Không thể tải danh mục sản phẩm."); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        getBrands()
            .then((items) => { if (active) setBrands(items); })
            .catch((error) => {
                console.error("Lỗi khi tải danh sách thương hiệu:", error);
                if (active) setBrandError("Không thể tải danh sách thương hiệu.");
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        getAttributes()
            .then((attributes) => {
                if (active) {
                    setSizes(attributes?.sizes || []);
                    setAttributeError("");
                }
            })
            .catch((error) => {
                console.error("Lỗi khi tải danh sách size:", error);
                if (active) setAttributeError("Không thể tải size.");
            });
        return () => { active = false; };
    }, []);

    const sizeStops = ["", ...sizes.map((size) => size.name)];
    const selectedSizeIndex = Math.max(0, sizeStops.indexOf(selectedSize));

    // Live countdown effect
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
                if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <main className="atelier-catalog-page">
            {/* ================= 1. HEADER & INVENTORY RATIO ================= */}
            <div className="catalog-header-bar">
                <div>
                    <span className="mono-spec" style={{ color: "#d32f2f" }}>[ARCHIVAL REPOSITORY // V1]</span>
                    <h1>NEW DROPS // COLLECTION 2026</h1>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div className="mono-spec" style={{ fontWeight: "700" }}>
                        INVENTORY RATIO: 48 UNITS AVAILABLE / 84.2% ARCHIVE RATE
                    </div>
                    <div style={{ width: "240px", height: "4px", background: "#eee", marginTop: "6px", border: "1px solid #000" }}>
                        <div style={{ width: "84.2%", height: "100%", background: "#000" }} />
                    </div>
                </div>
            </div>

            {/* ================= 2. TWO-COLUMN SPEC FILTER MATRIX & PRODUCT GRID ================= */}
            <div className="catalog-spec-layout">
                {/* Left: Spec Filter Matrix */}
                <aside className="spec-filter-sidebar">
                    {/* Categories are maintained by Admin */}
                    <div>
                        <div className="filter-section-title">
                            <Filter size={13} />
                            <span>DANH MỤC SẢN PHẨM</span>
                        </div>
                        <select
                            className="catalog-category-select"
                            value={selectedCategory}
                            onChange={(event) => setSelectedCategory(event.target.value)}
                        >
                            <option value="">TẤT CẢ DANH MỤC</option>
                            {categories.map((category) => (
                                <option key={category.id ?? category._id} value={category.id ?? category._id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        {categoryError && <small className="catalog-filter-error">{categoryError}</small>}
                    </div>

                    <div>
                        <div className="filter-section-title">
                            <span>THƯƠNG HIỆU // BRAND</span>
                        </div>
                        <select
                            className="catalog-category-select"
                            value={selectedBrand}
                            onChange={(event) => setSelectedBrand(event.target.value)}
                        >
                            <option value="">TẤT CẢ THƯƠNG HIỆU</option>
                            {brands.map((brand) => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>
                        {brandError && <small className="catalog-filter-error">{brandError}</small>}
                    </div>

                    <div>
                        <div className="filter-section-title">
                            <span>FORM DÁNG // FIT</span>
                        </div>
                        <div className="filter-btn-list">
                            <button
                                type="button"
                                className={`filter-btn-item ${selectedFit === "" ? "active" : ""}`}
                                onClick={() => setSelectedFit("")}
                            >
                                <span>TẤT CẢ FORM</span>
                            </button>
                            {FIT_OPTIONS.map((fit) => (
                                <button
                                    key={fit.value}
                                    type="button"
                                    className={`filter-btn-item ${selectedFit === fit.value ? "active" : ""}`}
                                    onClick={() => setSelectedFit(fit.value)}
                                >
                                    <span>{fit.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="filter-section-title">
                            <span>KÍCH THƯỚC // SIZE</span>
                        </div>
                        {sizes.length > 0 ? (
                            <div className="catalog-size-slider">
                                <input
                                    type="range"
                                    min="0"
                                    max={sizeStops.length - 1}
                                    step="1"
                                    value={selectedSizeIndex}
                                    aria-label="Lọc theo kích thước"
                                    onChange={(event) => setSelectedSize(sizeStops[Number(event.target.value)])}
                                />
                                <div
                                    className="catalog-size-slider-labels"
                                    style={{ gridTemplateColumns: `repeat(${sizeStops.length}, minmax(0, 1fr))` }}
                                >
                                    {sizeStops.map((size, index) => (
                                        <button
                                            key={size || "all"}
                                            type="button"
                                            className={index === selectedSizeIndex ? "active" : ""}
                                            onClick={() => setSelectedSize(size)}
                                        >
                                            <span className="catalog-size-slider-tick" />
                                            {size || "ALL"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <small className="catalog-filter-error">
                                {attributeError || "Chưa có size được thiết lập."}
                            </small>
                        )}
                    </div>

                    {/* Stock filter uses current inventory values from the API */}
                    <div>
                        <div className="filter-section-title">
                            <span>TÌNH TRẠNG KHO</span>
                        </div>
                        <div className="filter-btn-list">
                            <button
                                type="button"
                                className={`filter-btn-item ${stockFilter === "ALL" ? "active" : ""}`}
                                onClick={() => setStockFilter("ALL")}
                            >
                                <span>TẤT CẢ</span>
                            </button>
                            <button
                                type="button"
                                className={`filter-btn-item ${stockFilter === "IN_STOCK" ? "active" : ""}`}
                                onClick={() => setStockFilter("IN_STOCK")}
                            >
                                <span>SẴN SÀNG GIAO (IN STOCK)</span>
                            </button>
                            <button
                                type="button"
                                className={`filter-btn-item ${stockFilter === "OUT_OF_STOCK" ? "active" : ""}`}
                                onClick={() => setStockFilter("OUT_OF_STOCK")}
                            >
                                <span>HẾT HÀNG</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Right: 4-Column Product Grid */}
                <div style={{ background: "var(--surface-white)" }}>
                    <div className="atelier-product-grid">
                        {products.map((product) => <AtelierProductCard key={product.id} product={product} />)}
                    </div>
                    {productsLoading && <p className="trending-load-message">Đang tải sản phẩm...</p>}
                    {productsError && <p className="trending-load-message error">{productsError}</p>}
                    {!productsLoading && !productsError && products.length === 0 && (
                        <p className="trending-load-message">Chưa có sản phẩm nào được duyệt.</p>
                    )}

                    {/* Minimalist Pagination */}
                    <div style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "var(--border-black)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                        <span>PAGE 01 // 04</span>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn-brutal-outline" style={{ padding: "8px 16px" }} disabled>
                                &larr; TRƯỚC
                            </button>
                            <button className="btn-brutal" style={{ padding: "8px 16px" }}>
                                TIẾP THEO &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= 3. BLACK COUNTDOWN BANNER FOR NEXT DROP ================= */}
            <section className="drop-countdown-banner">
                <div>
                    <div className="mono-spec" style={{ color: "#d32f2f", marginBottom: "8px" }}>
                        [NEXT ARCHIVE RELEASE // DROP 008]
                    </div>
                    <h2 style={{ fontSize: "28px", fontWeight: "800", textTransform: "uppercase" }}>
                        ĐẾM NGƯỢC MỞ BÁN DROP TIẾP THEO
                    </h2>
                    <p style={{ color: "#888", fontSize: "13px", marginTop: "4px" }}>
                        Sản xuất giới hạn 150 đơn vị toàn cầu. Không restock sau khi sold-out.
                    </p>
                </div>

                <div className="countdown-digits-row">
                    <div className="countdown-unit">
                        <span className="number">{String(countdown.days).padStart(2, "0")}</span>
                        <small>NGÀY</small>
                    </div>
                    <div className="countdown-unit">
                        <span className="number">{String(countdown.hours).padStart(2, "0")}</span>
                        <small>GIỜ</small>
                    </div>
                    <div className="countdown-unit">
                        <span className="number">{String(countdown.minutes).padStart(2, "0")}</span>
                        <small>PHÚT</small>
                    </div>
                    <div className="countdown-unit">
                        <span className="number">{String(countdown.seconds).padStart(2, "0")}</span>
                        <small>GIÂY</small>
                    </div>
                </div>

                <div>
                    <button
                        className="btn-brutal"
                        style={{ background: "#fff", color: "#000" }}
                        onClick={() => alert("ĐÃ LƯU ĐỊA CHỈ NHẬN MÃ DROP 008!")}
                    >
                        [ĐĂNG KÝ NHẮC GIỜ VIP]
                    </button>
                </div>
            </section>
        </main>
    );
}
