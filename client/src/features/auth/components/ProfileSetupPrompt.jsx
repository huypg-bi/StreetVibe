import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { updateMe } from "../api/authApi";
import { getErrorMessage, toast } from "../../../shared/utils/toast";
import "../styles/profileSetupPrompt.css";

const dismissKey = (userId) => `streetvibe:size-setup-dismissed:${userId}`;

function SetupForm({ user, onSkip, onSaved }) {
    const [gender, setGender] = useState(["Nam", "Nữ"].includes(user.gender) ? user.gender : "");
    const [heightCm, setHeightCm] = useState(user.height_cm ? String(user.height_cm) : "");
    const [weightKg, setWeightKg] = useState(user.weight_kg ? String(user.weight_kg) : "");
    const [saving, setSaving] = useState(false);

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            // API cập nhật ghi đè toàn bộ hồ sơ nên phải gửi lại các trường đang có
            const saved = await updateMe({
                name: user.name || "",
                avatar_url: user.avatar_url || "",
                interests: user.interests || [],
                favorite_brands: user.favorite_brands || [],
                gender,
                height_cm: Number(heightCm),
                weight_kg: Number(weightKg),
            });
            if (!saved) throw new Error("Không thể lưu số đo.");
            toast.success("Đã lưu số đo. StreetVibe sẽ gợi ý size cho bạn.");
            await onSaved();
        } catch (error) {
            console.error("Không thể lưu số đo:", error);
            toast.error(getErrorMessage(error, "Không thể lưu số đo. Vui lòng thử lại."));
            setSaving(false);
        }
    };

    return (
        <div className="size-setup-backdrop">
            <form className="size-setup-card" role="dialog" aria-modal="true" aria-labelledby="size-setup-title" onSubmit={save}>
                <span className="size-setup-tag">[SETUP // SIZE PROFILE]</span>
                <h2 id="size-setup-title">Nhập số đo để được gợi ý size</h2>
                <p>StreetVibe dùng giới tính, chiều cao và cân nặng để chọn sẵn size quần áo phù hợp với bạn. Bạn có thể sửa lại trong hồ sơ bất cứ lúc nào.</p>

                <label>
                    GIỚI TÍNH
                    <select value={gender} onChange={(event) => setGender(event.target.value)} required>
                        <option value="">Chọn giới tính</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                    </select>
                </label>
                <div className="size-setup-row">
                    <label>
                        CHIỀU CAO (CM)
                        <input type="number" min="50" max="250" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} required />
                    </label>
                    <label>
                        CÂN NẶNG (KG)
                        <input type="number" min="20" max="300" step="0.1" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} required />
                    </label>
                </div>

                <div className="size-setup-actions">
                    <button type="button" className="size-setup-skip" onClick={onSkip} disabled={saving}>ĐỂ SAU</button>
                    <button type="submit" className="size-setup-save" disabled={saving}>
                        {saving ? "ĐANG LƯU..." : "LƯU SỐ ĐO"}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Hướng dẫn khách hàng nhập số đo khi mới vào web. Bấm "Để sau" thì không hỏi lại trên trình duyệt này.
export default function ProfileSetupPrompt() {
    const { user, refreshUser } = useAuth();
    const { pathname } = useLocation();
    const [skippedId, setSkippedId] = useState(null);

    if (!user || user.role !== "customer" || pathname === "/profile") return null;
    if (user.gender && Number(user.height_cm) && Number(user.weight_kg)) return null;

    const userId = user._id ?? user.id;
    if (skippedId === userId || localStorage.getItem(dismissKey(userId))) return null;

    const skip = () => {
        localStorage.setItem(dismissKey(userId), "1");
        setSkippedId(userId);
    };

    return <SetupForm key={userId} user={user} onSkip={skip} onSaved={refreshUser} />;
}
