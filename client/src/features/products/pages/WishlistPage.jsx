import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { getWishlist, removeWishlist } from "../api/productsApi";

export default function WishlistPage() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [wishlist, setWishlist] = useState(null);

    const load = useCallback(async () => {
        const data = await getWishlist();
        setWishlist(data?.result?.products || []);
    }, []);

    useEffect(() => {
        if (!token) return;
        // load() is an async refetch also reused by the remove handler below;
        // its setState calls run after the await, not synchronously in this effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load().catch((error) => console.error(error));
    }, [token, load]);

    if (!token) {
        return (
            <section className="shop-page">
                <div className="shop-page-container">
                    <h1 className="shop-page-title">My Wishlist</h1>
                    <div className="wishlist-container">
                        <div className="shop-empty-state">
                            <p>Vui lòng đăng nhập để xem wishlist của bạn.</p>
                            <Link to="/login">Đăng nhập</Link>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (wishlist === null) return null;

    if (wishlist.length === 0) {
        return (
            <section className="shop-page">
                <div className="shop-page-container">
                    <h1 className="shop-page-title">My Wishlist</h1>
                    <div className="wishlist-container">
                        <div className="shop-empty-state">
                            <p>Wishlist của bạn đang trống.</p>
                            <Link to="/">Tiếp tục mua sắm</Link>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    const handleRemove = async (id) => {
        await removeWishlist(id);
        load();
    };

    return (
        <section className="shop-page">
            <div className="shop-page-container">
                <h1 className="shop-page-title">My Wishlist</h1>

                <div className="wishlist-container">
                    {wishlist.map((item) => (
                        <div className="wishlist-card" data-id={item._id} key={item._id}>
                            <div className="wishlist-card-image" onClick={() => navigate(`/product/${item._id}`)}>
                                <img src={item.image} alt={item.name} />
                            </div>
                            <div className="wishlist-card-info">
                                <h4 onClick={() => navigate(`/product/${item._id}`)}>{item.name}</h4>
                                <div className="price">${(item.price || 0).toFixed(2)}</div>
                                <button className="wishlist-remove-btn" onClick={() => handleRemove(item._id)}>Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
