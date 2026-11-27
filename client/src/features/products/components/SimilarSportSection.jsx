import { useEffect, useState } from "react";
import { getProductsPage } from "../api/productsApi";
import AtelierProductCard from "./AtelierProductCard";
import "../styles/similarSportSection.css";

const MAX_ITEMS = 8;

// Gợi ý sản phẩm cùng môn thể thao với sản phẩm đang xem: cùng nhãn hàng xếp trước,
// còn chỗ thì bổ sung nhãn khác. Ẩn khi sản phẩm chưa gán môn hoặc không có gợi ý.
export default function SimilarSportSection({ product }) {
    const productId = product?.id;
    const sportId = product?.sport_id;
    const brand = product?.brand?.trim() || "";
    const [result, setResult] = useState({ productId: null, items: [] });

    useEffect(() => {
        if (!productId || !sportId) return undefined;

        let active = true;
        // Lấy dư 1 vì kết quả có thể chứa chính sản phẩm đang xem
        const params = { sport_id: sportId, limit: MAX_ITEMS + 1 };
        Promise.all([
            brand ? getProductsPage({ ...params, brand }) : { items: [] },
            getProductsPage(params),
        ])
            .then(([sameBrand, allBrands]) => {
                if (!active) return;
                const unique = new Map(
                    [...sameBrand.items, ...allBrands.items].map((item) => [item.id, item])
                );
                unique.delete(productId);
                setResult({ productId, items: Array.from(unique.values()).slice(0, MAX_ITEMS) });
            })
            // Khối gợi ý là phần phụ: lỗi thì ẩn đi, không làm phiền người đang xem sản phẩm
            .catch((error) => console.error("Lỗi khi tải sản phẩm cùng môn thể thao:", error));
        return () => { active = false; };
    }, [productId, sportId, brand]);

    // So khớp productId để không hiện gợi ý của sản phẩm trước đó
    if (!sportId || result.productId !== productId || result.items.length === 0) return null;

    const sportName = product.sport?.name || "";

    return (
        <section className="similar-sport-section">
            <div className="section-dossier-header">
                <div>
                    <span className="mono-spec similar-sport-tag">[SAME SPORT // {sportName.toUpperCase()}]</span>
                    <h2>SẢN PHẨM TƯƠNG TỰ // ĐỒ {sportName.toUpperCase()}</h2>
                </div>
                {brand && (
                    <div className="dossier-ref">
                        <span>ƯU TIÊN NHÃN {brand.toUpperCase()}</span>
                    </div>
                )}
            </div>

            <div className="atelier-product-grid">
                {result.items.map((item) => <AtelierProductCard key={item.id} product={item} />)}
            </div>
        </section>
    );
}
