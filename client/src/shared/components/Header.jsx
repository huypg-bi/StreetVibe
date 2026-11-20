import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { ChevronDown, User, ShoppingCart, Heart, Search, Menu, X, ArrowUpRight } from "lucide-react";

export default function Header() {
    const { token, user, logout } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        function handleOutsideClick() {
            setDropdownOpen(false);
        }

        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, []);

    return (
        <header className="site-header">
            <div className="announcement">
                <span>Complimentary shipping on orders over $100</span>
                <Link to="/best-seller">Explore the latest drop <ArrowUpRight size={14} /></Link>
            </div>
            <div className="header-main">
                <button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((open) => !open)}>
                    {menuOpen ? <X size={21} /> : <Menu size={21} />}
                </button>
                <Link to="/" className="brand-lockup" aria-label="StreetVibe home">
                    <span className="brand-mark">SV</span>
                    <span>Street<span>Vibe</span></span>
                </Link>
                <nav className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
                    <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
                    <Link to="/best-seller" onClick={() => setMenuOpen(false)}>New arrivals</Link>
                    <Link to="/best-seller" onClick={() => setMenuOpen(false)}>Sneakers</Link>
                    <Link to="/best-seller" onClick={() => setMenuOpen(false)}>Accessories</Link>
                    <Link to="/contact" onClick={() => setMenuOpen(false)}>Our story</Link>
                </nav>
                <div className="header-actions">
                    <button className="header-icon search-action" type="button" aria-label="Search"><Search size={19} /></button>
                    <div className={`profile-menu${dropdownOpen ? " open" : ""}`} onClick={(e) => { e.stopPropagation(); setDropdownOpen((open) => !open); }}>
                        <button className="header-icon profile-trigger" type="button" aria-label="Profile">
                            <User size={19} /><ChevronDown size={13} />
                        </button>
                        <div className="profile-dropdown">
                            <span>{token ? (user?.name ?? "My account") : "Welcome"}</span>
                            <Link to="/login">{token ? "My profile" : "Sign in"}</Link>
                            {token && <button type="button" onClick={() => logout()}>Sign out</button>}
                        </div>
                    </div>
                    <Link className="header-icon" to="/wishlist" aria-label="Wishlist"><Heart size={19} /></Link>
                    <Link className="header-icon" to="/cart" aria-label="Shopping bag"><ShoppingCart size={19} /></Link>
                </div>
            </div>
        </header>
    );
}
