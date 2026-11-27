import { Link } from "react-router-dom";
import { SIZE_GENDERS } from "../utils/sizeAdvisor";
import "../styles/sizeAdvisor.css";

// Giải thích size đang được gợi ý theo hồ sơ, hoặc nhắc bổ sung dữ liệu còn thiếu.
export default function ProfileSizeHint({ user, result, option, selectedName }) {
    if (!user) {
        return (
            <p className="size-advisor-hint">
                <Link to="/login">Đăng nhập</Link> để được gợi ý size theo hồ sơ, hoặc dùng bảng tính size.
            </p>
        );
    }

    if (!result) {
        const needsData = !user.gender || !Number(user.height_cm) || !Number(user.weight_kg);
        return (
            <p className="size-advisor-hint">
                {needsData || SIZE_GENDERS.includes(user.gender) ? (
                    <><Link to="/profile">Cập nhật giới tính, chiều cao, cân nặng</Link> để được gợi ý size.</>
                ) : (
                    "Bảng size chia theo Nam / Nữ, bạn hãy chọn trong bảng tính size."
                )}
            </p>
        );
    }

    const profile = `${user.gender} · ${Number(user.height_cm)} cm · ${Number(user.weight_kg)} kg`;

    if (!result.size) {
        return <p className="size-advisor-hint warning">{result.note} ({profile})</p>;
    }

    const available = Boolean(option && option.stock > 0);
    return (
        <p className={`size-advisor-hint${available ? "" : " warning"}`}>
            <strong>SIZE GỢI Ý CHO BẠN: {option?.name ?? result.size}</strong> ({profile}). {result.note}
            {!available && (
                <> Size này hiện không có ở màu đang chọn{selectedName ? `, bạn đang chọn size ${selectedName}` : ""}.</>
            )}
        </p>
    );
}
