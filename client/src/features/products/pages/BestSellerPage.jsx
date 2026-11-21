import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sliders, Filter, Clock } from "lucide-react";
import { getProducts } from "../api/productsApi";
import pumaImg from "../../../assets/img/puma.webp";
import "../styles/atelierBrutal.css";

export default function BestSellerPage() {
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [selectedFit, setSelectedFit] = useState("ALL");
    const [gsmValue, setGsmValue] = useState(480);
    const [selectedSize, setSelectedSize] = useState("L");
    const [stockFilter, setStockFilter] = useState("READY");

    // Countdown timer for next drop
    const [countdown, setCountdown] = useState({
        days: 3,
        hours: 14,
        minutes: 28,
        seconds: 45,
    });

    useEffect(() => {
        getProducts().then((res) => {
            if (Array.isArray(res) && res.length > 0) {
                setProducts(res);
            } else {
                // Fallback prototype catalog items with full technical metadata
                setProducts([
                    { id: "1", name: "ARCHIVAL HEAVY HOODIE", price: 1450000, sku: "SV-HD-480", gsm: "480 GSM", status: "HOT DROP", image: pumaImg },
                    { id: "2", name: "TACTICAL CARGO // TITANIUM", price: 1850000, sku: "SV-CG-380", gsm: "380 GSM", status: "LOW STOCK", image: pumaImg },
                    { id: "3", name: "BOXY SLUB TEE", price: 790000, sku: "SV-TE-320", gsm: "320 GSM", status: "AVAILABLE", image: pumaImg },
                    { id: "4", name: "CYBER SNEAKER // NFC PASS", price: 2950000, sku: "SV-SN-001", gsm: "ARMOR NYLON", status: "HOT DROP", image: pumaImg },
                    { id: "5", name: "HEAVY FLEECE ZIP-UP", price: 1650000, sku: "SV-ZP-520", gsm: "520 GSM", status: "PRE-ORDER", image: pumaImg },
                    { id: "6", name: "TITANIUM CHAIN BELT", price: 650000, sku: "SV-BT-009", gsm: "TITANIUM GR5", status: "AVAILABLE", image: pumaImg },
                    { id: "7", name: "OVERSIZED ACID SWEATER", price: 1350000, sku: "SV-SW-420", gsm: "420 GSM", status: "LOW STOCK", image: pumaImg },
                    { id: "8", name: "PARACHUTE NYLON JOGGER", price: 1550000, sku: "SV-JG-280", gsm: "280 GSM", status: "AVAILABLE", image: pumaImg },
                ]);
            }
        });
    }, []);

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
                    {/* Category Selector */}
                    <div>
                        <div className="filter-section-title">
                            <Filter size={13} />
                            <span>DANH MỤC SẢN PHẨM</span>
                        </div>
                        <div className="filter-btn-list">
                            {[
                                { key: "ALL", label: "[TẤT CẢ DANH MỤC]", count: 48 },
                                { key: "HOODIE", label: "HEAVY HOODIES", count: 12 },
                                { key: "CARGO", label: "TACTICAL CARGO", count: 14 },
                                { key: "TEES", label: "BOXY TEES", count: 16 },
                                { key: "ACC", label: "ACCESSORIES", count: 6 },
                            ].map(item => (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={`filter-btn-item ${selectedCategory === item.key ? "active" : ""}`}
                                    onClick={() => setSelectedCategory(item.key)}
                                >
                                    <span>{item.label}</span>
                                    <span>[{item.count}]</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fit Silhouette */}
                    <div>
                        <div className="filter-section-title">
                            <Sliders size={13} />
                            <span>FORM DÁNG // FIT</span>
                        </div>
                        <div className="filter-btn-list">
                            {["ALL", "BOXY FIT", "OVERSIZED", "RELAXED DROP"].map(fit => (
                                <button
                                    key={fit}
                                    type="button"
                                    className={`filter-btn-item ${selectedFit === fit ? "active" : ""}`}
                                    onClick={() => setSelectedFit(fit)}
                                >
                                    <span>{fit}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fabric GSM Slider */}
                    <div>
                        <div className="filter-section-title">
                            <span>ĐỊNH LƯỢNG VẢI // GSM</span>
                        </div>
                        <div className="gsm-slider-wrapper">
                            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                                <span>280 GSM</span>
                                <strong style={{ color: "#000" }}>{gsmValue} GSM {gsmValue >= 480 ? "(ARMOR GRADE)" : ""}</strong>
                                <span>520+ GSM</span>
                            </div>
                            <input
                                type="range"
                                min="280"
                                max="520"
                                step="20"
                                value={gsmValue}
                                onChange={(e) => setGsmValue(Number(e.target.value))}
                            />
                            <small className="mono-spec" style={{ color: "#777", display: "block" }}>
                                Lọc độ dày và độ đứng phom dáng vải dệt
                            </small>
                        </div>
                    </div>

                    {/* Size Selector */}
                    <div>
                        <div className="filter-section-title">
                            <span>KÍCH THƯỚC // SIZE</span>
                        </div>
                        <div className="size-boxes-grid">
                            {["S", "M", "L", "XL", "XXL"].map(size => (
                                <button
                                    key={size}
                                    type="button"
                                    className={`size-box-btn ${selectedSize === size ? "active" : ""}`}
                                    onClick={() => setSelectedSize(size)}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stock status */}
                    <div>
                        <div className="filter-section-title">
                            <span>TÌNH TRẠNG KHO</span>
                        </div>
                        <div className="filter-btn-list">
                            <button
                                type="button"
                                className={`filter-btn-item ${stockFilter === "READY" ? "active" : ""}`}
                                onClick={() => setStockFilter("READY")}
                            >
                                <span>SẴN SÀNG GIAO (IN STOCK)</span>
                            </button>
                            <button
                                type="button"
                                className={`filter-btn-item ${stockFilter === "PRE" ? "active" : ""}`}
                                onClick={() => setStockFilter("PRE")}
                            >
                                <span>PRE-ORDER // CHỜ SẢN XUẤT</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Right: 4-Column Product Grid */}
                <div style={{ background: "var(--surface-white)" }}>
                    <div className="atelier-product-grid">
                        {products.map((item, index) => {
                            const sku = item.sku || `SV-ARCH-${index + 101}`;
                            const gsm = item.gsm || (index % 2 === 0 ? "480 GSM COTTON" : "380 GSM RIPSTOP");
                            const status = item.status || (index === 0 ? "HOT DROP" : index === 1 ? "LOW STOCK" : "AVAILABLE");
                            const priceFormatted = typeof item.price === "number" ? item.price.toLocaleString("vi-VN") + " ₫" : item.price;
                            const image = item.image || item.images?.[0] || pumaImg;

                            return (
                                <article className="atelier-product-card" key={item.id || index}>
                                    <div className="card-top-spec">
                                        <span>[{sku}]</span>
                                        <span>REF_2026</span>
                                    </div>

                                    <div className="card-image-wrapper">
                                        <span className="card-floating-badge">
                                            <span className={`tag-badge ${status === "HOT DROP" || status === "LOW STOCK" ? "alert" : "outline"}`}>
                                                [{status}]
                                            </span>
                                        </span>
                                        <img src={image} alt={item.name} />
                                    </div>

                                    <div className="card-info-bottom">
                                        <h3 className="card-title">{item.name}</h3>
                                        <div className="card-meta-row">
                                            <span>{gsm}</span>
                                            <span className="card-price">{priceFormatted}</span>
                                        </div>
                                    </div>

                                    <div className="card-action-bar">
                                        <Link to={`/product/${item.id || '1'}`} className="btn-card-add">
                                            [CHI TIẾT VẢI DỆT &bull; XEM SIZE]
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

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
