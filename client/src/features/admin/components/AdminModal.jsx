import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function AdminModal({ title, titleId, eyebrow, onClose, wide = false, children }) {
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
            className="admin-modal-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                className={`admin-modal-dialog${wide ? " admin-modal-dialog-wide" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <header className="admin-modal-header">
                    <div>
                        <span className="admin-modal-eyebrow">{eyebrow}</span>
                        <h2 id={titleId}>{title}</h2>
                    </div>
                    <button
                        type="button"
                        className="admin-modal-close"
                        aria-label="Đóng hộp thoại"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </header>
                {children}
            </section>
        </div>,
        document.body
    );
}
