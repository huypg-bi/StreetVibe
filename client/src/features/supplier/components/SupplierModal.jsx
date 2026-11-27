import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function SupplierModal({ title, eyebrow, onClose, wide = false, children }) {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    return createPortal(
        <div
            className="supplier-modal-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section className={`supplier-modal${wide ? " supplier-modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
                <header className="supplier-modal-header">
                    <div>
                        <span>{eyebrow}</span>
                        <h2>{title}</h2>
                    </div>
                    <button type="button" aria-label="Đóng hộp thoại" onClick={onClose}>
                        <X size={18} />
                    </button>
                </header>
                {children}
            </section>
        </div>,
        document.body
    );
}
