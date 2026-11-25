import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { getCart, removeCartItem, updateCartQuantity } from "../api/productsApi";
import "../styles/atelierBrutal.css";

export default function CartPage() {
    const { user, token } = useAuth();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [pendingItemIds, setPendingItemIds] = useState([]);
    const [recipient, setRecipient] = useState({});

    const loadCart = useCallback(async () => {
        if (!token) {
            setCartItems([]);
            setError("");
            setLoading(false);
            return;
        }
        try {
            const response = await getCart();
            setCartItems(response.result.items);
            setError("");
        } catch (loadError) {
            console.error("Lỗi khi tải giỏ hàng:", loadError);
            setError("Không thể tải giỏ hàng. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const timeout = setTimeout(loadCart, 0);
        return () => clearTimeout(timeout);
    }, [loadCart]);

    const refreshCart = () => {
        setLoading(true);
        loadCart();
    };

    const updateItems = async (item, quantity) => {
        const productId = item.product?._id;
        if (!productId || pendingItemIds.includes(item.id)) return;

        setPendingItemIds((ids) => [...ids, item.id]);
        try {
            const response = quantity === 0
                ? await removeCartItem(productId)
                : await updateCartQuantity(productId, quantity);
            setCartItems(response.result.items);
            setError("");
        } catch (updateError) {
            console.error("Lỗi khi cập nhật giỏ hàng:", updateError);
            setError("Không thể cập nhật giỏ hàng. Vui lòng thử lại.");
        } finally {
            setPendingItemIds((ids) => ids.filter((id) => id !== item.id));
        }
    };

    const subtotal = cartItems.reduce(
        (total, item) => total + Number(item.product?.price || 0) * item.quantity,
        0
    );

    const handleCheckoutSubmit = (event) => {
        event.preventDefault();
    };

    return (
        <main className="atelier-cart-page">
            <div className="catalog-header-bar">
                <div>
                    <span className="mono-spec" style={{ color: "#d32f2f" }}>[ CART // ACCOUNT SYNC ]</span>
                    <h1>GIỎ HÀNG &amp; THANH TOÁN</h1>
                </div>
            </div>

            <div className="atelier-checkout-grid">
                <div className="reservation-tray-col">
                    <div className="cart-list-heading">
                        <span className="mono-spec">SẢN PHẨM TRONG GIỎ [{cartItems.length}]</span>
                        <button
                            type="button"
                            className="cart-refresh-button"
                            onClick={refreshCart}
                            disabled={loading}
                            aria-label="Tải lại giỏ hàng"
                        >
                            <RefreshCw size={15} className={loading ? "cart-spin" : ""} />
                        </button>
                    </div>

                    {error && <div className="cart-message error" role="alert">{error}</div>}

                    {!token ? (
                        <div className="cart-empty-state">
                            <p>Đăng nhập để xem giỏ hàng được lưu cho tài khoản của bạn.</p>
                            <Link to="/login" className="btn-brutal">[ĐĂNG NHẬP]</Link>
                        </div>
                    ) : loading && cartItems.length === 0 ? (
                        <div className="cart-empty-state">Đang tải giỏ hàng...</div>
                    ) : cartItems.length === 0 ? (
                        <div className="cart-empty-state">
                            <p>Giỏ hàng của bạn đang trống.</p>
                            <Link to="/best-seller" className="btn-brutal">[TIẾP TỤC MUA SẮM]</Link>
                        </div>
                    ) : (
                        cartItems.map((item) => {
                            const product = item.product || {};
                            const busy = pendingItemIds.includes(item.id);
                            return (
                                <div className={`cart-item-row${busy ? " is-updating" : ""}`} key={item.id}>
                                    <Link
                                        to={`/product/${product._id}`}
                                        className="cart-item-thumb"
                                        aria-label={`Xem ${product.name || "sản phẩm"}`}
                                    >
                                        {product.image
                                            ? <img src={product.image} alt={product.name || "Sản phẩm"} />
                                            : <span className="cart-image-placeholder">NO IMAGE</span>}
                                    </Link>
                                    <div className="cart-item-desc">
                                        <h4>{product.name || "Sản phẩm không có tên"}</h4>
                                        <strong>
                                            {Number(product.price || 0).toLocaleString("vi-VN")} ₫
                                        </strong>
                                    </div>
                                    <div className="cart-item-controls">
                                        <div className="qty-stepper-box">
                                            <button
                                                type="button"
                                                onClick={() => updateItems(item, Math.max(1, item.quantity - 1))}
                                                disabled={busy || item.quantity <= 1}
                                                aria-label="Giảm số lượng"
                                            >-</button>
                                            <span>{item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => updateItems(item, item.quantity + 1)}
                                                disabled={busy}
                                                aria-label="Tăng số lượng"
                                            >+</button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateItems(item, 0)}
                                            disabled={busy}
                                            className="cart-remove-button"
                                            title="Xóa sản phẩm"
                                            aria-label={`Xóa ${product.name || "sản phẩm"} khỏi giỏ`}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    <div className="cart-total-summary">
                        <div><span>TẠM TÍNH</span><span>{subtotal.toLocaleString("vi-VN")} ₫</span></div>
                        <div className="cart-grand-total"><span>TỔNG CỘNG</span><span>{subtotal.toLocaleString("vi-VN")} ₫</span></div>
                        <p>Phí vận chuyển và ưu đãi sẽ được xác nhận khi hoàn tất thông tin đơn hàng.</p>
                    </div>
                </div>

                <form className="checkout-payment-col" onSubmit={handleCheckoutSubmit}>
                    <section className="cart-recipient-section">
                        <div className="mono-spec cart-section-heading">[01 // THÔNG TIN TÀI KHOẢN]</div>
                        <div className="cart-recipient-fields">
                            <input
                                type="text"
                                placeholder="HỌ VÀ TÊN"
                                value={recipient.name !== undefined ? recipient.name : user?.name || ""}
                                onChange={(event) => setRecipient((value) => ({ ...value, name: event.target.value }))}
                            />
                            <input
                                type="email"
                                placeholder="EMAIL"
                                value={recipient.email !== undefined ? recipient.email : user?.email || ""}
                                onChange={(event) => setRecipient((value) => ({ ...value, email: event.target.value }))}
                            />
                            <input type="tel" placeholder="SỐ ĐIỆN THOẠI" />
                            <input type="text" placeholder="ĐỊA CHỈ NHẬN HÀNG" />
                        </div>
                        {!user && <p className="cart-account-note">Đăng nhập để hiển thị thông tin tài khoản của bạn.</p>}
                    </section>

                    <section className="cart-recipient-section">
                        <div className="mono-spec cart-section-heading">[02 // THANH TOÁN]</div>
                        <p className="cart-account-note">
                            Chức năng đặt hàng chưa khả dụng: dữ liệu giỏ hàng hiện chưa có biến thể và nhà cung cấp cần thiết cho API checkout.
                        </p>
                        <button type="submit" className="btn-brutal cart-checkout-button" disabled>
                            [TIẾN HÀNH THANH TOÁN &bull; {subtotal.toLocaleString("vi-VN")} ₫] <ArrowRight size={18} />
                        </button>
                    </section>
                </form>
            </div>
        </main>
    );
}
