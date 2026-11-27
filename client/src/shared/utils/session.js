// Quản lý thời hạn phiên đăng nhập dựa trên trường exp của JWT.
export const SESSION_EXPIRED_EVENT = "streetvibe:session-expired";
// Giữ trùng câu với Media Service để hai thông báo gộp làm một
export const SESSION_EXPIRED_MESSAGE = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";

// Thời điểm hết hạn (ms); token không đọc được coi như đã hết hạn
export function getTokenExpiry(token) {
    try {
        const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return Number(JSON.parse(atob(payload)).exp) * 1000 || 0;
    } catch {
        return 0;
    }
}

export const isTokenExpired = (token) => getTokenExpiry(token) <= Date.now();

// Chỉ xóa đúng token đã hỏng, tránh xóa nhầm phiên vừa đăng nhập lại ở tab khác
export function expireSession(token) {
    if (!token || localStorage.getItem("token") !== token) return;
    localStorage.removeItem("token");
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
