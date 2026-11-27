import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../features/auth/store/authStore";
import ToastContainer from "../shared/components/ToastContainer";

export default function AppProviders({ children }) {
    return (
        <BrowserRouter>
            <AuthProvider>{children}</AuthProvider>
            <ToastContainer />
        </BrowserRouter>
    );
}
