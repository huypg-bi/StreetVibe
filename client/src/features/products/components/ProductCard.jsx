import { useNavigate } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";

export default function ProductCard({ product, isWishlisted, onToggleWishlist }) {
    const navigate = useNavigate();
    const id = product._id ?? product.id;

    return (
        <article
            className="product-card"
            data-id={id}
            onClick={() => navigate(`/product/${id}`)}
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === "Enter" && event.target === event.currentTarget) navigate(`/product/${id}`);
            }}
        >
            <div className="product-image">
                <span className="badge">NEW SEASON</span>
                <img src={product.image} alt={product.name} />

                <div className="overlay">
                    <button
                        className={`icon-btn wishlist-btn${isWishlisted ? " active" : ""}`}
                        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleWishlist(id);
                        }}
                    >
                        <Heart
                            size={18}
                            color={isWishlisted ? "#fff" : "#33A0FF"}
                            fill={isWishlisted ? "#fff" : "none"}
                        />
                    </button>

                    <button
                        className="icon-btn"
                        aria-label="View product"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/product/${id}`);
                        }}
                    >
                        <ShoppingCart size={18} color="#33A0FF" />
                    </button>
                </div>
            </div>

            <div className="product-info">
                <h3>{product.name}</h3>

                <div className="rating">★★★★☆</div>

                <div className="price">
                    <span className="new">${product.price}</span>
                    <span className="old">${product.originalPrice}</span>
                    <span className="discount">24% Off</span>
                </div>
            </div>
        </article>
    );
}
