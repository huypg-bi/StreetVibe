import { useEffect, useState } from "react";
import { getCategories } from "../api/productsApi";

export function useCategories() {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        let active = true;

        getCategories().then((data) => {
            if (active) setCategories(data);
        });

        return () => {
            active = false;
        };
    }, []);

    return categories;
}
