import { Outlet, useLocation } from "react-router-dom";
import Header from "../shared/components/Header";
import Footer from "../shared/components/Footer";
import ProfileSetupPrompt from "../features/auth/components/ProfileSetupPrompt";

export default function App() {
    const { pathname } = useLocation();

    return (
        <>
            <Header />
            <Outlet />
            {pathname === "/" && <Footer />}
            <ProfileSetupPrompt />
        </>
    );
}
