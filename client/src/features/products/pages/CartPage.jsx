import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { getCart, updateCartQuantity, removeCartItem } from "../api/productsApi";

export default function CartPage() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState(null);

    const load = useCallback(async () => {
        const data = await getCart();
        setItems(data?.result?.items || []);
    }, []);

    useEffect(() => {
        if (!token) return;
        // load() is an async refetch also reused by the quantity/remove handlers below;
        // its setState calls run after the await, not synchronously in this effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load().catch((error) => console.error(error));
    }, [token, load]);

    if (!token) {
        return (
            <section className="shop-page">
                <div className="shop-page-container">
                    <h1 className="shop-page-title">My Cart</h1>
                    <div className="cart-container">
                        <div className="shop-empty-state">
                            <p>Vui lòng đăng nhập để xem giỏ hàng của bạn.</p>
                            <Link to="/login">Đăng nhập</Link>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (items === null) return null;

    if (items.length === 0) {
        return (
            <section className="shop-page">
                <div className="shop-page-container">
                    <h1 className="shop-page-title">My Cart</h1>
                    <div className="cart-container">
                        <div className="shop-empty-state">
                            <p>Giỏ hàng của bạn đang trống.</p>
                            <Link to="/">Tiếp tục mua sắm</Link>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    const total = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

    const handleQtyMinus = async (item) => {
        const newQty = item.quantity - 1;

        if (newQty <= 0) {
            await removeCartItem(item.product._id);
        } else {
            await updateCartQuantity(item.product._id, newQty);
        }

        load();
    };

    const handleQtyPlus = async (item) => {
        await updateCartQuantity(item.product._id, item.quantity + 1);
        load();
    };

    const handleRemove = async (item) => {
        await removeCartItem(item.product._id);
        load();
    };

    return (
        <section className="shop-page">
            <div className="shop-page-container">
                <h1 className="shop-page-title">My Cart</h1>

                <div className="cart-container">
                    {items.map((item) => (
                        <div className="cart-item" data-id={item.product._id} key={item.product._id}>
                            <div className="cart-item-image" onClick={() => navigate(`/product/${item.product._id}`)}>
                                <img src={item.product.image} alt={item.product.name} />
                            </div>
                            <div className="cart-item-info">
                                <h4 onClick={() => navigate(`/product/${item.product._id}`)}>{item.product.name}</h4>
                                <div className="price">${(item.product.price || 0).toFixed(2)} / item</div>
                            </div>
                            <div className="cart-item-qty">
                                <button className="qty-minus" onClick={() => handleQtyMinus(item)}>−</button>
                                <span>{item.quantity}</span>
                                <button className="qty-plus" onClick={() => handleQtyPlus(item)}>+</button>
                            </div>
                            <div className="cart-item-subtotal">${((item.product.price || 0) * item.quantity).toFixed(2)}</div>
                            <button className="cart-item-remove" onClick={() => handleRemove(item)}>Remove</button>
                        </div>
                    ))}

                    <div className="cart-summary">
                        <span className="label">Total:</span>
                        <span className="total">${total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
