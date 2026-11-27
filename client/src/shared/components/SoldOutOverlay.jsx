import "../styles/soldOut.css";

// Lớp phủ "sold out" trên ảnh sản phẩm. Phần tử cha phải có position: relative.
export default function SoldOutOverlay({ compact = false }) {
    return (
        <span className={`sold-out-overlay${compact ? " compact" : ""}`}>
            <span>sold out</span>
        </span>
    );
}
