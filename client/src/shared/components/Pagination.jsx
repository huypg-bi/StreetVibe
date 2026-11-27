import { ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/pagination.css";

export default function Pagination({ page, totalPages, onChange, disabled = false }) {
    if (totalPages <= 1) return null;

    return (
        <nav className="pagination-bar" aria-label="Phân trang">
            <button type="button" onClick={() => onChange(page - 1)} disabled={disabled || page <= 1}>
                <ChevronLeft size={14} /> Quay lại
            </button>
            <span>Trang {page} / {totalPages}</span>
            <button type="button" onClick={() => onChange(page + 1)} disabled={disabled || page >= totalPages}>
                Xem tiếp <ChevronRight size={14} />
            </button>
        </nav>
    );
}
