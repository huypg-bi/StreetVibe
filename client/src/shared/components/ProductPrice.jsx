import { formatVnd, getEffectivePrice } from "../utils/pricing";
import "../styles/productPrice.css";

// Giá đang áp dụng; khi đang giảm thì giá mới màu cam kèm giá bán cũ gạch ngang
export default function ProductPrice({ product, className = "" }) {
    const onSale = Boolean(product?.is_on_sale);

    return (
        <span className={`product-price${onSale ? " on-sale" : ""} ${className}`.trim()}>
            {onSale && <s>{formatVnd(product.price)}</s>}
            <span className="product-price-current">{formatVnd(getEffectivePrice(product))}</span>
        </span>
    );
}
