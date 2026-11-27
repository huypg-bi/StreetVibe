export const formatVnd = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

// Cùng cách làm tròn với backend (models/product.go)
export const getDiscountedPrice = (price, percent) =>
    Math.round((Number(price || 0) * (100 - Number(percent || 0))) / 100);

// Giá khách phải trả tại thời điểm tải dữ liệu
export const getEffectivePrice = (product) =>
    Number((product?.is_on_sale ? product.sale_price : product?.price) || 0);

// Thời gian giảm giá luôn nhập và hiển thị theo giờ Việt Nam (UTC+7)
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export const toVnDateTimeInput = (isoValue) =>
    isoValue ? new Date(new Date(isoValue).getTime() + VN_OFFSET_MS).toISOString().slice(0, 16) : "";

export const fromVnDateTimeInput = (inputValue) => (inputValue ? `${inputValue}:00+07:00` : "");

export const formatVnDateTime = (isoValue) =>
    isoValue
        ? new Date(isoValue).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "";
