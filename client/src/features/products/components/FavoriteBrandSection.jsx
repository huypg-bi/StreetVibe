import { useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { getTrendingProducts } from "../api/productsApi";
import AtelierProductCard from "./AtelierProductCard";
import { toast } from "../../../shared/utils/toast";

// Top sản phẩm của nhãn hàng người dùng chọn trong hồ sơ, xếp hạng giống Trending Drops.
// Ẩn hoàn toàn khi chưa đăng nhập, chưa chọn nhãn hoặc nhãn chưa có sản phẩm.
export default function FavoriteBrandSection() {
    const { user } = useAuth();
    const brand = user?.favorite_brands?.[0]?.trim() || "";
    const [result, setResult] = useState({ brand: "", products: [] });

    useEffect(() => {
        if (!brand) return undefined;

        let active = true;
        getTrendingProducts(4, brand)
            .then((products) => {
                if (active) setResult({ brand, products });
            })
            .catch((error) => {
                console.error("Lỗi khi tải sản phẩm theo nhãn hàng:", error);
                if (active) toast.error(`Không thể tải sản phẩm của ${brand}. Vui lòng thử lại sau.`);
            });
        return () => { active = false; };
    }, [brand]);

    // So khớp brand để không hiện dữ liệu của nhãn cũ
    if (!brand || result.brand !== brand || result.products.length === 0) return null;

    return (
        <>
            <section className="section-dossier-header">
                <div>
                    <span className="mono-spec" style={{ color: "#d32f2f" }}>[FOR YOU // FAVORITE BRAND]</span>
                    <h2>YOUR TASTE // TOP {brand.toUpperCase()} BEST SELLER</h2>
                </div>
                <div className="dossier-ref">
                    <span>RANKED BY CART ADDS + PURCHASES</span>
                </div>
            </section>

            <section className="atelier-product-grid">
                {result.products.map((product) => <AtelierProductCard key={product.id} product={product} />)}
            </section>
        </>
    );
}
