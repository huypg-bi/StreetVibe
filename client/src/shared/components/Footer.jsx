import { Link } from "react-router-dom";
import facebookIcon from "../../assets/img/facebook.png";
import twitterIcon from "../../assets/img/twitter.png";
import westernUnionIcon from "../../assets/img/Western-union.png";
import masterIcon from "../../assets/img/Group 19.png";
import paypalIcon from "../../assets/img/Paypal.png";
import visaIcon from "../../assets/img/visa-logo.jpg";

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-main">
                <div className="footer-brand">
                    <Link to="/" className="brand-lockup">
                        <span className="brand-mark">SV</span>
                        <span>Street<span>Vibe</span></span>
                    </Link>
                    <p>Good style moves with you. Discover everyday essentials and statement pieces made for the streets.</p>
                    <div className="social-links">
                        <a href="https://facebook.com" aria-label="Facebook"><img src={facebookIcon} alt="" /></a>
                        <a href="https://twitter.com" aria-label="Twitter"><img src={twitterIcon} alt="" /></a>
                    </div>
                </div>
                <div className="footer-links">
                    <div>
                        <h3>Explore</h3>
                        <Link to="/best-seller">New arrivals</Link>
                        <Link to="/best-seller">Sneakers</Link>
                        <Link to="/best-seller">Accessories</Link>
                    </div>
                    <div>
                        <h3>Customer care</h3>
                        <Link to="/contact">Contact us</Link>
                        <Link to="/contact">Shipping &amp; returns</Link>
                        <Link to="/contact">FAQs</Link>
                    </div>
                    <div>
                        <h3>Get in touch</h3>
                        <a href="mailto:contact@streetvibe.com">contact@streetvibe.com</a>
                        <span>Mon–Fri, 9am–6pm</span>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <p>© {new Date().getFullYear()} StreetVibe. All rights reserved.</p>
                <div className="payment-methods">
                    <img src={westernUnionIcon} alt="Western Union" />
                    <img src={masterIcon} alt="Mastercard" />
                    <img src={paypalIcon} alt="PayPal" />
                    <img src={visaIcon} alt="Visa" />
                </div>
                <span>Made for moving.</span>
            </div>
        </footer>
    );
}
