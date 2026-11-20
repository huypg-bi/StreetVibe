import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import messageIcon from "../../../assets/img/Message.png";
import passwordIcon from "../../../assets/img/Password.png";
import googleIcon from "../../../assets/img/Google.png";
import facebookIcon from "../../../assets/img/Facebook1.png";

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        await login(email, password);
    };

    return (
        <div className="auth-page">
        <div className="login-container">
            <div className="intro">
                <span className="auth-brand-mark">SV</span>
                <h3>Welcome to StreetVibe</h3>
                <p>Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} id="login-form">
                <div className="email-input">
                    <img src={messageIcon} alt="" />
                    <input
                        type="email"
                        placeholder="Your email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="pass-input">
                    <img src={passwordIcon} alt="" />
                    <input
                        type="password"
                        placeholder="Password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit">Sign In</button>
            </form>

            <div className="divider">OR</div>

            <button type="button"><img src={googleIcon} alt="gg-login" />Login with Google</button>
            <button type="button"><img src={facebookIcon} alt="fb-login" />Login with Facebook</button>

            <a href="#">Forgot Password?</a>

            <div className="register">
                Don't have a account?
                <Link to="/register">Register</Link>
            </div>

            <Link to="/" className="back-home">← Back to Home</Link>
        </div>
        </div>
    );
}
