import ProductCard from "./ProductCard";
import { useWishlist } from "../hooks/useWishlist";

export default function ProductGrid({ products }) {
    const { wishlistIds, toggleWishlist } = useWishlist();

    if (!Array.isArray(products)) {
        console.error("Not array:", products);
        return null;
    }

    return (
        <div className="product-grid">
            {products.map((product) => {
                // the best-seller endpoint returns `id` instead of `_id` unlike every other endpoint
                const id = product._id ?? product.id;
                return (
                    <ProductCard
                        key={id}
                        product={product}
                        isWishlisted={wishlistIds.includes(id)}
                        onToggleWishlist={toggleWishlist}
                    />
                );
            })}
        </div>
    );
}
