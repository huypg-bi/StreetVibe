import { formatVnd, getDiscountedPrice } from "../utils/pricing";
import { cellKey } from "../utils/productOptions";
import "../styles/variantEditor.css";

const toggleId = (list, id, checked) => (checked ? [...list, id] : list.filter((item) => item !== id));

// Cột phải của form sản phẩm: chọn màu, size, số lượng từng ô và chương trình giảm giá
export default function VariantEditor({ options, hasCategory, fit, price, cost }) {
    const { draft, setDraft, colors, sizes, isFootwear, totalStock, removedCount } = options;
    const selectedColors = colors.filter((color) => draft.colorIds.includes(color.id));
    const selectedSizes = sizes.filter((size) => draft.sizeIds.includes(size.id));
    const showSizes = hasCategory || draft.sizeIds.length > 0;

    const percent = Number(draft.discount.percent) || 0;
    const discounted = getDiscountedPrice(price, percent);
    const belowCost = percent > 0 && Number(price) > 0 && Number(cost) > discounted;

    const toggle = (field, id, checked) =>
        setDraft((current) => ({ ...current, [field]: toggleId(current[field], id, checked) }));
    const setCell = (key, value) =>
        setDraft((current) => ({ ...current, cells: { ...current.cells, [key]: value } }));
    const setDiscount = (field, value) =>
        setDraft((current) => ({ ...current, discount: { ...current.discount, [field]: value } }));

    return (
        <section className="variant-editor" aria-label="Màu sắc và kích cỡ">
            <h3>Màu sắc &amp; Kích cỡ</h3>
            <p className="variant-editor-hint">
                Chọn màu và kích cỡ đang bán, rồi nhập số lượng vào bảng. Ô để trống nghĩa là không bán.
            </p>

            <strong>MÀU SẮC</strong>
            <div className="variant-editor-options">
                {colors.map((color) => (
                    <label key={color.id} className="variant-editor-chip">
                        <input
                            type="checkbox"
                            checked={draft.colorIds.includes(color.id)}
                            onChange={(event) => toggle("colorIds", color.id, event.target.checked)}
                        />
                        <span className="variant-editor-swatch" style={{ backgroundColor: color.hex_code }} />
                        {color.name}
                    </label>
                ))}
            </div>

            <strong>{isFootwear ? "SIZE GIÀY" : "KÍCH CỠ"}</strong>
            {showSizes ? (
                <div className="variant-editor-options">
                    {sizes.map((size) => (
                        <label key={size.id} className="variant-editor-chip">
                            <input
                                type="checkbox"
                                checked={draft.sizeIds.includes(size.id)}
                                onChange={(event) => toggle("sizeIds", size.id, event.target.checked)}
                            />
                            {size.name}
                        </label>
                    ))}
                </div>
            ) : (
                <p className="variant-editor-hint">Chọn danh mục ở bên trái để hiện kích cỡ.</p>
            )}
            {hasCategory && !isFootwear && fit === "OVERSIZED" && (
                <p className="variant-editor-note">
                    [OVERSIZE] Sản phẩm dáng rộng, nên đăng ký các size từ L đến 4XL.
                </p>
            )}

            {selectedColors.length > 0 && selectedSizes.length > 0 && (
                <div className="variant-editor-table-wrap">
                    <table className="variant-editor-table">
                        <thead>
                            <tr>
                                <th>Màu \ Size</th>
                                {selectedSizes.map((size) => <th key={size.id}>{size.name}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {selectedColors.map((color) => (
                                <tr key={color.id}>
                                    <th scope="row">{color.name}</th>
                                    {selectedSizes.map((size) => {
                                        const key = cellKey(color.id, size.id);
                                        return (
                                            <td key={size.id}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    placeholder="–"
                                                    aria-label={`Số lượng ${color.name} ${size.name}`}
                                                    value={draft.cells[key] ?? ""}
                                                    onChange={(event) => setCell(key, event.target.value)}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="variant-editor-total">TỔNG SỐ LƯỢNG: <b>{totalStock}</b></p>
            {removedCount > 0 && (
                <p className="variant-editor-warning" role="status">
                    Khi lưu sẽ xóa {removedCount} lựa chọn màu / size đã bỏ.
                </p>
            )}

            <h3 className="variant-editor-divider">Giảm giá</h3>
            <div className="variant-editor-discount">
                <label>
                    GIẢM GIÁ (%)
                    <input type="number" min="0" max="99" step="1" value={draft.discount.percent} onChange={(event) => setDiscount("percent", event.target.value)} />
                </label>
                <label>
                    BẮT ĐẦU (GIỜ VN)
                    <input type="datetime-local" value={draft.discount.start} onChange={(event) => setDiscount("start", event.target.value)} />
                </label>
                <label>
                    KẾT THÚC (GIỜ VN)
                    <input type="datetime-local" value={draft.discount.end} onChange={(event) => setDiscount("end", event.target.value)} />
                </label>
            </div>
            {percent > 0 && Number(price) > 0 && (
                <p className="variant-editor-total">GIÁ SAU GIẢM: <b className="variant-editor-sale">{formatVnd(discounted)}</b></p>
            )}
            {belowCost && <p className="variant-editor-warning">Lưu ý: giá sau giảm đang thấp hơn giá gốc.</p>}
            <p className="variant-editor-hint">Nhập 0% để không giảm giá. Hết thời gian, giá tự trở về giá bán.</p>
        </section>
    );
}
