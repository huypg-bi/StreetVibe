import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWishlist } from "../hooks/useWishlist";
import { useAuth } from "../../auth/hooks/useAuth";
import { getProductDetail, addToCart } from "../api/productsApi";
import { getVariantColorOptions, getVariantSizeOptions, isFootwearProduct } from "../utils/categoryHierarchy";
import { findSizeOption, getGarmentType, recommendSize } from "../utils/sizeAdvisor";
import {
    ShoppingBag,
    Heart,
    Cpu,
    Ruler,
} from "lucide-react";
import "../styles/atelierBrutal.css";
import DiscountTag from "../../../shared/components/DiscountTag";
import ProductPrice from "../../../shared/components/ProductPrice";
import SoldOutOverlay from "../../../shared/components/SoldOutOverlay";
import SimilarSportSection from "../components/SimilarSportSection";
import CompleteFitSection from "../components/CompleteFitSection";
import SizeAdvisorModal from "../components/SizeAdvisorModal";
import ProfileSizeHint from "../components/ProfileSizeHint";
import { getErrorMessage, toast } from "../../../shared/utils/toast";

// Từ mức này trở xuống được xem là sắp hết hàng
const LOW_STOCK_LIMIT = 5;

export default function ProductDetailPage() {
    const { id } = useParams();
    const { wishlistIds, toggleWishlist } = useWishlist();
    const { user } = useAuth();

    const [productState, setProductState] = useState({ id: null, product: null });
    const [activeThumb, setActiveThumb] = useState({ productId: null, index: 0 });
    const [selectedColorId, setSelectedColorId] = useState("");
    // Lưu kèm sản phẩm để size chọn ở sản phẩm trước không đè lên gợi ý của sản phẩm sau
    const [sizeChoice, setSizeChoice] = useState({ productId: null, size: "" });
    const [quantity, setQuantity] = useState(1);
    const [expandedDescriptionForId, setExpandedDescriptionForId] = useState(null);
    const [descriptionCanExpand, setDescriptionCanExpand] = useState(false);
    const descriptionRef = useRef(null);
    const product = productState.id === id ? productState.product : null;
    const loading = productState.id !== id;
    const descriptionExpanded = expandedDescriptionForId === id;
    const productImages = product
        ? Array.from(new Set([
            product.image,
            ...(Array.isArray(product.images) ? product.images : []),
        ].filter(Boolean)))
        : [];
    const activeThumbIndex = activeThumb.productId === id ? activeThumb.index : 0;
    const activeImage = productImages[activeThumbIndex] || productImages[0];

    const [showSizeModal, setShowSizeModal] = useState(false);
    const selectedSize = sizeChoice.productId === id ? sizeChoice.size : "";
    const setSelectedSize = (size) => setSizeChoice({ productId: id, size });

    // Bấm vào thẻ gợi ý ở cuối trang thì sản phẩm mới phải hiện từ đầu trang
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    useEffect(() => {
        let active = true;
        const loadProduct = async () => {
            try {
                const res = await getProductDetail(id);
                if (!active) return;
                setProductState({ id, product: res?.product || null });
                if (!res?.product) toast.error("Không tìm thấy sản phẩm này.");
            } catch (error) {
                console.error("Lỗi khi tải chi tiết sản phẩm:", error);
                if (active) {
                    setProductState({ id, product: null });
                    toast.error("Không thể tải sản phẩm. Vui lòng thử lại.");
                }
            }
        };
        loadProduct();
        return () => { active = false; };
    }, [id]);

    // Chỉ bán màu và size Admin/Supplier đã đăng ký; lựa chọn hết hàng không bấm được
    const variants = product?.variants ?? [];
    const colorOptions = getVariantColorOptions(variants);
    const activeColor = colorOptions.find((option) => option.id === selectedColorId && option.stock > 0)
        ?? colorOptions.find((option) => option.stock > 0)
        ?? colorOptions[0];
    const colorVariants = variants.filter((variant) => variant.color_id === activeColor?.id);
    const sizeOptions = getVariantSizeOptions(colorVariants);
    // Size quần áo gợi ý theo hồ sơ (null với giày, phụ kiện hoặc khi thiếu số đo)
    const garment = getGarmentType(product, sizeOptions);
    const profileFit = garment
        ? recommendSize({ gender: user?.gender, garment, heightCm: user?.height_cm, weightKg: user?.weight_kg })
        : null;
    const profileOption = findSizeOption(sizeOptions, profileFit?.size, { gender: user?.gender, garment });
    // Ưu tiên: size người dùng bấm chọn, rồi size gợi ý còn hàng, rồi size còn hàng đầu tiên
    const activeSize = sizeOptions.find((option) => option.name === selectedSize && option.stock > 0)
        ?? (profileOption?.stock > 0 ? profileOption : undefined)
        ?? sizeOptions.find((option) => option.stock > 0);
    const activeVariant = colorVariants.find((variant) => variant.size?.name === activeSize?.name);
    const availableStock = colorOptions.reduce((sum, option) => sum + option.stock, 0);
    const maxQuantity = Number(activeVariant?.stock_quantity || 0);
    const orderQuantity = Math.max(1, Math.min(quantity, maxQuantity));
    const canBuy = Boolean(product) && maxQuantity > 0;
    const isSoldOut = Boolean(product) && availableStock <= 0;
    const allSizes = getVariantSizeOptions(variants);
    const isFootwearSizing = allSizes.length > 0
        ? allSizes.every((option) => option.isFootwear)
        : isFootwearProduct(product);

    const handleAddToCart = async () => {
        try {
            await addToCart(id, activeVariant.id, orderQuantity);
            toast.success(`Đã thêm ${orderQuantity} sản phẩm (${activeColor.name} / ${activeSize.name}) vào giỏ hàng.`);
        } catch (error) {
            console.error("Lỗi khi thêm sản phẩm vào giỏ hàng:", error);
            toast.error(getErrorMessage(error, "Không thể thêm sản phẩm vào giỏ hàng."));
        }
    };

    const isWishlisted = wishlistIds.includes(String(id));

    const prodName = product?.name || "";
    const prodDesc = product?.description || "";
    const prodSku = product?.sku || "—";
    const stockStatus = availableStock <= 0
        ? { label: "[SOLD OUT // HẾT HÀNG]", tone: "out" }
        : availableStock <= LOW_STOCK_LIMIT
            ? { label: `[LOW STOCK // CHỈ CÒN ${availableStock} SẢN PHẨM]`, tone: "low" }
            : { label: `[IN STOCK // CÒN ${availableStock} SẢN PHẨM]`, tone: "in" };
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const description = descriptionRef.current;
            setDescriptionCanExpand(Boolean(description && description.scrollHeight > description.clientHeight + 1));
        });
        return () => cancelAnimationFrame(frame);
    }, [prodDesc]);

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
                        {activeImage
                            ? <img src={activeImage} alt={prodName} />
                            : <span>{loading ? "[ĐANG TẢI SẢN PHẨM]" : "[CHƯA CÓ ẢNH SẢN PHẨM]"}</span>}
                        {isSoldOut && <SoldOutOverlay />}
                    </div>

                    <div className="pdp-gallery-thumbs">
                        {productImages.map((image, idx) => (
                            <button
                                type="button"
                                key={`${image}-${idx}`}
                                className={`pdp-thumb-item ${activeThumbIndex === idx ? "active" : ""}`}
                                onClick={() => setActiveThumb({ productId: id, index: idx })}
                            >
                                <img src={image} alt={`${prodName} thumbnail ${idx + 1}`} />
                            </button>
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
                            <span className={`mono-spec pdp-stock-status ${stockStatus.tone}`}>
                                {product ? stockStatus.label : ""}
                            </span>
                            <span className="mono-spec">SKU: {prodSku}</span>
                        </div>

                        <div className="pdp-header-block">
                            <h1>{prodName}</h1>
                            <div className="pdp-price-tag">
                                {product && <ProductPrice product={product} />}
                                <DiscountTag product={product} />
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
                            {colorOptions.length > 0 && (
                                <div className="pdp-color-swatches">
                                    {colorOptions.map((color) => (
                                        <button
                                            type="button"
                                            key={color.id}
                                            className={`pdp-color-swatch${activeColor?.id === color.id ? " active" : ""}`}
                                            style={{ backgroundColor: color.hex }}
                                            title={color.stock > 0 ? color.name : `${color.name} (hết hàng)`}
                                            aria-label={color.name}
                                            aria-pressed={activeColor?.id === color.id}
                                            disabled={color.stock <= 0}
                                            onClick={() => {
                                                setSelectedColorId(color.id);
                                                setQuantity(1);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Size Selector with Modal Trigger */}
                        <div style={{ marginBottom: "8px" }}>
                            <div className="pdp-size-header-row">
                                <span className="mono-spec" style={{ fontWeight: "700" }}>
                                    {isFootwearSizing ? "SIZE CHÂN // FOOTWEAR" : "KÍCH CỠ // SIZE"}
                                </span>
                                {garment && (
                                    <button
                                        type="button"
                                        className="btn-open-size-calc"
                                        onClick={() => setShowSizeModal(true)}
                                    >
                                        [+ BẢNG TÍNH SIZE THÔNG MINH]
                                    </button>
                                )}
                            </div>

                            {sizeOptions.length > 0 ? (
                                <div
                                    className="size-boxes-grid"
                                    style={isFootwearSizing ? { gridTemplateColumns: "repeat(5, 1fr)" } : undefined}
                                >
                                    {sizeOptions.map((option) => (
                                        <button
                                            key={option.name}
                                            type="button"
                                            className={`size-box-btn ${activeSize?.name === option.name ? "active" : ""}`}
                                            disabled={option.stock <= 0}
                                            title={option.stock > 0 ? `Còn ${option.stock} sản phẩm` : "Hết hàng"}
                                            onClick={() => setSelectedSize(option.name)}
                                        >
                                            {option.name}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                product && <p className="pdp-no-size">Sản phẩm chưa có màu và size để bán.</p>
                            )}

                            {garment && (
                                <ProfileSizeHint
                                    user={user}
                                    result={profileFit}
                                    option={profileOption}
                                    selectedName={activeSize?.name}
                                />
                            )}
                        </div>

                        {/* Quantity Stepper & Add to Cart */}
                        <div style={{ display: "flex", gap: "12px", alignItems: "stretch", marginBottom: "8px" }}>
                            <div className="qty-stepper-box">
                                <button type="button" onClick={() => setQuantity(Math.max(1, orderQuantity - 1))} disabled={orderQuantity <= 1}>-</button>
                                <span>{orderQuantity}</span>
                                <button type="button" onClick={() => setQuantity(orderQuantity + 1)} disabled={orderQuantity >= maxQuantity}>+</button>
                            </div>

                            <button
                                type="button"
                                className="btn-brutal"
                                style={{ flex: 1, padding: "16px" }}
                                onClick={handleAddToCart}
                                disabled={!canBuy || loading}
                            >
                                <ShoppingBag size={16} />
                                {product && !canBuy ? "[HẾT HÀNG]" : "[THÊM VÀO GIỎ HÀNG]"}
                            </button>

                            <button
                                type="button"
                                className="btn-brutal-outline"
                                style={{ padding: "0 18px" }}
                                onClick={() => toggleWishlist(id)}
                                title="Lưu trữ"
                            >
                                <Heart size={18} fill={isWishlisted ? "#d32f2f" : "none"} color={isWishlisted ? "#d32f2f" : "currentColor"} />
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

            {/* ================= "COMPLETE THE FIT" // AI GHÉP OUTFIT ================= */}
            <CompleteFitSection
                key={id}
                product={product}
                anchorColorId={activeColor?.id}
                anchorShoeSize={isFootwearSizing ? activeSize?.name : ""}
            />

            {/* ================= SẢN PHẨM TƯƠNG TỰ THEO MÔN THỂ THAO ================= */}
            <SimilarSportSection product={product} />

            {/* ================= BẢNG TÍNH SIZE THÔNG MINH ================= */}
            {showSizeModal && garment && (
                <SizeAdvisorModal
                    user={user}
                    productGarment={garment}
                    sizeOptions={sizeOptions}
                    onApply={(size) => {
                        setSelectedSize(size);
                        setShowSizeModal(false);
                    }}
                    onClose={() => setShowSizeModal(false)}
                />
            )}
        </main>
    );
}
