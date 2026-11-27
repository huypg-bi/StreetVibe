// Kho thông báo popup dùng chung. Gọi toast.success(...) / toast.error(...) ở bất kỳ đâu;
// ToastContainer chịu trách nhiệm hiển thị.
export const TOAST_DURATION = 5000;

let toasts = [];
let nextId = 1;
const timers = new Map();
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());

export const subscribeToasts = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const getToasts = () => toasts;

export function dismissToast(id) {
    clearTimeout(timers.get(id));
    timers.delete(id);
    toasts = toasts.filter((item) => item.id !== id);
    emit();
}

function show(type, message) {
    if (!message) return;
    // Thông báo trùng đang hiển thị được thay mới thay vì xếp chồng
    const duplicate = toasts.find((item) => item.type === type && item.message === message);
    if (duplicate) dismissToast(duplicate.id);

    const id = nextId++;
    toasts = [...toasts, { id, type, message }];
    timers.set(id, setTimeout(() => dismissToast(id), TOAST_DURATION));
    emit();
}

export const toast = {
    success: (message) => show("success", message),
    error: (message) => show("error", message),
};

export const getErrorMessage = (error, fallback) =>
    error?.response?.data?.error?.message || error?.response?.data?.message || fallback;
