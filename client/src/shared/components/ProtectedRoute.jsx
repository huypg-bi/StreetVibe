import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";

export default function ProtectedRoute({ allowedRoles, children }) {
    const { token, user } = useAuth();
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (!user) {
        return null;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
