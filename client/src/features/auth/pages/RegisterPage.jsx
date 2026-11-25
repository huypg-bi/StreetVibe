import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, Mail, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import streetVibeLogo from "../../../assets/img/logo.png";
import "../styles/auth.css";

export default function RegisterPage() {
    const { register } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [supplierRequest, setSupplierRequest] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert("Mật khẩu xác nhận không khớp!");
            return;
        }
        await register(name, email, password, supplierRequest);
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
                    <span className="auth-topbar-ref">MEMBER ACCESS // 002</span>
                </header>

                <section className="auth-panel">
                    <aside className="auth-panel-intro">
                        <span className="auth-kicker">[ STREETVIBE // JOIN THE ARCHIVE ]</span>
                        <div>
                            <span className="auth-intro-index">02 — NEW MEMBERS</span>
                            <h1>MAKE IT<br />YOURS.</h1>
                            <p>Tạo tài khoản để lưu lại lựa chọn của bạn và nhận thông tin về những đợt phát hành mới.</p>
                        </div>
                        <div className="auth-intro-footer">
                            <span>LIMITED RELEASES</span>
                            <span>EST. 2026</span>
                        </div>
                    </aside>

                    <div className="auth-form-panel">
                        <div className="auth-form-heading">
                            <span className="auth-kicker">[ ACCOUNT // CREATE ]</span>
                            <h2>TẠO TÀI KHOẢN</h2>
                            <p>Điền thông tin để gia nhập StreetVibe.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="auth-form">
                            <label className="auth-field" htmlFor="register-name">
                                <span className="auth-field-label">FULL NAME</span>
                                <span className="auth-input-wrap">
                                    <User size={17} aria-hidden="true" />
                                    <input
                                        type="text"
                                        id="register-name"
                                        placeholder="Your name"
                                        autoComplete="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </span>
                            </label>

                            <label className="auth-field" htmlFor="register-email">
                                <span className="auth-field-label">EMAIL ADDRESS</span>
                                <span className="auth-input-wrap">
                                    <Mail size={17} aria-hidden="true" />
                                    <input
                                        type="email"
                                        id="register-email"
                                        placeholder="name@example.com"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </span>
                            </label>

                            <label className="auth-field" htmlFor="register-password">
                                <span className="auth-field-label">PASSWORD</span>
                                <span className="auth-input-wrap">
                                    <Lock size={17} aria-hidden="true" />
                                    <input
                                        type="password"
                                        id="register-password"
                                        placeholder="Create a password"
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </span>
                            </label>

                            <label className="auth-field" htmlFor="register-confirm-password">
                                <span className="auth-field-label">CONFIRM PASSWORD</span>
                                <span className="auth-input-wrap">
                                    <Lock size={17} aria-hidden="true" />
                                    <input
                                        type="password"
                                        id="register-confirm-password"
                                        placeholder="Enter your password again"
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </span>
                            </label>

                            <label className={`supplier-register-option${supplierRequest ? " selected" : ""}`}>
                                <input
                                    type="checkbox"
                                    checked={supplierRequest}
                                    onChange={(event) => setSupplierRequest(event.target.checked)}
                                />
                                <span>
                                    <strong>ĐĂNG KÝ VỚI TƯ CÁCH NHÀ CUNG CẤP (SUPPLIER)</strong>
                                    <small>Tài khoản vẫn hoạt động như thành viên trong thời gian chờ Admin duyệt.</small>
                                </span>
                            </label>

                            <button type="submit" className="auth-submit">
                                [ CREATE YOUR ACCOUNT ]
                            </button>
                        </form>

                        <div className="auth-form-footer">
                            <span>ALREADY A MEMBER?</span>
                            <Link to="/login">SIGN IN <span aria-hidden="true">→</span></Link>
                        </div>

                    </div>
                </section>
            </div>
        </main>
    );
}
