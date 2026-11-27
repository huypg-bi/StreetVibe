import { useState } from "react";
import Pagination from "./Pagination";
import { PAGE_SIZE, getTotalPages } from "../utils/pagination";

// Phân trang phía client cho danh sách đã tải đủ.
// Đổi resetKey (từ khóa tìm kiếm, bộ lọc...) sẽ đưa về trang 1.
export default function PaginatedList({ items, resetKey = "", children }) {
    const [state, setState] = useState({ resetKey, page: 1 });

    if (state.resetKey !== resetKey) {
        setState({ resetKey, page: 1 });
    }

    const totalPages = getTotalPages(items.length);
    const page = Math.min(state.page, totalPages);
    const start = (page - 1) * PAGE_SIZE;

    return (
        <>
            {children(items.slice(start, start + PAGE_SIZE))}
            <Pagination
                page={page}
                totalPages={totalPages}
                onChange={(nextPage) => setState({ resetKey, page: nextPage })}
            />
        </>
    );
}
