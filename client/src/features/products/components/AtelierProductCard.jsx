import { Link } from "react-router-dom";
import DiscountTag from "../../../shared/components/DiscountTag";
import ProductPrice from "../../../shared/components/ProductPrice";
import SoldOutOverlay from "../../../shared/components/SoldOutOverlay";
import adidasLogo from "../../../assets/img/adidas.png";
import chanelLogo from "../../../assets/img/chanel.png";
import gucciLogo from "../../../assets/img/gucci.png";
import nikeLogo from "../../../assets/img/nike.png";
import pumaLogo from "../../../assets/img/puma.webp";
import skechersLogo from "../../../assets/img/skechers.png";

const brandLogos = {
    adidas: adidasLogo,
    chanel: chanelLogo,
    gucci: gucciLogo,
    nike: nikeLogo,
    puma: pumaLogo,
    skechers: skechersLogo,
};

export default function AtelierProductCard({ product }) {
    const id = product.id ?? product._id;
    const purchases = Number(product.sold_count || 0);
    const isHot = Boolean(product.is_hot);
    const brand = product.brand?.trim();
    const brandLogo = brand ? brandLogos[brand.toLowerCase()] : null;

    return (
        <article className="atelier-product-card">
            <div className="card-top-spec">
                <div className="card-badges">
                    <span className={`product-trending-badge${isHot ? " hot" : ""}`}>
                        [{isHot ? "HOT" : "NORMAL"}]
                    </span>
                    <DiscountTag product={product} />
                </div>
                {brandLogo && <img className="card-brand-logo" src={brandLogo} alt={`${brand} logo`} />}
            </div>

            <Link
                to={`/product/${id}`}
                className="card-image-link"
                aria-label={`Xem chi tiết ${product.name}`}
                tabIndex={id ? 0 : -1}
            >
                <div className="card-image-wrapper">
                    <img src={product.image} alt={product.name} />
                    {product.is_sold_out && <SoldOutOverlay />}
                </div>
            </Link>

            <div className="card-info-bottom">
                <h3 className="card-title">{product.name}</h3>
                <div className="card-meta-row">
                    <span>ĐÃ MUA: {purchases.toLocaleString("vi-VN")}</span>
                    <ProductPrice product={product} className="card-price" />
                </div>
            </div>
        </article>
    );
}
