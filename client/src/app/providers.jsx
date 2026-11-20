import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../features/auth/store/authStore";

export default function AppProviders({ children }) {
    return (
        <BrowserRouter>
            <AuthProvider>{children}</AuthProvider>
        </BrowserRouter>
    );
}
