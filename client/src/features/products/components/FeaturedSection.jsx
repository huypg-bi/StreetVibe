import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFeatured } from "../api/productsApi";

export default function FeaturedSection() {
    const [featured, setFeatured] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        getFeatured().then((data) => {
            if (Array.isArray(data)) {
                setFeatured(data);
            } else {
                console.error("Featured data is not an array");
            }
        });
    }, []);

    return (
        <section className="fea-pro">
            {featured.map((fea) => (
                <div key={fea._id} className="pro-in4" onClick={() => navigate(`/product/${fea._id}`)}>
                    <img src={fea.image} alt={fea.name} />

                    <div>
                        <p>{fea.name}</p>
                        <div className="rating">★★★★☆</div>
                        <div className="cost">
                            <div className="cost1">${fea.price}</div>
                            <div className="cost2">${fea.originalPrice}</div>
                        </div>
                    </div>
                </div>
            ))}
        </section>
    );
}
