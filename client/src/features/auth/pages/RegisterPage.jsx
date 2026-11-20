import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import userIcon from "../../../assets/img/User.png";
import messageIcon from "../../../assets/img/Message.png";
import passwordIcon from "../../../assets/img/Password.png";

export default function RegisterPage() {
    const { register } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        await register(name, email, password);
    };

    return (
        <div className="auth-page">
        <div className="register-container">
            <div>
                <span className="auth-brand-mark">SV</span>
                <h3>Let's Get Started</h3>
                <p>Create a new account</p>
            </div>

            <form onSubmit={handleSubmit} id="register-form">
                <div>
                    <img src={userIcon} alt="user" />
                    <input
                        type="text"
                        placeholder="Full Name"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div>
                    <img src={messageIcon} alt="email" />
                    <input
                        type="email"
                        placeholder="Your email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <img src={passwordIcon} alt="password" />
                    <input
                        type="password"
                        placeholder="Password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <img src={passwordIcon} alt="password" />
                    <input
                        type="password"
                        placeholder="Password Again"
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit">Sign Up</button>
            </form>

            <div className="sign-in">
                have a account?
                <Link to="/login">Sign In</Link>
            </div>

            <Link to="/" className="back-home">← Back to Home</Link>
        </div>
        </div>
    );
}
