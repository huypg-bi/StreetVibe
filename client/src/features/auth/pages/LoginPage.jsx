import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import googleIcon from "../../../assets/img/Google.png";
import streetVibeLogo from "../../../assets/img/logo.png";
import "../styles/auth.css";

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        await login(email, password);
    };

    return (
        <main className="auth-screen">
            <div className="auth-shell">
                <header className="auth-topbar">
                    <div className="auth-brand-group">
                        <Link to="/" className="auth-wordmark" aria-label="StreetVibe home">
                            <img src={streetVibeLogo} alt="" className="auth-wordmark-logo" />
                            <span>STREETVIBE<span className="auth-wordmark-slash"> / ARCHIVE</span></span>
                        </Link>
                        <Link to="/" className="auth-back-link"><ArrowLeft size={13} /> BACK TO STORE</Link>
                    </div>
                    <span className="auth-topbar-ref">MEMBER ACCESS // 001</span>
                </header>

                <section className="auth-panel">
                    <aside className="auth-panel-intro">
                        <span className="auth-kicker">[ STREETVIBE // PRIVATE ACCESS ]</span>
                        <div>
                            <span className="auth-intro-index">01 — MEMBER PORTAL</span>
                            <h1>ACCESS<br />THE ARCHIVE.</h1>
                            <p>Đăng nhập để tiếp tục khám phá các thiết kế độc bản và quản lý đơn hàng của bạn.</p>
                        </div>
                        <div className="auth-intro-footer">
                            <span>SAIGON · TOKYO</span>
                            <span>EST. 2026</span>
                        </div>
                    </aside>

                    <div className="auth-form-panel">
                        <div className="auth-form-heading">
                            <span className="auth-kicker">[ ACCOUNT // SIGN IN ]</span>
                            <h2>ĐĂNG NHẬP</h2>
                            <p>Nhập thông tin tài khoản để tiếp tục.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="auth-form">
                            <label className="auth-field" htmlFor="login-email">
                                <span className="auth-field-label">EMAIL ADDRESS</span>
                                <span className="auth-input-wrap">
                                    <Mail size={17} aria-hidden="true" />
                                    <input
                                        type="email"
                                        id="login-email"
                                        placeholder="name@example.com"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </span>
                            </label>

                            <label className="auth-field" htmlFor="login-password">
                                <span className="auth-field-label">PASSWORD</span>
                                <span className="auth-input-wrap">
                                    <Lock size={17} aria-hidden="true" />
                                    <input
                                        type="password"
                                        id="login-password"
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </span>
                            </label>

                            <button type="submit" className="auth-submit">
                                [ SIGN IN TO YOUR ACCOUNT ]
                            </button>
                        </form>

                        <div className="auth-divider"><span>OR CONTINUE WITH</span></div>

                        <div className="auth-socials">
                            <button type="button" className="auth-social-button">
                                <img src={googleIcon} alt="" />
                                GOOGLE
                            </button>
                            <button type="button" className="auth-social-button">
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                                FACEBOOK
                            </button>
                        </div>

                        <div className="auth-form-footer">
                            <span>NEW TO STREETVIBE?</span>
                            <Link to="/register">CREATE ACCOUNT <span aria-hidden="true">→</span></Link>
                        </div>

                    </div>
                </section>
            </div>
        </main>
    );
}
