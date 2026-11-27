import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import "../styles/imageLightbox.css";

export default function ImageLightbox({ images, index, alt, onChange, onClose }) {
    const total = images.length;

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!["Escape", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
            // Chặn ở capture phase để Esc chỉ đóng ảnh, không đóng luôn modal bên dưới
            event.stopPropagation();
            if (event.key === "Escape") onClose();
            else onChange((index + (event.key === "ArrowRight" ? 1 : -1) + total) % total);
        };

        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [index, total, onChange, onClose]);

    return createPortal(
        <div
            className="image-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Ảnh phóng to ${alt}`}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <button type="button" className="image-lightbox-button image-lightbox-close" aria-label="Đóng ảnh" onClick={onClose} autoFocus>
                <X size={20} />
            </button>
            <img className="image-lightbox-image" src={images[index]} alt={`${alt} ${index + 1}`} />
            {total > 1 && (
                <>
                    <button type="button" className="image-lightbox-button image-lightbox-prev" aria-label="Ảnh trước" onClick={() => onChange((index - 1 + total) % total)}>
                        <ChevronLeft size={22} />
                    </button>
                    <button type="button" className="image-lightbox-button image-lightbox-next" aria-label="Ảnh sau" onClick={() => onChange((index + 1) % total)}>
                        <ChevronRight size={22} />
                    </button>
                    <span className="image-lightbox-counter">{index + 1} / {total}</span>
                </>
            )}
        </div>,
        document.body
    );
}
