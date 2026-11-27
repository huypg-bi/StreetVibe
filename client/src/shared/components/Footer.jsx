import { Link } from "react-router-dom";
import "../../features/products/styles/atelierBrutal.css";
import { toast } from "../utils/toast";

export default function Footer() {
    return (
        <footer className="atelier-footer">
            {/* Early Access Drop Box */}
            <div className="footer-early-access">
                <div>
                    <span className="mono-spec" style={{ color: "#888" }}>[DISPATCH PROTOCOL // VIP PASS]</span>
                    <h3 style={{ marginTop: "6px" }}>15-MINUTE EARLY DROP ACCESS</h3>
                    <p>Nhận mã truy cập sớm vào kho lưu trữ trước mỗi đợt mở bán công khai. Số lượng giới hạn theo từng đợt sản xuất.</p>
                </div>
                <form className="early-access-form" onSubmit={(e) => { e.preventDefault(); toast.success("VIP PASS GRANTED. Kiểm tra hòm thư của bạn!"); }}>
                    <input type="email" placeholder="ENTER YOUR EMAIL FOR VIP PASS..." required />
                    <button type="submit" className="btn-brutal">
                        [ĐĂNG KÝ NGAY]
                    </button>
                </form>
            </div>

            {/* System Columns */}
            <div className="footer-system-grid">
                <div className="footer-col">
                    <h5>[BRAND PURPOSE // ARCHIVE]</h5>
                    <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.6, maxWidth: "320px" }}>
                        STREETVIBE ATELIER nghiên cứu và chế tác thời trang đường phố kỹ thuật cao. Tôn vinh vẻ đẹp thô ráp của kết cấu bê tông, vải dệt trọng lượng nặng và phụ kiện titanium bền bỉ.
                    </p>
                </div>

                <div className="footer-col">
                    <h5>[OPERATIONS // LOGISTICS]</h5>
                    <ul>
                        <li><Link to="/best-seller">NEW RELEASES // DROP 007</Link></li>
                        <li><Link to="/best-seller">FABRIC MATRIX &amp; GSM GUIDE</Link></li>
                        <li><Link to="/contact">AUTHENTICITY &amp; NFC SCAN</Link></li>
                        <li><Link to="/contact">WARRANTY // REPAIR ATELIER</Link></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h5>[LEGAL &amp; COMPLIANCE]</h5>
                    <ul>
                        <li><Link to="/contact">PRIVACY ARCHIVE</Link></li>
                        <li><Link to="/contact">DISPATCH TERMS // COD</Link></li>
                        <li><Link to="/contact">RETURN &amp; EXCHANGE PROTOCOL</Link></li>
                        <li><Link to="/contact">SECURITY REPORT</Link></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h5>[SYS_METRICS // LIVE]</h5>
                    <div className="footer-sys-metrics">
                        <div>LOC: 10.7769° N, 106.7009° E</div>
                        <div>NODE: SAIGON_HUB_V1</div>
                        <div>SERVER: GO_GIN_MICROSERVICES</div>
                        <div>ENCRYPTION: AES_256_GCM</div>
                        <div>STATUS: <span style={{ color: "#16a34a", fontWeight: "700" }}>ONLINE // 99.98%</span></div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="footer-bottom-bar">
                <span>© {new Date().getFullYear()} STREETVIBE ATELIER. ALL SPECIFICATIONS RESERVED.</span>
                <span>DESIGNED UNDER THE ATELIER BRUTAL CODE.</span>
            </div>
        </footer>
    );
}
