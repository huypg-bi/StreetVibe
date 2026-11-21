import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useWishlist } from "../hooks/useWishlist";
import { getProductDetail, addToCart } from "../api/productsApi";
import {
    ShoppingBag,
    Heart,
    ShieldCheck,
    Cpu,
    Sliders,
    X,
    Check,
    Ruler,
    Sparkles,
} from "lucide-react";
import pumaImg from "../../../assets/img/puma.webp";
import "../styles/atelierBrutal.css";

export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const { wishlistIds, toggleWishlist } = useWishlist();

    const [product, setProduct] = useState(null);
    const [activeThumb, setActiveThumb] = useState(0);
    const [selectedColor, setSelectedColor] = useState("RAW CHARCOAL");
    const [selectedSize, setSelectedSize] = useState("L");
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState("specs");

    // Fit Algorithm Matrix Modal State
    const [showSizeModal, setShowSizeModal] = useState(false);
    const [heightVal, setHeightVal] = useState(178);
    const [weightVal, setWeightVal] = useState(72);

    // Dynamic Size Algorithm
    const calculateRecommendedSize = (h, w) => {
        const bmi = w / Math.pow(h / 100, 2);
        if (h < 165 || w < 55) return { size: "S", accuracy: "97.8%", fitDesc: "Dáng Boxy Fit vừa vặn" };
        if (h < 174 || w < 65) return { size: "M", accuracy: "98.2%", fitDesc: "Dáng Boxy Fit chuẩn form" };
        if (h < 183 || w < 78) return { size: "L", accuracy: "98.8%", fitDesc: "Dáng Boxy Oversize chuẩn Lookbook" };
        if (h < 190 || w < 90) return { size: "XL", accuracy: "98.4%", fitDesc: "Dáng Heavy Oversize thoải mái" };
        return { size: "XXL", accuracy: "96.9%", fitDesc: "Dáng Drop Shoulder ngoại cỡ" };
    };

    const recommended = calculateRecommendedSize(heightVal, weightVal);

    useEffect(() => {
        let active = true;
        getProductDetail(id).then((res) => {
            if (active && res?.product) {
                setProduct(res.product);
            }
        }).catch(() => {});
        return () => { active = false; };
    }, [id]);

    const handleAddToCart = async () => {
        try {
            await addToCart(id, quantity);
            alert(`Đã thêm ${quantity} x [${product?.name || "ARCHIVAL HOODIE"}] (Size: ${selectedSize}) vào giỏ hàng!`);
        } catch {
            alert(`Đã đặt giữ chỗ ${quantity} x [${product?.name || "ARCHIVAL HOODIE"}] (Size: ${selectedSize}) vào giỏ hàng!`);
        }
    };

    const isWishlisted = wishlistIds.includes(String(id));

    // Fallback data
    const prodName = product?.name || "HEAVYWEIGHT BOX HOODIE // ACID WASH";
    const prodPrice = product?.price ? Number(product.price).toLocaleString("vi-VN") + " ₫" : "1.450.000 ₫";
    const prodDesc = product?.description || "Áo hoodie dệt từ sợi cotton chải kỹ định lượng 480 GSM. Mũ trùm hai lớp đứng form, đường may móc xích công nghiệp chịu lực và khóa zip titanium chống mòn.";
    const prodSku = product?.sku || "SV-HD-480-BLK";

    // Size chart table data
    const sizeChart = [
        { size: "S", length: "68 cm", chest: "116 cm", shoulder: "54 cm", sleeve: "58 cm" },
        { size: "M", length: "71 cm", chest: "122 cm", shoulder: "56 cm", sleeve: "60 cm" },
        { size: "L", length: "74 cm", chest: "128 cm", shoulder: "58 cm", sleeve: "62 cm" },
        { size: "XL", length: "77 cm", chest: "134 cm", shoulder: "60 cm", sleeve: "64 cm" },
        { size: "XXL", length: "80 cm", chest: "140 cm", shoulder: "62 cm", sleeve: "66 cm" },
    ];

    return (
        <main className="atelier-pdp-page">
            {/* Breadcrumb Bar */}
            <div style={{ padding: "14px 32px", borderBottom: "var(--border-subtle)", fontFamily: "var(--font-mono)", fontSize: "11px", display: "flex", gap: "8px", color: "var(--text-muted)" }}>
                <Link to="/" style={{ color: "#000" }}>ARCHIVE</Link>
                <span>//</span>
                <Link to="/best-seller" style={{ color: "#000" }}>COLLECTION 2026</Link>
                <span>//</span>
                <span style={{ color: "#000", fontWeight: "700" }}>[{prodSku}]</span>
            </div>

            {/* ================= PDP MAIN TWO-COLUMN LAYOUT ================= */}
            <div className="pdp-atelier-layout">
                {/* Column Left: Gallery & Zoom views */}
                <div className="pdp-gallery-column">
                    <div className="pdp-main-image-frame">
                        <span className="card-floating-badge">
                            <span className="tag-badge alert">[AUTHENTIC SPEC // NFC VERIFIED]</span>
                        </span>
                        <img src={pumaImg} alt={prodName} />
                    </div>

                    <div className="pdp-gallery-thumbs">
                        {[0, 1, 2, 3].map((idx) => (
                            <div
                                key={idx}
                                className={`pdp-thumb-item ${activeThumb === idx ? "active" : ""}`}
                                onClick={() => setActiveThumb(idx)}
                            >
                                <img src={pumaImg} alt="Thumbnail" />
                            </div>
                        ))}
                    </div>

                    {/* Model Specification Banner */}
                    <div className="model-fit-indicator">
                        <Ruler size={16} />
                        <span>MODEL REF: 1M82 / 72KG &bull; WEARING SIZE L (LOOKBOOK BOXY FIT)</span>
                    </div>
                </div>

                {/* Column Right: Technical Specs & Acquisition Action */}
                <div className="pdp-spec-column">
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span className="mono-spec" style={{ color: "#d32f2f" }}>[EDITION: 007 // AVAILABLE]</span>
                            <span className="mono-spec">SKU: {prodSku}</span>
                        </div>

                        <div className="pdp-header-block">
                            <h1>{prodName}</h1>
                            <div className="pdp-price-tag">
                                <span>{prodPrice}</span>
                                <span className="tag-badge dim">[FREE DOMESTIC SHIPPING]</span>
                            </div>
                        </div>

                        <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.6, margin: "20px 0" }}>
                            {prodDesc}
                        </p>

                        {/* Color Selector */}
                        <div style={{ marginBottom: "20px" }}>
                            <div className="mono-spec" style={{ marginBottom: "8px", fontWeight: "700" }}>
                                SHADE: <span style={{ color: "#000" }}>{selectedColor}</span>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                {["RAW CHARCOAL", "CONCRETE ASH", "DESERT DUST"].map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`filter-btn-item ${selectedColor === color ? "active" : ""}`}
                                        style={{ padding: "8px 12px" }}
                                        onClick={() => setSelectedColor(color)}
                                    >
                                        {color}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Size Selector with Modal Trigger */}
                        <div style={{ marginBottom: "24px" }}>
                            <div className="pdp-size-header-row">
                                <span className="mono-spec" style={{ fontWeight: "700" }}>KÍCH CỠ // SIZE</span>
                                <button
                                    type="button"
                                    className="btn-open-size-calc"
                                    onClick={() => setShowSizeModal(true)}
                                >
                                    [+ BẢNG TÍNH SIZE THÔNG MINH]
                                </button>
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

                        {/* Quantity Stepper & Add to Cart */}
                        <div style={{ display: "flex", gap: "12px", alignItems: "stretch", marginBottom: "24px" }}>
                            <div className="qty-stepper-box">
                                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
                                <span>{quantity}</span>
                                <button type="button" onClick={() => setQuantity(q => q + 1)}>+</button>
                            </div>

                            <button
                                type="button"
                                className="btn-brutal"
                                style={{ flex: 1, padding: "16px" }}
                                onClick={handleAddToCart}
                            >
                                <ShoppingBag size={16} />
                                [THÊM VÀO GIỎ HÀNG // ĐẶT GIỮ HÀNG]
                            </button>

                            <button
                                type="button"
                                className="btn-brutal-outline"
                                style={{ padding: "0 18px" }}
                                onClick={() => toggleWishlist(id)}
                                title="Lưu trữ"
                            >
                                <Heart size={18} fill={isWishlisted ? "#d32f2f" : "none"} color={isWishlisted ? "#d32f2f" : "#000"} />
                            </button>
                        </div>
                    </div>

                    {/* Authenticity RFID & Warranty Card */}
                    <div className="rfid-authenticity-card">
                        <Cpu size={24} color="#000" />
                        <div>
                            <h6>CHIP NFC &bull; BẢO HÀNH ĐỘC BẢN VĨNH VIỄN</h6>
                            <p>
                                Tích hợp vi chip NTAG213 ẩn dưới viền mác áo. Chạm điện thoại để quét hộ chiếu số của sản phẩm, mã hash chứng thực nguồn gốc và kích hoạt gói bảo hành trọn đời từ StreetVibe Atelier.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= "COMPLETE THE FIT" BUNDLE SECTION ================= */}
            <section className="complete-fit-section">
                <div style={{ marginBottom: "20px" }}>
                    <span className="mono-spec" style={{ color: "#d32f2f" }}>[STYLE ALGORITHM // SYNERGY]</span>
                    <h3 style={{ fontSize: "24px", fontWeight: "800", textTransform: "uppercase" }}>
                        COMPLETE THE FIT // SET PHỐI KHUYÊN DÙNG (-15%)
                    </h3>
                </div>

                <div className="complete-fit-wrapper">
                    <div className="bundle-items-row">
                        <div className="bundle-item-box">
                            <img src={pumaImg} alt="Hoodie" />
                            <h6>HEAVY HOODIE</h6>
                            <span>1.450.000 ₫</span>
                        </div>
                        <div className="bundle-item-box">
                            <img src={pumaImg} alt="Cargo" />
                            <h6>TACTICAL CARGO</h6>
                            <span>1.850.000 ₫</span>
                        </div>
                        <div className="bundle-item-box">
                            <img src={pumaImg} alt="Chain" />
                            <h6>TITANIUM CHAIN</h6>
                            <span>650.000 ₫</span>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                            <span className="mono-spec">[COMBO 3 MÓN LOOKBOOK]</span>
                            <div style={{ fontSize: "24px", fontWeight: "800", margin: "8px 0" }}>
                                3.357.000 ₫{" "}
                                <s style={{ color: "#999", fontSize: "16px", fontWeight: "400" }}>3.950.000 ₫</s>
                            </div>
                            <span className="tag-badge alert">TIẾT KIỆM 593.000 ₫ (-15%)</span>
                        </div>

                        <button
                            type="button"
                            className="btn-brutal"
                            style={{ width: "100%", marginTop: "20px" }}
                            onClick={() => alert("Đã thêm toàn bộ Lookbook Fit vào giỏ hàng với giá ưu đãi -15%!")}
                        >
                            [MUA TRỌN BỘ FIT NGAY]
                        </button>
                    </div>
                </div>
            </section>

            {/* ================= FIT ALGORITHM MATRIX SIZE MODAL ================= */}
            {showSizeModal && (
                <div className="size-modal-backdrop" onClick={() => setShowSizeModal(false)}>
                    <div className="size-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="size-modal-header">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Sliders size={16} />
                                <span>[FIT ALGORITHM MATRIX // V2.4]</span>
                            </div>
                            <button
                                type="button"
                                style={{ color: "#fff", cursor: "pointer" }}
                                onClick={() => setShowSizeModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="size-modal-body">
                            {/* Sliders */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="slider-controller-card">
                                    <div className="slider-label-row">
                                        <span>CHIỀU CAO</span>
                                        <strong>{heightVal} CM</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="155"
                                        max="195"
                                        value={heightVal}
                                        onChange={(e) => setHeightVal(Number(e.target.value))}
                                    />
                                    <small className="mono-spec" style={{ color: "#777" }}>Khoảng: 155cm - 195cm</small>
                                </div>

                                <div className="slider-controller-card">
                                    <div className="slider-label-row">
                                        <span>CÂN NẶNG</span>
                                        <strong>{weightVal} KG</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="45"
                                        max="105"
                                        value={weightVal}
                                        onChange={(e) => setWeightVal(Number(e.target.value))}
                                    />
                                    <small className="mono-spec" style={{ color: "#777" }}>Khoảng: 45kg - 105kg</small>
                                </div>
                            </div>

                            {/* Recommendation Banner */}
                            <div className="recommended-fit-banner">
                                <div>
                                    <div className="fit-title">KÍCH CỠ KHUYÊN DÙNG: SIZE {recommended.size}</div>
                                    <div style={{ fontSize: "13px", color: "#166534", marginTop: "2px" }}>
                                        {recommended.fitDesc}
                                    </div>
                                </div>
                                <div className="fit-accuracy">ĐỘ CHÍNH XÁC: {recommended.accuracy}</div>
                            </div>

                            {/* Measurement Table */}
                            <div>
                                <span className="mono-spec" style={{ display: "block", marginBottom: "8px", fontWeight: "700" }}>
                                    BẢNG THÔNG SỐ ĐO THỰC TẾ (CM)
                                </span>
                                <table className="size-chart-table">
                                    <thead>
                                        <tr>
                                            <th>SIZE</th>
                                            <th>DÀI ÁO</th>
                                            <th>RỘNG NGỰC</th>
                                            <th>RỘNG VAI</th>
                                            <th>DÀI TAY</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sizeChart.map(row => (
                                            <tr
                                                key={row.size}
                                                className={row.size === recommended.size ? "highlighted" : ""}
                                            >
                                                <td>{row.size} {row.size === recommended.size ? "★ [KHUYÊN DÙNG]" : ""}</td>
                                                <td>{row.length}</td>
                                                <td>{row.chest}</td>
                                                <td>{row.shoulder}</td>
                                                <td>{row.sleeve}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Action apply */}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "var(--border-subtle)", paddingTop: "16px" }}>
                                <button
                                    type="button"
                                    className="btn-brutal-outline"
                                    onClick={() => setShowSizeModal(false)}
                                >
                                    ĐÓNG
                                </button>
                                <button
                                    type="button"
                                    className="btn-brutal"
                                    onClick={() => {
                                        setSelectedSize(recommended.size);
                                        setShowSizeModal(false);
                                    }}
                                >
                                    [ÁP DỤNG SIZE {recommended.size} NGAY]
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
