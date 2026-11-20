import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";

export default function CategoryMegaMenu() {
    const categories = useCategories();

    return (
        <>
            <h4>Category</h4>
            {categories.map((c) => (
                <Link key={c._id} to={`/best-seller?category=${c.slug || c._id}`}>
                    {c.name}
                </Link>
            ))}
        </>
    );
}
