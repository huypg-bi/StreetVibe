import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { getWishlist, addWishlist, removeWishlist } from "../api/productsApi";
import { getErrorMessage, toast } from "../../../shared/utils/toast";

export function useWishlist() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [wishlistIds, setWishlistIds] = useState([]);

    useEffect(() => {
        let active = true;

        async function load() {
            if (!token) {
                setWishlistIds([]);
                return;
            }

            const data = await getWishlist();
            const products = data?.result?.products || [];

            if (active) setWishlistIds(products.map((item) => item._id));
        }

        load();

        return () => {
            active = false;
        };
    }, [token]);

    const toggleWishlist = useCallback(async (id) => {
        if (!token) {
            toast.error("Vui lòng đăng nhập để dùng wishlist");
            navigate("/login");
            return;
        }

        try {
            if (wishlistIds.includes(id)) {
                await removeWishlist(id);
                setWishlistIds((prev) => prev.filter((item) => item !== id));
                toast.success("Đã xóa khỏi wishlist.");
            } else {
                await addWishlist(id);
                setWishlistIds((prev) => [...prev, id]);
                toast.success("Đã thêm vào wishlist.");
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật wishlist:", error);
            toast.error(getErrorMessage(error, "Không thể cập nhật wishlist."));
        }
    }, [token, wishlistIds, navigate]);

    return { wishlistIds, toggleWishlist };
}
