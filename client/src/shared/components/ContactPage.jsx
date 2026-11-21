import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export default function ContactPage() {
    return (
        <>
            {/* ================= BREADCRUMB ================= */}
            <section className="breadcrumb">
                <Link to="/">Home</Link>
                <span>/ Contact</span>
            </section>

            {/* ================= CONTACT-BOX ================= */}
            <section className="contact-section">
                <div className="contact-container">
                    <div className="contact-info-card">
                        <div className="info-content">
                            <h3>Get in touch</h3>
                            <div className="info-item" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <Mail size={16} color="#d7ff3f" />
                                <p style={{ margin: 0 }}>contact@streetvibe.com</p>
                            </div>
                            <div className="info-item" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <Phone size={16} color="#d7ff3f" />
                                <p style={{ margin: 0 }}>+84 987 654 321</p>
                            </div>
                            <div className="info-item" style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                <MapPin size={16} color="#d7ff3f" style={{ marginTop: "3px" }} />
                                <p style={{ margin: 0 }}>StreetVibe Store, District 1, Ho Chi Minh City</p>
                            </div>
                        </div>
                    </div>

                    <form className="contact-form" onSubmit={(e) => { e.preventDefault(); alert("Cảm ơn bạn đã gửi tin nhắn!"); }}>
                        <div className="input-group">
                            <label>Full Name</label>
                            <input type="text" placeholder="Nguyễn Văn A" required />
                        </div>
                        <div className="input-group">
                            <label>Email</label>
                            <input type="email" placeholder="email@example.com" required />
                        </div>
                        <div className="input-group">
                            <label>Message</label>
                            <textarea placeholder="Nội dung tin nhắn..." required />
                        </div>
                        <button type="submit" className="button button-lime" style={{ marginTop: "12px", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <Send size={16} /> Gửi tin nhắn
                        </button>
                    </form>
                </div>
            </section>
        </>
    );
}
