import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { getBrands } from "../api/productsApi";
import { getOutfitQuota, suggestOutfit } from "../api/outfitApi";
import { getAttributes } from "../../../shared/api/marketplaceApi";
import { filterSizesByFootwear, sortSizeNames } from "../utils/categoryHierarchy";
import { SIZE_GENDERS, recommendSize } from "../utils/sizeAdvisor";
import { getErrorMessage, toast } from "../../../shared/utils/toast";

const PRICE_MODES = [
    { value: "best", label: "Giá tốt nhất", hint: "Bộ có tổng tiền thấp nhất" },
    { value: "sale", label: "Đang giảm giá", hint: "Ưu tiên nhiều món đang giảm" },
    { value: "budget", label: "Dưới ngân sách", hint: "Không vượt số tiền bạn nhập" },
];
const SHOE_SIZE_KEY = "streetvibe:shoe-size";

// Giá trị ban đầu: lần ghép trước, nếu chưa có thì lấy từ hồ sơ và sản phẩm đang xem
function initialForm(user, lastForm, anchorShoeSize) {
    if (lastForm) return lastForm;
    return {
        gender: "",
        height: user?.height_cm ? String(user.height_cm) : "",
        weight: user?.weight_kg ? String(user.weight_kg) : "",
        topSize: null, // null = theo gợi ý từ số đo
        bottomSize: null,
        shoeSize: anchorShoeSize || localStorage.getItem(SHOE_SIZE_KEY) || "",
        brands: [],
        priceMode: "best",
        budget: "",
        sportId: "",
        includeSocks: false,
        includeAccessory: false,
    };
}

export default function OutfitModal({ product, user, anchorColorId, anchorShoeSize, lastForm, onResult, onClose }) {
    const [form, setForm] = useState(() => initialForm(user, lastForm, anchorShoeSize));
    const [options, setOptions] = useState({ brands: [], sports: [], sizes: [], loading: true });
    const [feedback, setFeedback] = useState(null); // kết quả chưa ghép được
    const [submitting, setSubmitting] = useState(false);
    const [quota, setQuota] = useState(null); // lượt còn lại của máy này
    const outOfTurns = quota?.remaining === 0;

    useEffect(() => {
        let active = true;
        getOutfitQuota()
            .then((data) => { if (active) setQuota(data); })
            // Không đọc được thì vẫn cho bấm, server sẽ kiểm tra lại
            .catch((error) => console.error("Không thể đọc lượt ghép outfit:", error));
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        Promise.all([getBrands(), getAttributes()])
            .then(([brands, attributes]) => {
                if (!active) return;
                setOptions({ brands, sports: attributes?.sports || [], sizes: attributes?.sizes || [], loading: false });
            })
            .catch((error) => {
                console.error("Không thể tải lựa chọn ghép outfit:", error);
                if (!active) return;
                setOptions((current) => ({ ...current, loading: false }));
                toast.error("Không thể tải lựa chọn ghép outfit. Vui lòng thử lại.");
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    // Giới tính lấy từ hồ sơ; chỉ khi hồ sơ chưa chọn Nam/Nữ mới chọn tại đây
    const profileGender = SIZE_GENDERS.includes(user?.gender) ? user.gender : "";
    const gender = profileGender || form.gender;
    const suggested = (garment) =>
        recommendSize({ gender, garment, heightCm: form.height, weightKg: form.weight })?.size || "";
    const topSize = form.topSize ?? suggested("top");
    const bottomSize = form.bottomSize ?? suggested("bottom");

    const footwear = new Set(filterSizesByFootwear(options.sizes, true).map((size) => size.name));
    const shoeSizes = sortSizeNames([...footwear]);
    const apparelSizes = sortSizeNames(options.sizes.filter((size) => !footwear.has(size.name)).map((size) => size.name));

    const update = (changes) => {
        setForm((current) => ({ ...current, ...changes }));
        setFeedback(null);
    };
    const toggleBrand = (brand, checked) =>
        update({ brands: checked ? [...form.brands, brand] : form.brands.filter((item) => item !== brand) });

    const submit = async (allowOtherBrands) => {
        if (!gender || !topSize || !bottomSize || !form.shoeSize) {
            toast.error("Vui lòng chọn đủ giới tính, size áo, size quần và size giày.");
            return;
        }
        if (form.priceMode === "budget" && !(Number(form.budget) > 0)) {
            toast.error("Vui lòng nhập ngân sách.");
            return;
        }
        setSubmitting(true);
        setFeedback(null);
        try {
            const result = await suggestOutfit({
                product_id: product.id,
                anchor_color_id: anchorColorId || "",
                brands: form.brands,
                allow_other_brands: allowOtherBrands,
                price_mode: form.priceMode,
                budget: form.priceMode === "budget" ? Number(form.budget) : 0,
                sport_id: form.sportId,
                gender,
                top_size: topSize,
                bottom_size: bottomSize,
                shoe_size: form.shoeSize,
                include_socks: form.includeSocks,
                include_accessory: form.includeAccessory,
            });
            localStorage.setItem(SHOE_SIZE_KEY, form.shoeSize);
            if (result?.quota) setQuota(result.quota);
            if (result?.status === "ok") onResult(result, form);
            else setFeedback(result);
        } catch (error) {
            console.error("Không thể ghép outfit:", error);
            if (error.response?.data?.error?.code === "OUTFIT_LIMIT") {
                setQuota((current) => ({ ...current, remaining: 0 }));
            }
            toast.error(getErrorMessage(error, "Không thể ghép outfit. Vui lòng thử lại."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="outfit-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <form
                className="outfit-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="outfit-modal-title"
                onSubmit={(event) => {
                    event.preventDefault();
                    submit(false);
                }}
            >
                <header className="outfit-modal-header">
                    <div>
                        <span>[AI STYLIST // COMPLETE THE FIT]</span>
                        <h2 id="outfit-modal-title">Ghép outfit cùng {product.name}</h2>
                    </div>
                    <button type="button" aria-label="Đóng" onClick={onClose}><X size={18} /></button>
                </header>

                <fieldset>
                    <legend>01 // SỐ ĐO CỦA BẠN</legend>
                    <div className="outfit-grid">
                        <label>
                            GIỚI TÍNH
                            <select value={gender} disabled={Boolean(profileGender)} onChange={(event) => update({ gender: event.target.value, topSize: null, bottomSize: null })}>
                                <option value="">Chọn giới tính</option>
                                {SIZE_GENDERS.map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                            {profileGender && <small>Theo hồ sơ. <Link to="/profile">Đổi</Link></small>}
                        </label>
                        <label>
                            CHIỀU CAO (CM)
                            <input type="number" min="50" max="250" value={form.height} onChange={(event) => update({ height: event.target.value, topSize: null, bottomSize: null })} />
                        </label>
                        <label>
                            CÂN NẶNG (KG)
                            <input type="number" min="20" max="300" step="0.1" value={form.weight} onChange={(event) => update({ weight: event.target.value, topSize: null, bottomSize: null })} />
                        </label>
                        <label>
                            SIZE ÁO
                            <select value={topSize} onChange={(event) => update({ topSize: event.target.value })}>
                                <option value="">Chọn size</option>
                                {apparelSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                            </select>
                        </label>
                        <label>
                            SIZE QUẦN
                            <select value={bottomSize} onChange={(event) => update({ bottomSize: event.target.value })}>
                                <option value="">Chọn size</option>
                                {apparelSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                            </select>
                        </label>
                        <label>
                            SIZE GIÀY
                            <select value={form.shoeSize} onChange={(event) => update({ shoeSize: event.target.value })}>
                                <option value="">Chọn size</option>
                                {shoeSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                            </select>
                        </label>
                    </div>
                    <p className="outfit-hint">Size áo, quần được gợi ý từ giới tính và số đo, bạn có thể chọn lại.</p>
                </fieldset>

                <fieldset>
                    <legend>02 // NHÃN HÀNG</legend>
                    <div className="outfit-chips">
                        {options.brands.map((brand) => (
                            <label key={brand} className="outfit-chip">
                                <input type="checkbox" checked={form.brands.includes(brand)} onChange={(event) => toggleBrand(brand, event.target.checked)} />
                                {brand}
                            </label>
                        ))}
                    </div>
                    <p className="outfit-hint">Không chọn nhãn nào nghĩa là lấy tất cả nhãn.</p>
                </fieldset>

                <fieldset>
                    <legend>03 // KIỂU GIÁ</legend>
                    <div className="outfit-modes">
                        {PRICE_MODES.map((mode) => (
                            <label key={mode.value} className="outfit-mode">
                                <input type="radio" name="price-mode" checked={form.priceMode === mode.value} onChange={() => update({ priceMode: mode.value })} />
                                <strong>{mode.label}</strong>
                                <small>{mode.hint}</small>
                            </label>
                        ))}
                    </div>
                    {form.priceMode === "budget" && (
                        <label>
                            NGÂN SÁCH CHO CẢ BỘ (₫)
                            <input type="number" min="1" step="1000" placeholder="Ví dụ: 4000000" value={form.budget} onChange={(event) => update({ budget: event.target.value })} />
                        </label>
                    )}
                </fieldset>

                <fieldset>
                    <legend>04 // TÙY CHỌN THÊM</legend>
                    <label>
                        MÔN THỂ THAO
                        <select value={form.sportId} onChange={(event) => update({ sportId: event.target.value })}>
                            <option value="">Không ưu tiên môn nào</option>
                            {options.sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
                        </select>
                    </label>
                    <div className="outfit-chips">
                        <label className="outfit-chip">
                            <input type="checkbox" checked={form.includeSocks} onChange={(event) => update({ includeSocks: event.target.checked })} />
                            Thêm tất
                        </label>
                        <label className="outfit-chip">
                            <input type="checkbox" checked={form.includeAccessory} onChange={(event) => update({ includeAccessory: event.target.checked })} />
                            Thêm phụ kiện
                        </label>
                    </div>
                </fieldset>

                {feedback && (
                    <div className="outfit-feedback" role="status">
                        <p>{feedback.message}</p>
                        {feedback.status === "missing" && (
                            <button type="button" className="btn-brutal-outline" disabled={submitting || outOfTurns} onClick={() => submit(true)}>
                                BÙ BẰNG NHÃN KHÁC
                            </button>
                        )}
                    </div>
                )}

                {quota && (
                    <p className={`outfit-quota${outOfTurns ? " empty" : ""}`} role="status">
                        {outOfTurns
                            ? `Bạn đã dùng hết ${quota.limit ?? ""} lượt tạo outfit${quota.window === "total" ? "" : " hôm nay"} trên máy này.`
                            : `Còn ${quota.remaining}/${quota.limit} lượt tạo outfit${quota.window === "total" ? "" : " hôm nay"} trên máy này.`}
                    </p>
                )}

                <div className="outfit-actions">
                    <button type="button" className="btn-brutal-outline" onClick={onClose}>ĐÓNG</button>
                    <button type="submit" className="btn-brutal" disabled={submitting || options.loading || outOfTurns}>
                        <Sparkles size={15} />
                        {submitting ? "AI ĐANG CHỌN ĐỒ..." : "GHÉP OUTFIT"}
                    </button>
                </div>
            </form>
        </div>
    );
}
