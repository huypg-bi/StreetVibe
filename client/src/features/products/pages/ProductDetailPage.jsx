import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWishlist } from "../hooks/useWishlist";
import { getProductDetail, addToCart } from "../api/productsApi";
import {
    ShoppingBag,
    Heart,
    Cpu,
    Sliders,
    X,
    Ruler,
} from "lucide-react";
import pumaImg from "../../../assets/img/puma.webp";
import "../styles/atelierBrutal.css";

export default function ProductDetailPage() {
    const { id } = useParams();
    const { wishlistIds, toggleWishlist } = useWishlist();

    const [productState, setProductState] = useState({ id: null, product: null, error: "" });
    const [cartMessage, setCartMessage] = useState("");
    const [activeThumb, setActiveThumb] = useState(0);
    const [selectedSize, setSelectedSize] = useState("L");
    const [quantity, setQuantity] = useState(1);
    const [expandedDescriptionForId, setExpandedDescriptionForId] = useState(null);
    const [descriptionCanExpand, setDescriptionCanExpand] = useState(false);
    const descriptionRef = useRef(null);
    const product = productState.id === id ? productState.product : null;
    const productError = productState.id === id ? productState.error : "";
    const loading = productState.id !== id;
    const descriptionExpanded = expandedDescriptionForId === id;

    // Fit Algorithm Matrix Modal State
    const [showSizeModal, setShowSizeModal] = useState(false);
    const [heightVal, setHeightVal] = useState(178);
    const [weightVal, setWeightVal] = useState(72);

    // Dynamic Size Algorithm
    const calculateRecommendedSize = (h, w) => {
        if (h < 165 || w < 55) return { size: "S", accuracy: "97.8%", fitDesc: "Dáng Boxy Fit vừa vặn" };
        if (h < 174 || w < 65) return { size: "M", accuracy: "98.2%", fitDesc: "Dáng Boxy Fit chuẩn form" };
        if (h < 183 || w < 78) return { size: "L", accuracy: "98.8%", fitDesc: "Dáng Boxy Oversize chuẩn Lookbook" };
        if (h < 190 || w < 90) return { size: "XL", accuracy: "98.4%", fitDesc: "Dáng Heavy Oversize thoải mái" };
        return { size: "XXL", accuracy: "96.9%", fitDesc: "Dáng Drop Shoulder ngoại cỡ" };
    };

    const recommended = calculateRecommendedSize(heightVal, weightVal);

    useEffect(() => {
        let active = true;
        const loadProduct = async () => {
            try {
                const res = await getProductDetail(id);
                if (!active) return;
                setProductState({
                    id,
                    product: res?.product || null,
                    error: res?.product ? "" : "Không tìm thấy sản phẩm này.",
                });
            } catch (error) {
                console.error("Lỗi khi tải chi tiết sản phẩm:", error);
                if (active) {
                    setProductState({
                        id,
                        product: null,
                        error: "Không thể tải sản phẩm. Vui lòng thử lại.",
                    });
                }
            }
        };
        loadProduct();
        return () => { active = false; };
    }, [id]);

    const handleAddToCart = async () => {
        setCartMessage("");
        try {
            await addToCart(id, quantity, product);
            setCartMessage(`Đã thêm ${quantity} sản phẩm vào giỏ hàng.`);
        } catch (error) {
            console.error("Lỗi khi thêm sản phẩm vào giỏ hàng:", error);
            setCartMessage(error.response?.data?.message || "Không thể thêm sản phẩm vào giỏ hàng.");
        }
    };

    const isWishlisted = wishlistIds.includes(String(id));

    const prodName = product?.name || "";
    const prodPrice = product ? `${Number(product.price).toLocaleString("vi-VN")} ₫` : "";
    const prodDesc = product?.description || "";
    const prodIdentifier = String(product?.id ?? product?._id ?? "");
    const skuSuffix = prodIdentifier.replace(/-/g, "").slice(-8);
    const skuNumber = Number.parseInt(skuSuffix, 16);
    const prodSku = product?.sku || `${(product?.brand || product?.brand_name || "STREETVIBE").trim().toUpperCase()} - ${String(Number.isFinite(skuNumber) ? skuNumber % 1000000 : 1).padStart(6, "0")}`;
    const productColors = Array.from(new Map(
        [
            ...(product?.colors || []),
            ...(product?.variants || []).map((variant) => variant.color),
        ]
            .filter((color) => color?.hex_code)
            .map((color) => [color.id ?? color.name, color])
    ).values());

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const description = descriptionRef.current;
            setDescriptionCanExpand(Boolean(description && description.scrollHeight > description.clientHeight + 1));
        });
        return () => cancelAnimationFrame(frame);
    }, [prodDesc]);

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
                        {product?.image
                            ? <img src={product.image} alt={prodName} />
                            : <span>{loading ? "[ĐANG TẢI SẢN PHẨM]" : "[CHƯA CÓ ẢNH SẢN PHẨM]"}</span>}
                    </div>
                    {productError && <p className="pdp-load-error" role="alert">{productError}</p>}

                    <div className="pdp-gallery-thumbs">
                        {product?.image && [0].map((idx) => (
                            <div
                                key={idx}
                                className={`pdp-thumb-item ${activeThumb === idx ? "active" : ""}`}
                                onClick={() => setActiveThumb(idx)}
                            >
                                <img src={product.image} alt={`${prodName} thumbnail`} />
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
                    <div className="pdp-product-info">
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

                        <div className={`pdp-description${descriptionExpanded ? " expanded" : ""}`}>
                            <p ref={descriptionRef}>{prodDesc}</p>
                            {!descriptionExpanded && descriptionCanExpand && (
                                <button
                                    type="button"
                                    className="pdp-description-more"
                                    onClick={() => setExpandedDescriptionForId(id)}
                                >
                                    Xem thêm
                                </button>
                            )}
                            {descriptionExpanded && (
                                <button
                                    type="button"
                                    className="pdp-description-more"
                                    onClick={() => setExpandedDescriptionForId(null)}
                                >
                                    Thu gọn
                                </button>
                            )}
                        </div>

                        {/* Color Selector */}
                        <div className="pdp-shade-row">
                            <span className="mono-spec">SHADE:</span>
                            {productColors.length > 0 ? (
                                <div className="pdp-color-swatches">
                                    {productColors.map((color) => (
                                        <span
                                            key={color.id ?? color.name}
                                            className="pdp-color-swatch"
                                            style={{ backgroundColor: color.hex_code }}
                                            title={color.name}
                                            role="img"
                                            aria-label={color.name}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <span className="mono-spec pdp-no-color">NONE</span>
                            )}
                        </div>

                        {/* Size Selector with Modal Trigger */}
                        <div style={{ marginBottom: "8px" }}>
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
                        <div style={{ display: "flex", gap: "12px", alignItems: "stretch", marginBottom: "8px" }}>
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
                                disabled={!product || loading}
                            >
                                <ShoppingBag size={16} />
                                [THÊM VÀO GIỎ HÀNG]
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
                        {cartMessage && <p className="pdp-cart-message" role="status">{cartMessage}</p>}
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
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "var(--border-subtle)", paddingTop: "10px" }}>
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
