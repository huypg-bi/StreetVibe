import { useCallback, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { addToCart } from "../api/productsApi";
import OutfitModal from "./OutfitModal";
import OutfitResult from "./OutfitResult";
import { getErrorMessage, toast } from "../../../shared/utils/toast";
import "../styles/outfit.css";

// Khối "Complete The Fit": mở popup lựa chọn rồi hiện bộ đồ được ghép quanh sản phẩm đang xem.
// Đặt key theo sản phẩm ở nơi dùng để đổi sản phẩm thì kết quả cũ biến mất.
export default function CompleteFitSection({ product, anchorColorId, anchorShoeSize }) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [saved, setSaved] = useState(null); // { result, form }
    const [adding, setAdding] = useState(false);
    const close = useCallback(() => setOpen(false), []);

    if (!product) return null;

    const buyOutfit = async () => {
        if (!user) {
            toast.error("Vui lòng đăng nhập để thêm bộ đồ vào giỏ hàng.");
            return;
        }
        setAdding(true);
        const failed = [];
        // Thêm lần lượt để giỏ hàng cập nhật đúng thứ tự; món lỗi không chặn các món còn lại
        for (const item of saved.result.outfit.items) {
            try {
                await addToCart(item.product_id, item.variant_id, 1);
            } catch (error) {
                console.error("Không thể thêm món vào giỏ:", error);
                failed.push(`${item.name} (${getErrorMessage(error, "lỗi không xác định")})`);
            }
        }
        setAdding(false);
        if (failed.length === 0) toast.success("Đã thêm cả bộ vào giỏ hàng.");
        else toast.error(`Chưa thêm được: ${failed.join(", ")}`);
    };

    return (
        <section className="complete-fit-section">
            <div className="outfit-section-head">
                <div>
                    <span className="mono-spec outfit-kicker">[STYLE ALGORITHM // SYNERGY]</span>
                    <h3>COMPLETE THE FIT // SET PHỐI KHUYÊN DÙNG</h3>
                </div>
            </div>

            {saved ? (
                <OutfitResult result={saved.result} adding={adding} onBuy={buyOutfit} onRetry={() => setOpen(true)} />
            ) : (
                <div className="outfit-empty">
                    <p>Chọn nhãn hàng, kiểu giá và size, AI sẽ ghép áo, quần, giày hợp với sản phẩm bạn đang xem.</p>
                    <button type="button" className="btn-brutal" onClick={() => setOpen(true)}>
                        <Sparkles size={15} /> GHÉP OUTFIT VỚI AI
                    </button>
                </div>
            )}

            {open && (
                <OutfitModal
                    product={product}
                    user={user}
                    anchorColorId={anchorColorId}
                    anchorShoeSize={anchorShoeSize}
                    lastForm={saved?.form}
                    onResult={(result, form) => {
                        setSaved({ result, form });
                        setOpen(false);
                    }}
                    onClose={close}
                />
            )}
        </section>
    );
}
