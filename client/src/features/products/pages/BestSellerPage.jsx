import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";
import { getBestSellerByCategory } from "../api/productsApi";
import shoesImg from "../../../assets/img/shoes-shoe-png-transparent-shoe-images-pluspng-17 1.png";

export default function BestSellerPage() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        getBestSellerByCategory().then((data) => {
            if (Array.isArray(data)) {
                setProducts(data);
            } else {
                console.error("Not array:", data);
            }
        });
    }, []);

    return (
        <main>
            {/* ================= BREADCRUMB ================= */}
            <section className="breadcrumb">
                <Link to="/">Home</Link>
                <span>/ Best Seller</span>
            </section>

            {/* ================= PRODUCTS WITH FILTER ================= */}
            <section className="products-section">
                <div className="container">

                    {/* Filter Sidebar */}
                    <aside className="filter-sidebar">
                        <div className="filter-group">
                            <h3>Hot Deals</h3>
                            <ul>
                                <li><a href="#">Hot Deals</a></li>
                                <li><a href="#">Nike</a> <span>2</span></li>
                                <li><a href="#">Airmax</a> <span>48</span></li>
                                <li><a href="#">Nike</a> <span>34</span></li>
                                <li><a href="#">Adidas</a> <span>15</span></li>
                                <li><a href="#">Vans</a> <span>23</span></li>
                                <li><a href="#">All Strom</a> <span>1</span></li>
                                <li><a href="#">Adidas</a> <span>95</span></li>
                            </ul>
                        </div>

                        <div className="filter-group">
                            <h3>PRICES</h3>
                            <div className="price-range">
                                <span>Ranger:</span>
                                <span className="price-input">$13.99 - $25.99</span>
                                <div className="range-slider"></div>
                            </div>
                        </div>

                        <div className="filter-group">
                            <h3>COLOR</h3>
                            <div className="color-options">
                                <button className="color-btn" style={{ backgroundColor: "#3B82F6" }}></button>
                                <button className="color-btn" style={{ backgroundColor: "#EF4444" }}></button>
                                <button className="color-btn" style={{ backgroundColor: "#000000" }}></button>
                                <button className="color-btn" style={{ backgroundColor: "#FBBF24" }}></button>
                                <button className="color-btn" style={{ backgroundColor: "#EC4899" }}></button>
                                <button className="color-btn" style={{ backgroundColor: "#F3E8FF" }}></button>
                            </div>
                        </div>

                        <div className="filter-group">
                            <h3>BRAND</h3>
                            <ul>
                                <li><a href="#">Nike</a> <span>99</span></li>
                                <li><a href="#">Nike</a> <span>99</span></li>
                                <li><a href="#">Adidas</a> <span>90</span></li>
                                <li><a href="#">Siemens</a> <span>99</span></li>
                            </ul>
                        </div>

                        <button className="more-btn">MORE</button>
                    </aside>

                    {/* Products Grid */}
                    <div className="products-content">

                        <div className="promo-banner">
                            <div className="promo-wrapper">
                                <div className="promo-text">
                                    <h2>Adidas Men Running Sneakers</h2>
                                    <p>Performance and design. Taken right to the edge.</p>
                                    <a href="#" className="shop-btn">SHOP NOW</a>
                                </div>
                                <div className="promo-img">
                                    <img src={shoesImg} alt="Adidas sneaker" />
                                </div>
                            </div>
                        </div>

                        <div className="products-header">
                            <span>13 Items</span>
                            <div className="products-controls">
                                <label>Sort By <select>
                                    <option>None</option>
                                    <option>Price: Low to High</option>
                                    <option>Price: High to Low</option>
                                </select></label>
                                <label>Show <select>
                                    <option>12</option>
                                    <option>24</option>
                                    <option>36</option>
                                </select></label>
                            </div>
                        </div>

                        <ProductGrid products={products} />

                        {/* Pagination */}
                        <div className="pagination">
                            <a href="#">1</a>
                            <a href="#">2</a>
                            <a href="#" className="active">3</a>
                            <a href="#">4</a>
                            <a href="#">5</a>
                        </div>
                    </div>

                </div>
            </section>
        </main>
    );
}
