import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { getBrands, getCategories, getProductsPage } from "../api/productsApi";
import { getAttributes } from "../../../shared/api/marketplaceApi";
import { filterSizesByFootwear, getProductCategoryOptions, sortSizeNames } from "../utils/categoryHierarchy";
import AtelierProductCard from "../components/AtelierProductCard";
import CatalogSizeSlider from "../components/CatalogSizeSlider";
import "../styles/atelierBrutal.css";
import { toast } from "../../../shared/utils/toast";

const PRODUCTS_PER_PAGE = 8;

const FIT_OPTIONS = [
    { value: "BOXY_FIT", label: "BOXY FIT" },
    { value: "OVERSIZED", label: "OVERSIZED" },
    { value: "RELAXED_DROP", label: "RELAXED DROP" },
];

export default function BestSellerPage() {
    const [products, setProducts] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [productsError, setProductsError] = useState(false);
    const [productsLoading, setProductsLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [sports, setSports] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedSport, setSelectedSport] = useState("");
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

    const updateCatalogFilter = (setFilter, value) => {
        setCurrentPage(1);
        setFilter(value);
    };

    useEffect(() => {
        let active = true;
        const params = { page: currentPage, limit: PRODUCTS_PER_PAGE };
        if (selectedCategory) params.category_id = selectedCategory;
        if (selectedSport) params.sport_id = selectedSport;
        if (selectedBrand) params.brand = selectedBrand;
        if (selectedFit) params.fit = selectedFit;
        if (selectedSize) params.size = selectedSize;
        if (stockFilter !== "ALL") params.in_stock = stockFilter === "IN_STOCK";
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProductsLoading(true);
        getProductsPage(params)
            .then((result) => {
                if (active) {
                    setProducts(result.items);
                    setTotalPages(result.totalPages);
                    setProductsError(false);
                }
            })
            .catch(() => {
                if (!active) return;
                setProductsError(true);
                toast.error("Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.");
            })
            .finally(() => { if (active) setProductsLoading(false); });
        return () => { active = false; };
    }, [currentPage, selectedCategory, selectedSport, selectedBrand, selectedFit, selectedSize, stockFilter]);

    useEffect(() => {
        let active = true;
        getCategories()
            .then((items) => { if (active) setCategories(items); })
            .catch(() => { if (active) toast.error("Không thể tải danh mục sản phẩm."); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        getBrands()
            .then((items) => { if (active) setBrands(items); })
            .catch((error) => {
                console.error("Lỗi khi tải danh sách thương hiệu:", error);
                if (active) toast.error("Không thể tải danh sách thương hiệu.");
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        getAttributes()
            .then((attributes) => {
                if (active) {
                    setSizes(attributes?.sizes || []);
                    setSports(attributes?.sports || []);
                }
            })
            .catch((error) => {
                console.error("Lỗi khi tải danh sách size:", error);
                if (active) toast.error("Không thể tải size.");
            });
        return () => { active = false; };
    }, []);

    const sizeGroups = [
        { title: "Size Quần áo (Apparel)", isFootwear: false },
        { title: "Size Chân (Footwear)", isFootwear: true },
    ]
        .map(({ title, isFootwear }) => ({
            title,
            sizeNames: sortSizeNames(filterSizesByFootwear(sizes, isFootwear).map((size) => size.name)),
        }))
        .filter((group) => group.sizeNames.length > 0);

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
                            onChange={(event) => updateCatalogFilter(setSelectedCategory, event.target.value)}
                        >
                            <option value="">TẤT CẢ DANH MỤC</option>
                            {getProductCategoryOptions(categories).map((category) => (
                                <option key={category.id ?? category._id} value={category.id ?? category._id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="filter-section-title">
                            <span>THỂ THAO // SPORT</span>
                        </div>
                        <select
                            className="catalog-category-select"
                            aria-label="Lọc theo môn thể thao"
                            value={selectedSport}
                            onChange={(event) => updateCatalogFilter(setSelectedSport, event.target.value)}
                        >
                            <option value="">TẤT CẢ MÔN THỂ THAO</option>
                            {sports.map((sport) => (
                                <option key={sport.id} value={sport.id}>{sport.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="filter-section-title">
                            <span>THƯƠNG HIỆU // BRAND</span>
                        </div>
                        <select
                            className="catalog-category-select"
                            value={selectedBrand}
                            onChange={(event) => updateCatalogFilter(setSelectedBrand, event.target.value)}
                        >
                            <option value="">TẤT CẢ THƯƠNG HIỆU</option>
                            {brands.map((brand) => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="filter-section-title">
                            <span>FORM DÁNG // FIT</span>
                        </div>
                        <select
                            className="catalog-category-select"
                            aria-label="Lọc theo form dáng"
                            value={selectedFit}
                            onChange={(event) => updateCatalogFilter(setSelectedFit, event.target.value)}
                        >
                            <option value="">TẤT CẢ FORM</option>
                            {FIT_OPTIONS.map((fit) => (
                                <option key={fit.value} value={fit.value}>{fit.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="filter-section-title">
                            <span>KÍCH THƯỚC // SIZE</span>
                        </div>
                        {sizeGroups.length > 0 ? (
                            <div className="catalog-size-groups">
                                {sizeGroups.map((group) => (
                                    <CatalogSizeSlider
                                        key={group.title}
                                        title={group.title}
                                        sizeNames={group.sizeNames}
                                        selectedSize={selectedSize}
                                        onSelect={(size) => updateCatalogFilter(setSelectedSize, size)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <small className="catalog-filter-error">
                                Chưa có size được thiết lập.
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
                                onClick={() => updateCatalogFilter(setStockFilter, "ALL")}
                            >
                                <span>TẤT CẢ</span>
                            </button>
                            <button
                                type="button"
                                className={`filter-btn-item ${stockFilter === "IN_STOCK" ? "active" : ""}`}
                                onClick={() => updateCatalogFilter(setStockFilter, "IN_STOCK")}
                            >
                                <span>SẴN SÀNG GIAO (IN STOCK)</span>
                            </button>
                            <button
                                type="button"
                                className={`filter-btn-item ${stockFilter === "OUT_OF_STOCK" ? "active" : ""}`}
                                onClick={() => updateCatalogFilter(setStockFilter, "OUT_OF_STOCK")}
                            >
                                <span>HẾT HÀNG (SOLD OUT)</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Right: 4-Column Product Grid */}
                <div className="catalog-results">
                    <div className="atelier-product-grid">
                        {products.map((product) => <AtelierProductCard key={product.id} product={product} />)}
                    </div>
                    {productsLoading && <p className="trending-load-message">Đang tải sản phẩm...</p>}
                    {!productsLoading && !productsError && products.length === 0 && (
                        <p className="trending-load-message">Chưa có sản phẩm nào được duyệt.</p>
                    )}

                    {/* Minimalist Pagination */}
                    <div className="catalog-pagination">
                        <span>PAGE {String(currentPage).padStart(2, "0")} // {String(totalPages).padStart(2, "0")}</span>
                        <div className="catalog-pagination-controls">
                            <button
                                type="button"
                                className="btn-brutal-outline"
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={currentPage === 1 || productsLoading}
                            >
                                &larr; TRƯỚC
                            </button>
                            <button
                                type="button"
                                className="btn-brutal"
                                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                disabled={currentPage >= totalPages || productsLoading}
                            >
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
                        onClick={() => toast.success("ĐÃ LƯU ĐỊA CHỈ NHẬN MÃ DROP 008!")}
                    >
                        [ĐĂNG KÝ NHẮC GIỜ VIP]
                    </button>
                </div>
            </section>
        </main>
    );
}
