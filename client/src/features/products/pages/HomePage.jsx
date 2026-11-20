import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Headphones, RotateCcw, Truck } from "lucide-react";
import ProductGrid from "../components/ProductGrid";
import FeaturedSection from "../components/FeaturedSection";
import { getProducts } from "../api/productsApi";
import promotionImg from "../../../assets/img/Promotion Image.png";
import product1Img from "../../../assets/img/image Product 1.png";
import product2Img from "../../../assets/img/image Product 2.png";
import shoesImg from "../../../assets/img/shoes-shoe-png-transparent-shoe-images-pluspng-17 1.png";
import nikeLogo from "../../../assets/img/Nike_logo_emblem_logotype 1.png";
import figmaLogo from "../../../assets/img/figma-1-logo 1.png";
import kronosLogo from "../../../assets/img/kronos-logo-1-1 1.png";

export default function HomePage() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        getProducts().then(setProducts);
    }, []);

    return (
        <main className="home-page">
            <section className="hero">
                <img className="hero-backdrop" src={promotionImg} alt="" />
                <div className="hero-shade" />
                <div className="hero-content">
                    <p className="eyebrow"><span /> The city is your runway</p>
                    <h1>Make room<br />for <em>new moves.</em></h1>
                    <p className="hero-copy">Fresh silhouettes. Everyday icons. Pieces that take you wherever the day goes.</p>
                    <Link className="button button-lime" to="/best-seller">Shop the new drop <ArrowRight size={17} /></Link>
                    <div className="hero-note"><strong>01 / 03</strong><span>Streetwear, redefined</span></div>
                </div>
                <div className="hero-product"><img src={shoesImg} alt="Color-block StreetVibe sneaker" /></div>
                <span className="hero-stamp">MOVE<br />YOUR<br />WAY</span>
            </section>

            <section className="brand-strip" aria-label="Featured labels">
                <span>IN THE ROTATION</span>
                <img src={nikeLogo} alt="Nike" />
                <img src={figmaLogo} alt="Figma" />
                <img src={kronosLogo} alt="Kronos" />
                <span>CURATED FOR EVERY DAY</span>
            </section>

            <section className="category-feature section-wrap">
                <div className="section-heading">
                    <div><p className="eyebrow">Find your next favorite</p><h2>Built for your <em>everyday.</em></h2></div>
                    <Link className="text-link" to="/best-seller">Shop all categories <ArrowUpRight size={17} /></Link>
                </div>
                <div className="category-grid">
                    <Link className="category-tile category-tile-large" to="/best-seller">
                        <img src={product2Img} alt="StreetVibe sneakers" />
                        <span className="category-index">01 / FOOTWEAR</span>
                        <span className="category-caption"><strong>Step out.</strong><span>Find your pace <ArrowRight size={17} /></span></span>
                    </Link>
                    <Link className="category-tile" to="/best-seller">
                        <img src={product1Img} alt="Quilted crossbody bag" />
                        <span className="category-index">02 / ACCESSORIES</span>
                        <span className="category-caption"><strong>Carry less.<br />Live more.</strong><span>Explore bags <ArrowRight size={17} /></span></span>
                    </Link>
                    <Link className="category-tile category-tile-accent" to="/best-seller">
                        <span className="category-index">03 / THE STREET EDIT</span>
                        <span className="category-caption"><strong>Small details.<br />Big energy.</strong><span>Shop the edit <ArrowRight size={17} /></span></span>
                        <div className="accent-orbit">SV</div>
                    </Link>
                </div>
            </section>

            <section className="collection-section section-wrap">
                <div className="section-heading">
                    <div><p className="eyebrow">The people have spoken</p><h2>Most wanted<span className="lime-dot">.</span></h2></div>
                    <Link className="text-link" to="/best-seller">View the collection <ArrowUpRight size={17} /></Link>
                </div>
                <ProductGrid products={products.slice(0, 8)} />
            </section>

            <section className="campaign">
                <div className="campaign-copy">
                    <p className="eyebrow">StreetVibe / Field notes 01</p>
                    <h2>Good things<br />happen <em>outside.</em></h2>
                    <p>Meet the pair made for the long way home. Responsive comfort, all-day attitude.</p>
                    <Link className="button button-light" to="/best-seller">Meet your new pair <ArrowRight size={17} /></Link>
                </div>
                <div className="campaign-visual"><span>PACE<br />YOURSELF</span><img src={shoesImg} alt="StreetVibe everyday sneaker" /></div>
            </section>

            <section className="service-row section-wrap">
                <div><Truck size={23} /><span><strong>Free shipping</strong><small>On orders over $100</small></span></div>
                <div><RotateCcw size={23} /><span><strong>Easy returns</strong><small>30 days to find your fit</small></span></div>
                <div><Headphones size={23} /><span><strong>Here to help</strong><small>Real humans, always</small></span></div>
            </section>

            <section className="featured-section section-wrap">
                <div className="section-heading">
                    <div><p className="eyebrow">A few good things</p><h2>Worth a closer look.</h2></div>
                </div>
                <FeaturedSection />
            </section>
        </main>
    );
}
