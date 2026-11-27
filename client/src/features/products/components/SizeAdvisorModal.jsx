import { useState } from "react";
import { Link } from "react-router-dom";
import { Sliders, X } from "lucide-react";
import { GARMENT_LABELS, SIZE_CHARTS, SIZE_GENDERS, findSizeOption, recommendSize } from "../utils/sizeAdvisor";
import "../styles/sizeAdvisor.css";

const DEFAULTS = { Nam: { height: 170, weight: 65 }, Nữ: { height: 158, weight: 50 } };

const formatHeight = (cm) => `${Math.floor(cm / 100)}m${String(cm % 100).padStart(2, "0")}`;

// Giới tính lấy từ hồ sơ; chỉ khi hồ sơ chưa chọn Nam/Nữ mới cho chọn tại đây.
export default function SizeAdvisorModal({ user, productGarment, sizeOptions, onApply, onClose }) {
    const profileGender = SIZE_GENDERS.includes(user?.gender) ? user.gender : "";
    const [pickedGender, setPickedGender] = useState("Nam");
    const gender = profileGender || pickedGender;
    const [garment, setGarment] = useState(productGarment);
    const [heightInput, setHeightInput] = useState(null);
    const [weightInput, setWeightInput] = useState(null);
    const height = heightInput ?? (Number(user?.height_cm) || DEFAULTS[gender].height);
    const weight = weightInput ?? (Number(user?.weight_kg) || DEFAULTS[gender].weight);

    const result = recommendSize({ gender, garment, heightCm: height, weightKg: weight });
    const isProductGarment = garment === productGarment;
    const option = isProductGarment
        ? findSizeOption(sizeOptions, result?.size, { gender, garment })
        : undefined;
    const canApply = Boolean(option && option.stock > 0);

    let applyLabel = "[CHƯA CÓ SIZE PHÙ HỢP]";
    if (!isProductGarment) applyLabel = `[SẢN PHẨM NÀY LÀ ${GARMENT_LABELS[productGarment].toUpperCase()}]`;
    else if (canApply) applyLabel = `[ÁP DỤNG SIZE ${option.name} NGAY]`;
    else if (result?.size) applyLabel = `[SIZE ${result.size} KHÔNG CÓ HÀNG]`;

    return (
        <div className="size-modal-backdrop" onClick={onClose}>
            <div
                className="size-modal-container size-advisor-container"
                role="dialog"
                aria-modal="true"
                aria-label="Bảng tính size thông minh"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="size-modal-header">
                    <div className="size-advisor-title">
                        <Sliders size={16} />
                        <span>[BẢNG TÍNH SIZE // {gender.toUpperCase()}]</span>
                    </div>
                    <button type="button" className="size-advisor-close" aria-label="Đóng" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="size-modal-body">
                    <div className="size-advisor-toolbar">
                        <div className="size-advisor-tabs">
                            {Object.entries(GARMENT_LABELS).map(([key, label]) => (
                                <button
                                    type="button"
                                    key={key}
                                    className={garment === key ? "active" : ""}
                                    aria-pressed={garment === key}
                                    onClick={() => setGarment(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {profileGender ? (
                            <span className="mono-spec">
                                BẢNG {profileGender.toUpperCase()} THEO HỒ SƠ &bull; <Link to="/profile">ĐỔI</Link>
                            </span>
                        ) : (
                            <div className="size-advisor-tabs">
                                {SIZE_GENDERS.map((value) => (
                                    <button
                                        type="button"
                                        key={value}
                                        className={gender === value ? "active" : ""}
                                        aria-pressed={gender === value}
                                        onClick={() => setPickedGender(value)}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="size-advisor-sliders">
                        <div className="slider-controller-card">
                            <div className="slider-label-row">
                                <label htmlFor="size-advisor-height">CHIỀU CAO</label>
                                <strong>{height} CM</strong>
                            </div>
                            <input
                                id="size-advisor-height"
                                type="range"
                                min={Math.min(140, height)}
                                max={Math.max(195, height)}
                                value={height}
                                onChange={(event) => setHeightInput(Number(event.target.value))}
                            />
                        </div>

                        <div className="slider-controller-card">
                            <div className="slider-label-row">
                                <label htmlFor="size-advisor-weight">CÂN NẶNG</label>
                                <strong>{weight} KG</strong>
                            </div>
                            <input
                                id="size-advisor-weight"
                                type="range"
                                min={Math.min(35, weight)}
                                max={Math.max(110, weight)}
                                value={weight}
                                onChange={(event) => setWeightInput(Number(event.target.value))}
                            />
                        </div>
                    </div>

                    <div className={`recommended-fit-banner${result?.exact ? "" : " size-advisor-estimate"}`}>
                        <div>
                            <div className="fit-title">
                                {result?.size ? `SIZE ${GARMENT_LABELS[garment]} KHUYÊN DÙNG: ${result.size}` : "NGOÀI BẢNG SIZE"}
                            </div>
                            <p className="size-advisor-note">{result?.note}</p>
                        </div>
                    </div>

                    <div>
                        <span className="mono-spec size-advisor-chart-title">
                            BẢNG SIZE {GARMENT_LABELS[garment].toUpperCase()} {gender.toUpperCase()}
                        </span>
                        <table className="size-chart-table">
                            <thead>
                                <tr>
                                    <th>SIZE</th>
                                    <th>CHIỀU CAO</th>
                                    <th>CÂN NẶNG (KG)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SIZE_CHARTS[gender][garment].map((item) => (
                                    <tr key={item.size} className={item.size === result?.size ? "highlighted" : ""}>
                                        <td>{item.size}{item.size === result?.size ? " ★" : ""}</td>
                                        <td>{formatHeight(item.height[0])} - {formatHeight(item.height[1])}</td>
                                        <td>{item.weight[0]} - {item.weight[1]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {gender === "Nam" && garment === "bottom" && (
                            <p className="size-advisor-note">Với quần nam đánh số, size 29 tương đương size M.</p>
                        )}
                    </div>

                    <div className="size-advisor-actions">
                        <button type="button" className="btn-brutal-outline" onClick={onClose}>
                            ĐÓNG
                        </button>
                        <button
                            type="button"
                            className="btn-brutal"
                            disabled={!canApply}
                            onClick={() => onApply(option.name)}
                        >
                            {applyLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
