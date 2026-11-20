import { useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import ProductsPanel from "../components/ProductsPanel";
import CategoriesPanel from "../components/CategoriesPanel";
import { LogOut } from "lucide-react";
import "../admin.css";

export default function AdminPage() {
    const { logout } = useAuth();
    const [activePage, setActivePage] = useState(null); // null | "products" | "categories"

    const breadcrumbLabel = activePage === "products"
        ? "Products"
        : activePage === "categories"
            ? "Categories"
            : "Dashboard";

    return (
        <div className="admin-wrapper">

            {/* ================ SIDEBAR ================ */}
            <aside className="admin-sidebar">

                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="logo-icon">
                        <span>SV</span>
                    </div>
                    <div className="logo-text">Street<span>Vibe</span></div>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <p className="nav-section-title">Main</p>

                        <p className={`nav-item${activePage === null ? " active" : ""}`}>
                            Dashboard
                        </p>

                        <a
                            className="nav-item"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setActivePage("categories");
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                                stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                            </svg>
                            Categories
                        </a>

                        <a
                            className="nav-item"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setActivePage("products");
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                                stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            Products
                        </a>

                        <div className="nav-section">
                            <p className="nav-section-title">Settings</p>

                            <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="3" />
                                        <path
                                            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                                    </svg>
                                </span>
                                Settings
                            </a>

                            <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                </span>
                                Help &amp; Support
                            </a>
                        </div>
                    </div>
                </nav>
            </aside>

            {/* ================ MAIN ================ */}
            <main className="admin-main">

                {/* Topbar */}
                <header className="admin-topbar">
                    <div className="topbar-left">
                        <div className="page-breadcrumb">
                            <span>Pages</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                            <span className="breadcrumb-current">{breadcrumbLabel}</span>
                        </div>
                    </div>

                    <div className="topbar-right">
                        <span>Admin</span>
                        <button
                            id="logoutBtn"
                            className="logout-btn"
                            title="Logout"
                            onClick={() => logout("/login")}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="admin-content">
                    {activePage === "products" && <ProductsPanel />}
                    {activePage === "categories" && <CategoriesPanel />}
                </div>
            </main>
        </div>
    );
}
