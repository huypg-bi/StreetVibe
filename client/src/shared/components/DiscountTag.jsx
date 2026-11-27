import "../styles/productPrice.css";

export default function DiscountTag({ product }) {
    if (!product?.is_on_sale) return null;
    return <span className="discount-tag">-{product.discount_percent}%</span>;
}
