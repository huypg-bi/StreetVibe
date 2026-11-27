import { useSyncExternalStore } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { dismissToast, getToasts, subscribeToasts } from "../utils/toast";
import "../styles/toast.css";

export default function ToastContainer() {
    const toasts = useSyncExternalStore(subscribeToasts, getToasts);

    return (
        <div className="toast-stack" aria-live="polite">
            {toasts.map((item) => (
                <div
                    key={item.id}
                    className={`toast-item ${item.type}`}
                    role={item.type === "error" ? "alert" : "status"}
                >
                    {item.type === "error" ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
                    <span>{item.message}</span>
                    <button type="button" aria-label="Đóng thông báo" onClick={() => dismissToast(item.id)}>
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
