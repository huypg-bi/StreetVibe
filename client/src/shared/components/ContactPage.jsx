import { Link } from "react-router-dom";
import contactImg from "../../assets/img/contact_img.png";

export default function ContactPage() {
    return (
        <>
            {/* ================= BREADCRUMB ================= */}
            <section className="breadcrumb">
                <Link to="/">Home</Link>
                <span>/ Contact</span>
            </section>

            {/* ================= CONTAC-BOX ================= */}
            <section className="contact-section">
                <div className="contact-container">

                    <div className="contact-info-card">
                        <img src={contactImg} alt="" className="bg-icon" />
                        <div className="info-content">
                            <h3>Get in touch</h3>
                            <div className="info-item">
                                <p>contact@streetvibe.com</p>
                            </div>
                            <div className="info-item">
                                <p>+234 4556 6665 34</p>
                            </div>
                            <div className="info-item">
                                <p>20 Harvard Street, <br /> Musin, Lagos, Nigeria</p>
                            </div>
                        </div>
                    </div>

                    <form className="contact-form">
                        <div className="input-group">
                            <label>Full Name</label>
                            <input type="text" placeholder="James Doe" />
                        </div>
                        <div className="input-group">
                            <label>Email</label>
                            <input type="email" placeholder="jamesdoe@gmail.com" />
                        </div>
                        <div className="input-group">
                            <label>Message</label>
                            <textarea placeholder="Type your message here..." />
                        </div>
                    </form>

                </div>
            </section>

        </>
    );
}
