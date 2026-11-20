import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useWishlist } from "../hooks/useWishlist";
import { getProductDetail, getProducts, addOrUpdateReview, addToCart } from "../api/productsApi";
import { ShoppingCart, Heart } from "lucide-react";
import facebookIcon from "../../../assets/img/facebook.png";
import twitterIcon from "../../../assets/img/twitter.png";

const COLORS = ["#1D3B5F", "#E74C3C", "#1C1C1C", "#FFD700"];

function starString(rating) {
    const rounded = Math.round(rating || 0);
    return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const { wishlistIds, toggleWishlist } = useWishlist();

    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [bestSeller, setBestSeller] = useState(null);
    const [activeThumb, setActiveThumb] = useState(0);
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [size, setSize] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState("description");
    const [selectedRating, setSelectedRating] = useState(0);
    const [comment, setComment] = useState("");

    useEffect(() => {
        if (!id) {
            navigate("/", { replace: true });
            return;
        }

        let active = true;

        async function load() {
            try {
                const detail = await getProductDetail(id);

                if (!detail?.product) {
                    console.error("Product not found");
                    navigate("/", { replace: true });
                    return;
                }

                if (!active) return;

                setProduct(detail.product);
                setReviews(detail.reviews || []);
                setActiveThumb(0);
                setQuantity(1);
                setSize("");
                setSelectedColor(COLORS[0]);
                setActiveTab("description");

                const products = await getProducts();
                if (!active) return;

                setAllProducts(products);

                const bestSellerCandidates = products.filter(
                    (p) => p._id !== detail.product._id && p.stock
                );
                setBestSeller(
                    bestSellerCandidates.length > 0
                        ? bestSellerCandidates[Math.floor(Math.random() * bestSellerCandidates.length)]
                        : null
                );
            } catch (error) {
                console.error("Error loading product:", error);
            }
        }

        load();

        return () => {
            active = false;
        };
    }, [id, navigate]);

    if (!product) return null;

    const images = [product.image, product.image, product.image, product.image];

    const sameCategory = allProducts
        .filter((p) => p.category?._id === product.category?._id && p._id !== product._id)
        .slice(0, 4);
    const related = sameCategory.length > 0
        ? sameCategory
        : allProducts.filter((p) => p._id !== product._id).slice(0, 4);

    const isWishlisted = wishlistIds.includes(product._id);

    const handleAddToCart = async () => {
        if (!token) {
            alert("Vui lòng đăng nhập để thêm vào giỏ hàng");
            navigate("/login");
            return;
        }

        if (!size) {
            alert("Please select a size");
            return;
        }

        try {
            await addToCart(product._id, quantity);
            alert("Product added to cart!");
            setQuantity(1);
        } catch (error) {
            console.error(error);
            alert("Thêm vào giỏ hàng thất bại");
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            alert("Vui lòng đăng nhập để gửi đánh giá");
            navigate("/login");
            return;
        }

        if (!selectedRating) {
            alert("Vui lòng chọn số sao đánh giá");
            return;
        }

        try {
            await addOrUpdateReview(product._id, selectedRating, comment.trim());

            const detail = await getProductDetail(product._id);
            setProduct(detail.product);
            setReviews(detail.reviews || []);
            setComment("");
            setSelectedRating(0);

            alert("Cảm ơn bạn đã đánh giá sản phẩm!");
        } catch (error) {
            console.error(error);
            alert("Gửi đánh giá thất bại");
        }
    };

    const handleShare = (network) => {
        const url = window.location.href;
        const shareUrl = network === "facebook"
            ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
            : `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=Check%20out%20this%20product!`;
        window.open(shareUrl, "_blank", "width=600,height=400");
    };

    return (
        <>
            {/* ================= BREADCRUMB ================= */}
            <section className="breadcrumb">
                <div className="breadcrumb-container">
                    <Link to="/">Home</Link>
                    <span>/</span>
                    <span>{product.category?.name || "Product"}</span>
                    <span>/</span>
                    <span>{product.name}</span>
                </div>
            </section>

            {/* ================= PRODUCT DETAIL ================= */}
            <section className="product-detail">
                <div className="product-detail-container">

                    {/* Product Images */}
                    <div className="product-images">
                        <div className="main-image">
                            <img src={images[activeThumb]} alt="Product" />
                        </div>
                        <div className="thumbnail-images">
                            {images.map((img, index) => (
                                <div
                                    key={index}
                                    className={`thumbnail${index === activeThumb ? " active" : ""}`}
                                    onClick={() => setActiveThumb(index)}
                                >
                                    <img src={img} alt={`Product thumbnail ${index + 1}`} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="product-info-section">
                        <div className="product-header">
                            <h1>{product.name}</h1>
                            <div className="rating-section">
                                <div className="rating">{starString(product.averageRating)}</div>
                                <span className="reviews-count">{product.ratingCount || 0} reviews</span>
                                <a
                                    href="#reviews"
                                    className="submit-review"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveTab("reviews");
                                    }}
                                >
                                    Submit a review
                                </a>
                            </div>
                        </div>

                        {/* Price Section */}
                        <div className="price-section">
                            <div className="price-wrapper">
                                <span className="new-price">${(product.price || 299.43).toFixed(2)}</span>
                                <span className="old-price">${(product.price * 1.5).toFixed(2)}</span>
                                <span className="discount-badge">24% Off</span>
                            </div>
                        </div>

                        {/* Availability */}
                        <div className="availability">
                            <div className="availability-item">
                                <span className="label">Availability:</span>
                                <span className="status">{product.stock ? "In Stock" : "Out of Stock"}</span>
                            </div>
                            <div className="availability-item">
                                <span className="label">Category:</span>
                                <span className="value">{product.category?.name || "Accessories"}</span>
                            </div>
                        </div>

                        {/* Color Selection */}
                        <div className="color-selection">
                            <label>Select Color</label>
                            <div className="colors">
                                {COLORS.map((color) => (
                                    <div
                                        key={color}
                                        className={`color-option${color === selectedColor ? " active" : ""}`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                        onClick={() => setSelectedColor(color)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Size Selection */}
                        <div className="size-selection">
                            <label>Size</label>
                            <select value={size} onChange={(e) => setSize(e.target.value)}>
                                <option value="">Select Size</option>
                                <option value="XS">XS</option>
                                <option value="S">S</option>
                                <option value="M">M</option>
                                <option value="L">L</option>
                                <option value="XL">XL</option>
                                <option value="XXL">XXL</option>
                            </select>
                        </div>

                        {/* Quantity & Add to Cart */}
                        <div className="quantity-section">
                            <div className="quantity-control">
                                <button className="qty-btn minus" onClick={() => setQuantity((q) => (q > 1 ? q - 1 : q))}>−</button>
                                <input type="text" value={quantity} readOnly />
                                <button className="qty-btn plus" onClick={() => setQuantity((q) => q + 1)}>+</button>
                            </div>
                            <button className="btn-add-cart" onClick={handleAddToCart}>
                                <ShoppingCart size={18} />
                                Add to Cart
                            </button>
                            <button
                                className={`btn-wishlist wishlist-btn${isWishlisted ? " active" : ""}`}
                                onClick={() => toggleWishlist(product._id)}
                            >
                                <Heart
                                    size={20}
                                    color={isWishlisted ? "#FF4858" : "#33A0FF"}
                                    fill={isWishlisted ? "#FF4858" : "none"}
                                />
                            </button>
                        </div>

                        {/* Share Section */}
                        <div className="share-section">
                            <button className="btn-share facebook" onClick={() => handleShare("facebook")}>
                                <img src={facebookIcon} alt="" />
                                Share on Facebook
                            </button>
                            <button className="btn-share twitter" onClick={() => handleShare("twitter")}>
                                <img src={twitterIcon} alt="" />
                                Share on Twitter
                            </button>
                        </div>
                    </div>

                    {/* Best Seller Box (Right Side) */}
                    <div className="best-seller-box" style={{ display: bestSeller ? undefined : "none" }}>
                        <div className="bs-label" style={{ color: "#aaa" }}>BEST SELLER</div>
                        {bestSeller && (
                            <div className="bs-product" onClick={() => navigate(`/product/${bestSeller._id}`)}>
                                <div className="bs-image">
                                    <span className="bs-badge">HOT</span>
                                    <img src={bestSeller.image} alt={bestSeller.name} />
                                </div>
                                <div className="bs-info">
                                    <h4>{bestSeller.name}</h4>
                                    <div className="bs-rating">★★★★☆</div>
                                    <div className="bs-price">
                                        <span className="new">${(bestSeller.price || 299.43).toFixed(2)}</span>
                                        <span className="old">${(bestSeller.price * 1.5 || 534.33).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ================= PRODUCT TABS ================= */}
            <section className="product-tabs">
                <div className="tabs-container">
                    <div className="tab-buttons">
                        <button
                            className={`tab-btn${activeTab === "description" ? " active" : ""}`}
                            onClick={() => setActiveTab("description")}
                        >
                            Product Information
                        </button>
                        <button
                            className={`tab-btn${activeTab === "reviews" ? " active" : ""}`}
                            onClick={() => setActiveTab("reviews")}
                        >
                            Reviews <span>{reviews.length}</span>
                        </button>
                        <button
                            className={`tab-btn${activeTab === "other" ? " active" : ""}`}
                            onClick={() => setActiveTab("other")}
                        >
                            Another tab
                        </button>
                    </div>

                    <div className="tab-contents">
                        <div className={`tab-content${activeTab === "description" ? " active" : ""}`}>
                            <p>{product.description || "No description available"}</p>
                        </div>

                        <div className={`tab-content${activeTab === "reviews" ? " active" : ""}`} id="reviews">
                            <form className="review-form" onSubmit={handleReviewSubmit}>
                                <h3>Submit a review</h3>
                                <div className="review-form-rating">
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <span
                                            key={value}
                                            className={`star${value <= selectedRating ? " active" : ""}`}
                                            onClick={() => setSelectedRating(value)}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                                <textarea
                                    placeholder="Share your thoughts about this product..."
                                    rows="4"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                                <button type="submit" className="btn-submit-review">Submit Review</button>
                            </form>

                            <div className="reviews-list">
                                {reviews.length === 0 ? (
                                    <p className="no-reviews">No reviews yet. Be the first to review this product!</p>
                                ) : (
                                    reviews.map((review, index) => (
                                        <div className="review-item" key={review._id || index}>
                                            <div className="review-header">
                                                <span className="review-author">{review.user?.name || "Anonymous"}</span>
                                                <span className="review-rating">{starString(review.rating)}</span>
                                            </div>
                                            <p className="review-text">{review.comment || ""}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className={`tab-content${activeTab === "other" ? " active" : ""}`}>
                            <p>Another tab content</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= RELATED PRODUCTS ================= */}
            <section className="related-products">
                <div className="related-container">
                    <h2>RELATED PRODUCTS</h2>
                    <div className="related-grid">
                        {related.map((p) => (
                            <div className="related-product-card" key={p._id} onClick={() => navigate(`/product/${p._id}`)}>
                                <div className="related-product-image">
                                    {p.stock ? <span className="related-product-badge">HOT</span> : null}
                                    <img src={p.image} alt={p.name} />
                                </div>
                                <div className="related-product-info">
                                    <h4>{p.name}</h4>
                                    <div className="related-product-rating">★★★★☆</div>
                                    <div className="related-product-price">
                                        <span className="new">${(p.price || 299.43).toFixed(2)}</span>
                                        <span className="old">${(p.price * 1.5 || 534.33).toFixed(2)}</span>
                                        <span className="discount">24% Off</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
