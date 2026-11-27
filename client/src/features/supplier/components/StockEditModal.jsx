import { useState } from "react";
import SupplierModal from "./SupplierModal";
import { updateSupplierProductStock, updateSupplierVariantStock } from "../../../shared/api/marketplaceApi";
import { getErrorMessage, toast } from "../../../shared/utils/toast";

export default function StockEditModal({ product, onClose, onReload, onSaved }) {
    const variants = product.variants || [];
    const hasVariants = variants.length > 0;
    const [stock, setStock] = useState(String(product.stock ?? 0));
    const [variantStocks, setVariantStocks] = useState(() =>
        Object.fromEntries(variants.map((variant) => [variant.id, String(variant.stock_quantity)]))
    );
    const [saving, setSaving] = useState(false);

    const changedVariants = variants.filter(
        (variant) => Number(variantStocks[variant.id]) !== variant.stock_quantity
    );
    const hasChanges = hasVariants ? changedVariants.length > 0 : Number(stock) !== product.stock;
    // Server tính tồn kho sản phẩm bằng tổng tồn của các biến thể
    const variantTotal = variants.reduce((sum, variant) => sum + (Number(variantStocks[variant.id]) || 0), 0);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            if (hasVariants) {
                // Lưu lần lượt để server cộng tổng tồn kho đúng thứ tự
                for (const variant of changedVariants) {
                    await updateSupplierVariantStock(variant.id, variantStocks[variant.id]);
                }
            } else {
                await updateSupplierProductStock(product.id, stock);
            }
            await onReload();
            onSaved(product);
        } catch (err) {
            console.error("Không thể cập nhật tồn kho:", err);
            toast.error(getErrorMessage(err, "Không thể cập nhật tồn kho. Vui lòng thử lại."));
            onReload().catch(() => {});
        } finally {
            setSaving(false);
        }
    };

    return (
        <SupplierModal title={product.name} eyebrow="[ STOCK // CHỈNH SỬA ]" onClose={onClose}>
            <form className="supplier-modal-form" onSubmit={handleSubmit}>
                <div className="supplier-stock-summary">
                    {product.image && <img src={product.image} alt="" />}
                    <dl>
                        <div><dt>MÃ SKU</dt><dd>{product.sku}</dd></div>
                        <div><dt>DANH MỤC</dt><dd>{product.category?.name || "—"}</dd></div>
                        <div><dt>ĐÃ BÁN</dt><dd>{product.sold_count ?? 0}</dd></div>
                        <div><dt>LƯỢNG HÀNG HIỆN CÓ</dt><dd>{product.stock ?? 0}</dd></div>
                    </dl>
                </div>

                {hasVariants ? (
                    <>
                        <div className="supplier-variant-table-wrap">
                            <table className="supplier-variant-table">
                                <thead><tr><th>Màu</th><th>Size</th><th>Tồn kho</th></tr></thead>
                                <tbody>
                                    {variants.map((variant) => (
                                        <tr key={variant.id}>
                                            <td>{variant.color?.name || "-"}</td>
                                            <td><strong>{variant.size?.name || "-"}</strong></td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    required
                                                    aria-label={`Tồn kho ${variant.color?.name || ""} ${variant.size?.name || ""}`}
                                                    value={variantStocks[variant.id]}
                                                    onChange={(event) => setVariantStocks((previous) => ({ ...previous, [variant.id]: event.target.value }))}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="supplier-stock-total">
                            Tổng theo biến thể sau khi lưu: <strong>{variantTotal}</strong>
                        </p>
                    </>
                ) : (
                    <label>
                        LƯỢNG HÀNG MỚI
                        <input
                            type="number"
                            min="0"
                            step="1"
                            required
                            value={stock}
                            onChange={(event) => setStock(event.target.value)}
                        />
                        <small>Sản phẩm này chưa có biến thể.</small>
                    </label>
                )}

                <div className="supplier-modal-actions">
                    <button type="button" className="supplier-secondary-button" onClick={onClose}>ĐÓNG</button>
                    <button type="submit" className="supplier-primary-button" disabled={saving || !hasChanges}>
                        {saving ? "ĐANG LƯU..." : "LƯU TỒN KHO"}
                    </button>
                </div>
            </form>
        </SupplierModal>
    );
}
