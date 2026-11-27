import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { getMe, updateMe, updateMyPassword, requestSupplier } from "../api/authApi";
import { uploadImage } from "../../../shared/api/mediaApi";
import { getMyOrders } from "../../../shared/api/orderApi";
import { apiClient } from "../../../shared/api/apiClient";
import { getBrands } from "../../products/api/productsApi";
import { useAuth } from "../hooks/useAuth";
import "../styles/profile.css";
import { toast } from "../../../shared/utils/toast";

const INTEREST_OPTIONS = ["Gym", "Bóng rổ", "Bóng đá", "Đạp xe", "Chạy bộ"];

export default function ProfilePage() {
    const { refreshUser } = useAuth();
    const avatarInputRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [name, setName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [avatarFile, setAvatarFile] = useState(null);
    const [gender, setGender] = useState("");
    const [heightCm, setHeightCm] = useState("");
    const [weightKg, setWeightKg] = useState("");
    const [interests, setInterests] = useState([]);
    const [favoriteBrand, setFavoriteBrand] = useState("");
    const [brandOptions, setBrandOptions] = useState([]);
    const [brandsLoading, setBrandsLoading] = useState(true);
    const [brandsError, setBrandsError] = useState("");
    const [supplierRequested, setSupplierRequested] = useState(false);
    const [supplierRequestSubmitting, setSupplierRequestSubmitting] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [orders, setOrders] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        Promise.all([getMe(), getMyOrders()])
            .then(([user, orderItems]) => {
                if (!active) return;
                setProfile(user);
                setName(user?.name || "");
                setAvatarUrl(user?.avatar_url || "");
                setGender(user?.gender || "");
                setHeightCm(user?.height_cm ? String(user.height_cm) : "");
                setWeightKg(user?.weight_kg ? String(user.weight_kg) : "");
                setInterests((Array.isArray(user?.interests) ? user.interests : [])
                    .map((interest) => interest === "Basketball" ? "Bóng rổ" : interest)
                    .filter((interest) => INTEREST_OPTIONS.includes(interest)));
                setFavoriteBrand(user?.favorite_brands?.[0] || "");
                setSupplierRequested(Boolean(user?.supplier_requested));
                setOrders(orderItems.filter((order) => order.payment_status === "PAID"));
            })
            .catch((loadError) => {
                console.error("Không thể tải hồ sơ:", loadError);
                if (active) toast.error("Không thể tải thông tin tài khoản.");
            })
            .finally(() => { if (active) setLoading(false); });
        getBrands()
            .then((brands) => {
                if (active) {
                    setBrandOptions(brands);
                    setBrandsError("");
                }
            })
            .catch((brandsLoadError) => {
                console.error("Không thể tải danh sách nhãn hàng:", brandsLoadError);
                if (active) {
                    setBrandsError("Không thể tải danh sách nhãn hàng.");
                    toast.error("Không thể tải danh sách nhãn hàng.");
                }
            })
            .finally(() => { if (active) setBrandsLoading(false); });
        return () => { active = false; };
    }, []);

    const saveProfile = async (event) => {
        event.preventDefault();
        try {
            let nextAvatarUrl = avatarUrl;
            if (avatarFile) {
                const uploaded = await uploadImage(avatarFile);
                if (!uploaded?.url) throw new Error("Ảnh tải lên không hợp lệ.");
                nextAvatarUrl = uploaded.url;
            }
            const saved = await updateMe({
                name,
                avatar_url: nextAvatarUrl,
                gender,
                height_cm: Number(heightCm || 0),
                weight_kg: Number(weightKg || 0),
                interests,
                favorite_brands: brandsLoading || brandsError
                    ? profile?.favorite_brands || []
                    : brandOptions.includes(favoriteBrand) ? [favoriteBrand] : [],
            });
            if (!saved) throw new Error("Không thể lưu hồ sơ.");
            setProfile(saved);
            setAvatarUrl(saved.avatar_url || "");
            setAvatarFile(null);
            setSupplierRequested(Boolean(saved.supplier_requested));
            await refreshUser();
            toast.success("Đã cập nhật hồ sơ.");
        } catch (saveError) {
            console.error("Không thể cập nhật hồ sơ:", saveError);
            toast.error(saveError.response?.data?.error?.message || saveError.message || "Không thể cập nhật hồ sơ.");
        }
    };

    const changePassword = async (event) => {
        event.preventDefault();
        try {
            await updateMyPassword(currentPassword, newPassword);
            setCurrentPassword("");
            setNewPassword("");
            toast.success("Đã đổi mật khẩu.");
        } catch (passwordError) {
            toast.error(passwordError.response?.data?.error?.message || "Mật khẩu hiện tại không chính xác.");
        }
    };

    const submitSupplierRequest = async () => {
        if (supplierRequested || supplierRequestSubmitting) return;
        setSupplierRequestSubmitting(true);
        try {
            const saved = await requestSupplier();
            setProfile(saved);
            setSupplierRequested(Boolean(saved?.supplier_requested));
            await refreshUser();
            toast.success(saved?.supplier_requested ? "Yêu cầu trở thành Supplier đã được gửi cho Admin." : "Tài khoản của bạn đã là Supplier.");
        } catch (requestError) {
            toast.error(requestError.response?.data?.error?.message || "Không thể gửi yêu cầu Supplier.");
        } finally {
            setSupplierRequestSubmitting(false);
        }
    };

    const openVouchers = async () => {
        try {
            const res = await apiClient.get("/marketplace/vouchers");
            setVouchers(res.data?.data?.items || []);
            setShowVoucherModal(true);
        } catch (voucherError) {
            console.error("Không thể tải voucher:", voucherError);
            toast.error("Không thể tải danh sách voucher.");
        }
    };

    const heightM = Number(heightCm) / 100;
    const bmi = heightM > 0 && Number(weightKg) > 0 ? (Number(weightKg) / (heightM * heightM)).toFixed(1) : "";

    if (loading) return <main className="profile-page"><p className="profile-status">ĐANG TẢI HỒ SƠ...</p></main>;

    return (
        <main className="profile-page">
            <header className="profile-header">
                <div>
                    <span>[ MEMBER // PROFILE ]</span>
                    <h1>Hồ sơ cá nhân</h1>
                </div>
                <button type="button" className="profile-header-button" onClick={openVouchers}>VOUCHER CỦA TÔI</button>
            </header>

            <div className="profile-layout">
                <form className="profile-card" onSubmit={saveProfile}>
                    <h2>Thông tin tài khoản</h2>
                    <div className="profile-avatar-row">
                        <div className="profile-avatar-wrap">
                            <div className="profile-avatar">
                                {avatarUrl ? <img src={avatarUrl} alt={`Avatar ${name}`} /> : <span>{name?.slice(0, 1)?.toUpperCase() || "M"}</span>}
                            </div>
                            <input
                                ref={avatarInputRef}
                                className="profile-avatar-input"
                                type="file"
                                accept="image/*"
                                onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                            />
                            <button
                                type="button"
                                className="profile-avatar-camera"
                                aria-label="Chọn ảnh đại diện"
                                title="Chọn ảnh đại diện"
                                onClick={() => avatarInputRef.current?.click()}
                            >
                                <Camera size={14} aria-hidden="true" />
                            </button>
                        </div>
                        <label className="profile-display-name">
                            TÊN HIỂN THỊ
                            <input value={name} onChange={(event) => setName(event.target.value)} required />
                            {avatarFile && <small>Đã chọn ảnh: {avatarFile.name}</small>}
                        </label>
                    </div>
                    <div className="profile-details-grid">
                        <div className="profile-measurements">
                            <label>CHIỀU CAO (CM)<input type="number" min="50" max="250" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} /></label>
                            <label>CÂN NẶNG (KG)<input type="number" min="20" max="300" step="0.1" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} /></label>
                            <div className="profile-bmi"><span>CHỈ SỐ BMI</span><strong>{bmi || "—"}</strong></div>
                        </div>
                        <div className="profile-preferences">
                            <label>GIỚI TÍNH
                            <select value={gender} onChange={(event) => setGender(event.target.value)}>
                                <option value="">Chọn giới tính</option>
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                                <option value="Khác">Khác</option>
                            </select>
                            </label>
                            <label>NHÃN HÀNG YÊU THÍCH
                                <select
                                    value={brandOptions.includes(favoriteBrand) ? favoriteBrand : ""}
                                    onChange={(event) => setFavoriteBrand(event.target.value)}
                                    disabled={brandsLoading || brandOptions.length === 0}
                                >
                                    <option value="">
                                        {brandsLoading ? "Đang tải nhãn hàng..." : brandsError || "Chọn nhãn hàng"}
                                    </option>
                                    {brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                                </select>
                            </label>
                            <div className="profile-sports-field">
                                <span>SỞ THÍCH THỂ THAO</span>
                                <details className="profile-sports-dropdown">
                                    <summary>
                                        {interests.length > 0 ? interests.join(", ") : "Chọn môn thể thao"}
                                    </summary>
                                    <div className="profile-sports-options">
                                        {INTEREST_OPTIONS.map((interest) => (
                                            <label key={interest}>
                                                <input
                                                    type="checkbox"
                                                    checked={interests.includes(interest)}
                                                    onChange={() => setInterests((current) => current.includes(interest)
                                                        ? current.filter((item) => item !== interest)
                                                        : [...current, interest])}
                                                />
                                                <span>{interest}</span>
                                            </label>
                                        ))}
                                    </div>
                                </details>
                            </div>
                        </div>
                    </div>

                    <label className="profile-supplier-check">
                        <input type="checkbox" checked={supplierRequested} onChange={(event) => event.target.checked && submitSupplierRequest()} disabled={supplierRequested || supplierRequestSubmitting || profile?.role === "supplier"} />
                        <span>{supplierRequestSubmitting ? "Đang gửi yêu cầu..." : "Muốn trở thành Supplier"}</span>
                    </label>

                    <button type="submit" className="profile-primary-button">LƯU HỒ SƠ</button>
                </form>

                <aside className="profile-side">
                    <form className="profile-card" onSubmit={changePassword}>
                        <h2>Đổi mật khẩu</h2>
                        <label>MẬT KHẨU HIỆN TẠI<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
                        <label>MẬT KHẨU MỚI<input type="password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
                        <button type="submit" className="profile-primary-button">CẬP NHẬT MẬT KHẨU</button>
                    </form>

                    <section className="profile-card">
                        <h2>Đơn hàng đã thanh toán</h2>
                        {orders.length === 0 ? (
                            <p className="profile-empty">Chưa có đơn hàng đã thanh toán.</p>
                        ) : (
                            <div className="profile-order-list">
                                {orders.map((order) => (
                                    <article key={order.id}>
                                        <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                                        <span>{Number(order.total_amount).toLocaleString("vi-VN")} ₫</span>
                                        <small>{order.payment_status}</small>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </aside>
            </div>

            {showVoucherModal && (
                <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowVoucherModal(false)}>
                    <section className="profile-modal" role="dialog" aria-modal="true">
                        <header><h2>Voucher khả dụng</h2><button type="button" onClick={() => setShowVoucherModal(false)}>×</button></header>
                        {vouchers.length === 0 ? <p className="profile-empty">Hiện chưa có voucher.</p> : (
                            <div className="profile-voucher-list">
                                {vouchers.map((voucher) => (
                                    <article key={voucher.id}><strong>{voucher.code}</strong><span>GIẢM {Number(voucher.discount_percent)}%</span></article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

        </main>
    );
}
