import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ShieldCheck, QrCode, CreditCard, Banknote, Trash2, ArrowRight } from "lucide-react";
import pumaImg from "../../../assets/img/puma.webp";
import "../styles/atelierBrutal.css";

export default function CartPage() {
    // 15:00 Hold Countdown
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [voucherCode, setVoucherCode] = useState("");
    const [discountApplied, setDiscountApplied] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("VIETQR");

    // Sample items in reservation tray
    const [cartItems, setCartItems] = useState([
        {
            id: 1,
            name: "HEAVY HOODIE // ACID WASH",
            sku: "SV-HD-480-BLK",
            size: "L",
            price: 1450000,
            quantity: 1,
            image: pumaImg,
        },
        {
            id: 2,
            name: "TACTICAL CARGO // TITANIUM",
            sku: "SV-CG-380-GRY",
            size: "L",
            price: 1850000,
            quantity: 1,
            image: pumaImg,
        },
    ]);

    // Timer tick
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const updateQty = (id, delta) => {
        setCartItems(items =>
            items.map(item => {
                if (item.id === id) {
                    const newQty = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQty };
                }
                return item;
            })
        );
    };

    const removeItem = (id) => {
        setCartItems(items => items.filter(item => item.id !== id));
    };

    const subtotal = cartItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
    const discount = discountApplied ? subtotal * 0.1 : 0;
    const shipping = subtotal > 1000000 ? 0 : 35000;
    const grandTotal = subtotal - discount + shipping;

    const handleApplyVoucher = (e) => {
        e.preventDefault();
        if (voucherCode.trim().toUpperCase() === "DROPPASS" || voucherCode.trim().toUpperCase() === "VIP10") {
            setDiscountApplied(true);
            alert("MÃ VIP DROP PASS HỢP LỆ! ĐÃ GIẢM 10% VÀO ĐƠN HÀNG.");
        } else {
            alert("MÃ VOUCHER KHÔNG HỢP LỆ HOẶC ĐÃ HẾT LƯỢT TRUY CẬP SỚM.");
        }
    };

    const handleCheckoutSubmit = (e) => {
        e.preventDefault();
        alert(`ĐẶT HÀNG THÀNH CÔNG!\nTổng thanh toán: ${grandTotal.toLocaleString("vi-VN")} ₫ qua [${paymentMethod}].\nHệ thống StreetVibe Logistics sẽ xử lý đóng gói và cấp mã theo dõi trong 2 giờ.`);
    };

    return (
        <main className="atelier-cart-page">
            {/* Header */}
            <div className="catalog-header-bar">
                <div>
                    <span className="mono-spec" style={{ color: "#d32f2f" }}>[RESERVATION PROTOCOL // 2026]</span>
                    <h1>GIỎ HÀNG &amp; THANH TOÁN TỐI GIẢN // CHECKOUT</h1>
                </div>
                <div className="mono-spec">
                    ENCRYPTION: 256-BIT SSL PROTECTED
                </div>
            </div>

            {/* All-in-One 2-Column Grid */}
            <div className="atelier-checkout-grid">
                {/* Column Left: Reservation Tray */}
                <div className="reservation-tray-col">
                    {/* Hold timer alert */}
                    <div className="hold-countdown-bar">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Clock size={16} />
                            <span>THỜI GIAN GIỮ SUẤT MUA DROP: {formatTimer(timeLeft)}</span>
                        </div>
                        <span className="mono-spec">[ĐANG KHÓA KHO]</span>
                    </div>

                    {/* Cart Items list */}
                    <div>
                        <div className="mono-spec" style={{ marginBottom: "12px", color: "var(--text-muted)" }}>
                            DANH SÁCH MÓN ĐỒ ĐANG GIỮ [{cartItems.length}]
                        </div>

                        {cartItems.map(item => (
                            <div className="cart-item-row" key={item.id}>
                                <div className="cart-item-thumb">
                                    <img src={item.image} alt={item.name} />
                                </div>
                                <div className="cart-item-desc">
                                    <h4>{item.name}</h4>
                                    <p>SKU: {item.sku} &bull; SIZE: {item.size}</p>
                                    <strong style={{ fontFamily: "var(--font-mono)", fontSize: "13px", marginTop: "4px", display: "block" }}>
                                        {item.price.toLocaleString("vi-VN")} ₫
                                    </strong>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div className="qty-stepper-box">
                                        <button type="button" onClick={() => updateQty(item.id, -1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button type="button" onClick={() => updateQty(item.id, 1)}>+</button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(item.id)}
                                        style={{ color: "#888", cursor: "pointer" }}
                                        title="Xóa món này"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Voucher / VIP Drop Pass Input */}
                    <form onSubmit={handleApplyVoucher} style={{ display: "flex", gap: "0" }}>
                        <input
                            type="text"
                            placeholder="MÃ VOUCHER VIP DROP PASS (VD: DROPPASS)..."
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value)}
                            style={{ flex: 1, borderRight: "none" }}
                        />
                        <button type="submit" className="btn-brutal" style={{ padding: "0 20px" }}>
                            [ÁP DỤNG]
                        </button>
                    </form>

                    {/* Cost Summary Breakdown */}
                    <div style={{ background: "var(--surface-dim)", border: "var(--border-subtle)", padding: "20px", display: "flex", flexDirection: "column", gap: "10px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>TỔNG TIỀN MÓN ĐỒ</span>
                            <span>{subtotal.toLocaleString("vi-VN")} ₫</span>
                        </div>
                        {discountApplied && (
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#166534" }}>
                                <span>ƯU ĐÃI VIP DROP PASS (-10%)</span>
                                <span>-{discount.toLocaleString("vi-VN")} ₫</span>
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>PHÍ VẬN CHUYỂN BẢO HIỂM</span>
                            <span>{shipping === 0 ? "MIỄN PHÍ [TRÊN 1 TRIỆU]" : shipping.toLocaleString("vi-VN") + " ₫"}</span>
                        </div>
                        <div style={{ borderTop: "var(--border-black)", paddingTop: "12px", marginTop: "4px", display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "800" }}>
                            <span>TỔNG CỘNG THANH TOÁN</span>
                            <span>{grandTotal.toLocaleString("vi-VN")} ₫</span>
                        </div>
                    </div>
                </div>

                {/* Column Right: Recipient Specs & Payment Engine */}
                <form className="checkout-payment-col" onSubmit={handleCheckoutSubmit}>
                    <div>
                        <div className="mono-spec" style={{ marginBottom: "12px", fontWeight: "700" }}>
                            [01 // THÔNG TIN GIAO HÀNG &amp; NGƯỜI NHẬN]
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <input type="text" placeholder="HỌ VÀ TÊN NGƯỜI NHẬN..." required defaultValue="NGUYỄN VĂN AN" />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <input type="tel" placeholder="SỐ ĐIỆN THOẠI..." required defaultValue="0987654321" />
                                <input type="email" placeholder="EMAIL NHẬN MÃ THEO DÕI..." required defaultValue="user@streetvibe.com" />
                            </div>
                            <input type="text" placeholder="ĐỊA CHỈ NHẬN HÀNG (SỐ NHÀ, ĐƯỜNG, PHƯỜNG/XÃ)..." required defaultValue="128 ĐỒNG KHỞI, PHƯỜNG BẾN NGHÉ, QUẬN 1" />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <input type="text" placeholder="TỈNH / THÀNH PHỐ..." required defaultValue="TP. HỒ CHÍ MINH" />
                                <input type="text" placeholder="GHI CHÚ GIAO HÀNG (TÙY CHỌN)..." />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="mono-spec" style={{ marginBottom: "12px", fontWeight: "700" }}>
                            [02 // PHƯƠNG THỨC THANH TOÁN AN TOÀN]
                        </div>
                        <div className="payment-method-selector">
                            <div
                                className={`payment-method-tile ${paymentMethod === "VIETQR" ? "selected" : ""}`}
                                onClick={() => setPaymentMethod("VIETQR")}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <QrCode size={16} />
                                    <strong>VIETQR PRO</strong>
                                </div>
                                <span style={{ fontSize: "11px", opacity: 0.8 }}>Quét mã QR tự động xác thực</span>
                            </div>

                            <div
                                className={`payment-method-tile ${paymentMethod === "MOMO" ? "selected" : ""}`}
                                onClick={() => setPaymentMethod("MOMO")}
                            >
                                <strong>VÍ MOMO</strong>
                                <span style={{ fontSize: "11px", opacity: 0.8 }}>Thanh toán qua app MoMo</span>
                            </div>

                            <div
                                className={`payment-method-tile ${paymentMethod === "STRIPE" ? "selected" : ""}`}
                                onClick={() => setPaymentMethod("STRIPE")}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <CreditCard size={16} />
                                    <strong>THẺ QUỐC TẾ</strong>
                                </div>
                                <span style={{ fontSize: "11px", opacity: 0.8 }}>Visa, Mastercard, JCB</span>
                            </div>

                            <div
                                className={`payment-method-tile ${paymentMethod === "COD" ? "selected" : ""}`}
                                onClick={() => setPaymentMethod("COD")}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Banknote size={16} />
                                    <strong>COD</strong>
                                </div>
                                <span style={{ fontSize: "11px", opacity: 0.8 }}>Thanh toán khi nhận hàng</span>
                            </div>
                        </div>
                    </div>

                    {/* VietQR Live Preview Box */}
                    {paymentMethod === "VIETQR" && (
                        <div className="vietqr-box">
                            <div className="mono-spec" style={{ color: "#d32f2f", fontWeight: "700" }}>
                                [MÃ VIETQR TỰ ĐỘNG KHỞI TẠO THEO ĐƠN HÀNG]
                            </div>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=STREETVIBE_ORDER_AMOUNT_${grandTotal}`}
                                alt="VietQR Code"
                            />
                            <div className="mono-spec" style={{ fontSize: "11px" }}>
                                NGÂN HÀNG: MB BANK &bull; STK: 88889999STREETVIBE<br />
                                SỐ TIỀN: <strong>{grandTotal.toLocaleString("vi-VN")} ₫</strong> &bull; NỘI DUNG: <strong>SV_ORDER_{timeLeft}</strong>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-brutal"
                        style={{ padding: "18px", fontSize: "15px", marginTop: "12px" }}
                    >
                        [TIẾN HÀNH THANH TOÁN &bull; {grandTotal.toLocaleString("vi-VN")} ₫] <ArrowRight size={18} />
                    </button>
                </form>
            </div>
        </main>
    );
}
