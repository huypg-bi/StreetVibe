// Định dạng số liệu cho trang Quản lý AI
export const formatNumber = (value) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 });

export const formatCompact = (value) => {
    const n = Number(value || 0);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
    return formatNumber(n);
};

// Chi phí mỗi lượt rất nhỏ nên cần nhiều chữ số thập phân
export const formatUsd = (value) => {
    const n = Number(value || 0);
    if (n === 0) return "$0";
    return `$${n.toFixed(n < 0.01 ? 6 : n < 1 ? 4 : 2)}`;
};

export const formatMs = (value) => {
    const n = Number(value || 0);
    return n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${Math.round(n)} ms`;
};

// Không có mẫu số thì hiện "—" thay vì 0% gây hiểu nhầm
export const formatRate = (rate, denominator) =>
    denominator ? `${(Number(rate || 0) * 100).toFixed(1)}%` : "—";

export const formatTime = (value) =>
    value
        ? new Date(value).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
          })
        : "—";

export const shortDate = (isoDate) => `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;

export const STATUS_LABELS = {
    success: "Thành công",
    failed: "Model lỗi",
    blocked: "Bị chặn",
    quota: "Hết lượt",
    pending: "Đang xử lý",
};

export const SOURCE_LABELS = { ai: "Model", cache: "Cache", rule: "Bộ lọc" };

export const ERROR_LABELS = {
    rate_limit: "Quá tải (429)",
    timeout: "Quá thời gian chờ",
    server_error: "Lỗi máy chủ Groq (5xx)",
    invalid_format: "Sai định dạng JSON",
    error: "Lỗi khác",
};

export const BLOCK_LABELS = {
    disabled: "Admin tắt AI",
    daily_budget: "Chạm ngân sách ngày",
    monthly_budget: "Chạm ngân sách tháng",
    daily_tokens: "Chạm giới hạn token ngày",
    rate_guard: "Vượt số yêu cầu mỗi phút",
    no_key: "Thiếu API key",
    config: "Lỗi cấu hình",
};
