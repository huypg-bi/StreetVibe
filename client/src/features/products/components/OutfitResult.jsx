import { useState } from "react";
import { Link } from "react-router-dom";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { sendOutfitFeedback } from "../api/outfitApi";
import { toast } from "../../../shared/utils/toast";
import { formatVnd } from "../../../shared/utils/pricing";

const SLOT_LABELS = { top: "ÁO", bottom: "QUẦN", shoes: "GIÀY", socks: "TẤT", accessory: "PHỤ KIỆN" };

function OutfitFeedback({ traceId }) {
    const [vote, setVote] = useState(0);

    const send = async (value) => {
        const previous = vote;
        setVote(value);
        try {
            await sendOutfitFeedback(traceId, value);
        } catch (error) {
            console.error("Không thể gửi phản hồi:", error);
            setVote(previous);
            toast.error("Không thể gửi phản hồi. Vui lòng thử lại.");
        }
    };

    return (
        <div className="outfit-vote">
            <span>{vote ? "Cảm ơn bạn đã phản hồi." : "Bộ này có hợp ý bạn không?"}</span>
            <button type="button" aria-pressed={vote === 1} aria-label="Thích bộ này" onClick={() => send(1)}>
                <ThumbsUp size={14} /> THÍCH
            </button>
            <button type="button" aria-pressed={vote === -1} aria-label="Không thích bộ này" onClick={() => send(-1)}>
                <ThumbsDown size={14} /> KHÔNG THÍCH
            </button>
        </div>
    );
}

// Bộ đồ đã ghép: các món, tổng tiền, số tiền tiết kiệm và lời giải thích của AI
export default function OutfitResult({ result, adding, onBuy, onRetry }) {
    const { outfit, reason, source, notes } = result;
    const itemNotes = outfit.items.filter((item) => item.note);

    return (
        <div className="complete-fit-wrapper outfit-result">
            <div>
                <div className="bundle-items-row">
                    {outfit.items.map((item) => (
                        <Link key={item.variant_id} to={`/product/${item.product_id}`} className={`bundle-item-box${item.is_anchor ? " outfit-anchor" : ""}`}>
                            <span className="outfit-slot">{SLOT_LABELS[item.slot]}{item.is_anchor ? " // ĐANG XEM" : ""}</span>
                            <img src={item.image} alt={item.name} />
                            <h6>{item.name}</h6>
                            <span>{item.brand} &bull; {item.color} &bull; {item.size}</span>
                            <span className="outfit-price">
                                {item.on_sale && <s>{formatVnd(item.price)}</s>}
                                <b className={item.on_sale ? "sale" : ""}>{formatVnd(item.sale_price)}</b>
                            </span>
                        </Link>
                    ))}
                </div>

                {source !== "rule" && reason ? (
                    <p className="outfit-reason"><strong>AI STYLIST:</strong> {reason}</p>
                ) : (
                    <p className="outfit-reason"><strong>GỢI Ý THEO BỘ LỌC:</strong> AI đang bận nên chưa có lời nhận xét.</p>
                )}
                {source !== "rule" && result.trace_id && <OutfitFeedback key={result.trace_id} traceId={result.trace_id} />}
                {[...(notes || []), ...itemNotes.map((item) => `${item.name}: ${item.note}`)].map((note) => (
                    <p key={note} className="outfit-note">{note}</p>
                ))}
            </div>

            <div className="outfit-summary">
                <div>
                    <span className="mono-spec">[COMBO {outfit.items.length} MÓN]</span>
                    <div className="outfit-total">
                        {formatVnd(outfit.total)}{" "}
                        {outfit.savings > 0 && <s>{formatVnd(outfit.list_total)}</s>}
                    </div>
                    <span className="tag-badge alert">
                        {outfit.savings > 0 ? `TIẾT KIỆM ${formatVnd(outfit.savings)}` : "CHƯA CÓ MÓN GIẢM GIÁ"}
                    </span>
                </div>
                <div className="outfit-summary-actions">
                    <button type="button" className="btn-brutal-outline" onClick={onRetry}>ĐỔI LỰA CHỌN</button>
                    <button type="button" className="btn-brutal" disabled={adding} onClick={onBuy}>
                        {adding ? "ĐANG THÊM..." : "[MUA TRỌN BỘ FIT NGAY]"}
                    </button>
                </div>
            </div>
        </div>
    );
}
