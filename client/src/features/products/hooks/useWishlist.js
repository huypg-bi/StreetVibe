import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { getWishlist, addWishlist, removeWishlist } from "../api/productsApi";

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
            alert("Vui lòng đăng nhập để dùng wishlist");
            navigate("/login");
            return;
        }

        if (wishlistIds.includes(id)) {
            await removeWishlist(id);
            setWishlistIds((prev) => prev.filter((item) => item !== id));
        } else {
            await addWishlist(id);
            setWishlistIds((prev) => [...prev, id]);
        }
    }, [token, wishlistIds, navigate]);

    return { wishlistIds, toggleWishlist };
}
