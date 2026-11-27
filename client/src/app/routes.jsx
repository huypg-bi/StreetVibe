import { Routes, Route } from "react-router-dom";
import App from "./App";
import HomePage from "../features/products/pages/HomePage";
import BestSellerPage from "../features/products/pages/BestSellerPage";
import CartPage from "../features/products/pages/CartPage";
import WishlistPage from "../features/products/pages/WishlistPage";
import ProductDetailPage from "../features/products/pages/ProductDetailPage";
import ContactPage from "../shared/components/ContactPage";
import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";
import AdminPage from "../features/admin/pages/AdminPage";
import SupplierPage from "../features/supplier/pages/SupplierPage";
import ProfilePage from "../features/auth/pages/ProfilePage";
import ProtectedRoute from "../shared/components/ProtectedRoute";

export default function AppRoutes() {
    return (
        <Routes>
            <Route element={<App />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/best-seller" element={<BestSellerPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute allowedRoles={["customer", "supplier", "admin"]}>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
            </Route>

            {/* Standalone pages: no shared Header/Footer, matching the original login/register/admin pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
                path="/admin/*"
                element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/supplier/*"
                element={
                    <ProtectedRoute allowedRoles={["supplier"]}>
                        <SupplierPage />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}
