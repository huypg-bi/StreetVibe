import { useState } from "react";
import ImageLightbox from "./ImageLightbox";
import { formatVnd, formatVnDateTime } from "../utils/pricing";
import "../styles/productDetailView.css";

// Nội dung chỉ đọc của popup chi tiết sản phẩm, dùng chung cho Admin và Supplier
export default function ProductDetailView({ product, variantsMessage = "" }) {
    const [zoomIndex, setZoomIndex] = useState(null);
    const images = product.images?.length ? product.images : [product.image].filter(Boolean);
    const variants = product.variants || [];

    const fields = [
        ["Mã SKU", product.sku],
        ["Thương hiệu / Supplier", product.supplier?.brand_name || product.brand],
        ["Danh mục", product.category?.name],
        ["Môn thể thao", product.sport?.name || "Không phân loại"],
        ["Form dáng (Fit)", product.fit],
        ["Dành cho", product.gender || "Unisex"],
        ["Trạng thái", product.status],
        ["Giá gốc (giá nhập)", product.original_price ? formatVnd(product.original_price) : "Chưa nhập"],
        ["Giá bán", formatVnd(product.price)],
        ["Giảm giá", product.discount_percent
            ? `-${product.discount_percent}% (${product.is_on_sale ? "đang áp dụng" : "ngoài thời gian áp dụng"})`
            : "Không"],
        ["Giá đang bán", formatVnd(product.is_on_sale ? product.sale_price : product.price)],
        ["Thời gian giảm giá", product.discount_percent
            ? `${formatVnDateTime(product.discount_start)} → ${formatVnDateTime(product.discount_end)}`
            : "—"],
        ["Badge", product.is_hot ? "HOT" : "NORMAL"],
        ["Lượng hàng hiện có", product.stock ?? 0],
        ["Đã bán", product.sold_count ?? 0],
    ];

    return (
        <div className="product-detail">
            <dl className="product-detail-grid">
                {fields.map(([label, value]) => (
                    <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value ?? "N/A"}</dd>
                    </div>
                ))}
            </dl>

            <section>
                <h3>Mô tả sản phẩm</h3>
                <p className="product-detail-description">{product.description || "Không có mô tả."}</p>
            </section>

            {images.length > 0 && (
                <section>
                    <h3>Hình ảnh sản phẩm (bấm để phóng to)</h3>
                    <div className="product-detail-thumbs">
                        {images.map((url, index) => (
                            <button
                                type="button"
                                key={`${url}-${index}`}
                                aria-label={`Phóng to ảnh ${index + 1}`}
                                onClick={() => setZoomIndex(index)}
                            >
                                <img src={url} alt={`${product.name} ${index + 1}`} />
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <section>
                <h3>Biến thể ({variants.length})</h3>
                {variantsMessage ? (
                    <p className="product-detail-empty">{variantsMessage}</p>
                ) : variants.length > 0 ? (
                    <table className="product-detail-table">
                        <thead>
                            <tr>
                                <th>Màu sắc</th>
                                <th>Size</th>
                                <th>Tồn kho</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variants.map((variant) => (
                                <tr key={variant.id}>
                                    <td>
                                        {variant.color ? (
                                            <span className="product-detail-color">
                                                <i style={{ backgroundColor: variant.color.hex_code }} />
                                                {variant.color.name}
                                            </span>
                                        ) : "-"}
                                    </td>
                                    <td><strong>{variant.size?.name || "-"}</strong></td>
                                    <td><strong>{variant.stock_quantity}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="product-detail-empty">Sản phẩm này chưa có biến thể.</p>
                )}
            </section>

            {zoomIndex !== null && (
                <ImageLightbox
                    images={images}
                    index={zoomIndex}
                    alt={product.name}
                    onChange={setZoomIndex}
                    onClose={() => setZoomIndex(null)}
                />
            )}
        </div>
    );
}
