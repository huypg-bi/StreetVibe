import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { getCart, removeCartItem, updateCartQuantity } from "../api/productsApi";
import "../styles/atelierBrutal.css";
import DiscountTag from "../../../shared/components/DiscountTag";
import ProductPrice from "../../../shared/components/ProductPrice";
import SoldOutOverlay from "../../../shared/components/SoldOutOverlay";
import { getEffectivePrice } from "../../../shared/utils/pricing";
import { getErrorMessage, toast } from "../../../shared/utils/toast";

export default function CartPage() {
    const { user, token } = useAuth();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingItemIds, setPendingItemIds] = useState([]);
    const [recipient, setRecipient] = useState({});

    const loadCart = useCallback(async () => {
        if (!token) {
            setCartItems([]);
            setLoading(false);
            return;
        }
        try {
            const response = await getCart({ refreshPrices: true });
            setCartItems(response.result.items);
        } catch (loadError) {
            console.error("Lỗi khi tải giỏ hàng:", loadError);
            toast.error("Không thể tải giỏ hàng. Vui lòng thử lại.");
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
        if (pendingItemIds.includes(item.id)) return;

        setPendingItemIds((ids) => [...ids, item.id]);
        try {
            if (quantity === 0) await removeCartItem(item.id);
            else await updateCartQuantity(item.id, quantity);
            // Tải lại giỏ để giữ đúng giá đang áp dụng
            await loadCart();
            if (quantity === 0) toast.success("Đã xóa sản phẩm khỏi giỏ hàng.");
        } catch (updateError) {
            console.error("Lỗi khi cập nhật giỏ hàng:", updateError);
            toast.error(getErrorMessage(updateError, "Không thể cập nhật giỏ hàng. Vui lòng thử lại."));
        } finally {
            setPendingItemIds((ids) => ids.filter((id) => id !== item.id));
        }
    };

    // Chỉ tính những sản phẩm đã chọn màu, size và còn hàng
    const subtotal = cartItems.filter((item) => item.variant_id && item.available !== 0).reduce(
        (total, item) => total + getEffectivePrice(item.product) * item.quantity,
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
                            const soldOut = item.available === 0;
                            const stockWarning = !item.variant_id
                                ? "Chưa chọn màu và size. Hãy xóa và thêm lại."
                                : soldOut
                                    ? "Đã hết hàng, không tính vào tổng tiền."
                                    : item.available !== null && item.quantity > item.available
                                        ? `Chỉ còn ${item.available} sản phẩm, hãy giảm số lượng.`
                                        : "";
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
                                        {soldOut && <SoldOutOverlay compact />}
                                    </Link>
                                    <div className="cart-item-desc">
                                        <h4>{product.name || "Sản phẩm không có tên"}</h4>
                                        <strong>
                                            <ProductPrice product={product} />
                                        </strong>
                                        <DiscountTag product={product} />
                                        {item.variant_id && (
                                            <p className="cart-item-variant">MÀU: {item.color_name} // SIZE: {item.size_name}</p>
                                        )}
                                        {stockWarning && <p className="cart-item-warning">{stockWarning}</p>}
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
                                                disabled={busy || !item.variant_id || (item.available !== null && item.quantity >= item.available)}
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
                            Chức năng đặt hàng chưa khả dụng.
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
