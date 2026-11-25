import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getTrendingProducts } from "../api/productsApi";
import AtelierProductCard from "../components/AtelierProductCard";
import bannerVideo from "../../../assets/video/banner.mp4";
import pumaImg from "../../../assets/img/puma.webp";
import "../styles/atelierBrutal.css";

export default function HomePage() {
    const [trendingDrops, setTrendingDrops] = useState([]);
    const [trendingError, setTrendingError] = useState("");
    const [trendingLoading, setTrendingLoading] = useState(true);

    useEffect(() => {
        let active = true;
        getTrendingProducts(4)
            .then((items) => {
                if (active) setTrendingDrops(items);
            })
            .catch(() => {
                if (active) setTrendingError("Không thể tải sản phẩm trending. Vui lòng thử lại sau.");
            })
            .finally(() => { if (active) setTrendingLoading(false); });
        return () => { active = false; };
    }, []);

    return (
        <main className="atelier-homepage">
            {/* ================= 1. HERO SECTION: ARCHIVAL BRUTALISM ================= */}
            <section className="atelier-hero">
                <div className="hero-info-column">
                    <div className="hero-meta-top">
                        <span>[SPEC // DROP_007]</span>
                        <span>ATELIER BRUTAL ARCHIVE</span>
                        <span>SAIGON &bull; TOKYO</span>
                    </div>

                    <div className="hero-title-group">
                        <span className="mono-spec" style={{ color: "#d32f2f", fontWeight: "700" }}>
                            [COLLECTION 2026 // LIMITED RELEASE]
                        </span>
                        <h1>
                            ARCHIVAL<br />
                            BRUTALISM
                        </h1>
                        <p>
                            Nghiên cứu cấu trúc vải dệt công nghiệp định lượng 480–520 GSM. Phom dáng dứt khoát, đường may trần thô ráp kết hợp cùng phụ kiện titanium đúc nguyên khối. Thiết kế tôn vinh phong thái kiến trúc đô thị hiện đại.
                        </p>
                        <div className="hero-actions-row">
                            <Link to="/best-seller" className="btn-brutal">
                                [KHÁM PHÁ BỘ SƯU TẬP] <ArrowRight size={16} />
                            </Link>
                            <Link to="/contact" className="btn-brutal-outline">
                                [XEM MANIFESTO]
                            </Link>
                        </div>
                    </div>

                    <div className="hero-specs-foot">
                        <div className="spec-item">
                            <small>FABRIC MATRIX</small>
                            <span>480-520 GSM</span>
                        </div>
                        <div className="spec-item">
                            <small>HARDWARE REF</small>
                            <span>TITANIUM GR5</span>
                        </div>
                        <div className="spec-item">
                            <small>SECURITY CHIP</small>
                            <span>NFC / RFID EMBEDDED</span>
                        </div>
                    </div>
                </div>

                <div className="hero-visual-column">
                    <video
                        className="hero-video-element"
                        src={bannerVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                    <div className="hero-visual-overlay">
                        <span className="overlay-tag">[LOOKBOOK SPEC // 01]</span>
                        <div>
                            <span style={{ fontSize: "11px", letterSpacing: "0.1em" }}>ATELIER RAW CUT // RUNWAY FRAME</span>
                            <h4 style={{ fontSize: "18px", fontWeight: "800", marginTop: "4px" }}>URBAN ARMOR ARCHIVE</h4>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= 2. TRENDING DROPS GRID (4 COLUMNS) ================= */}
            <section className="section-dossier-header trending-dossier-header">
                <div>
                    <span className="mono-spec" style={{ color: "#d32f2f" }}>[TRENDING // LIVE PRODUCT DATA]</span>
                    <h2>TRENDING DROPS // CẬP NHẬT MỚI</h2>
                </div>
                <div className="dossier-ref">
                    <span>RANKED BY CART ADDS + PURCHASES</span>
                </div>
            </section>

            <section className="atelier-product-grid">
                {trendingDrops.map((product) => <AtelierProductCard key={product.id} product={product} />)}
            </section>
            {trendingError && <p className="trending-load-message error">{trendingError}</p>}
            {trendingLoading && <p className="trending-load-message">Đang tải sản phẩm trending...</p>}
            {!trendingLoading && !trendingError && trendingDrops.length === 0 && (
                <p className="trending-load-message">Chưa có sản phẩm trending để hiển thị.</p>
            )}

            {/* ================= 3. CATALOG CATEGORIZATION & ATELIER MANIFESTO ================= */}
            <section className="atelier-manifesto-grid">
                <div className="manifesto-craft-box">
                    <div>
                        <span className="mono-spec" style={{ color: "#888" }}>[ATELIER MANIFESTO // RESEARCH LAB]</span>
                        <h3 style={{ marginTop: "12px" }}>CHẾ TÁC THỦ CÔNG &bull; KỸ THUẬT DỆT CÔNG NGHIỆP</h3>
                        <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.6 }}>
                            Mỗi sản phẩm đều trải qua chu trình xử lý bề mặt phức tạp: wash acid tạo hiệu ứng mài mòn tự nhiên, khóa kéo titanium chịu lực gia công CNC, kết hợp chip NFC chứng nhận độc bản không thể làm giả.
                        </p>

                        <table className="manifesto-spec-table">
                            <thead>
                                <tr>
                                    <th>CÔNG NGHỆ</th>
                                    <th>TIÊU CHUẨN XỬ LÝ</th>
                                    <th>ĐỘ BỀN</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>ACID WASH</td>
                                    <td>Mài mòn vi hạt enzyme kép</td>
                                    <td>10+ Năm</td>
                                </tr>
                                <tr>
                                    <td>NFC PASSPORT</td>
                                    <td>Chip mã hóa NTAG213 chống sao chép</td>
                                    <td>Vĩnh viễn</td>
                                </tr>
                                <tr>
                                    <td>TITANIUM GR5</td>
                                    <td>Gia công CNC, chống gỉ tuyệt đối</td>
                                    <td>Chuẩn Quân Sự</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: "32px" }}>
                        <Link to="/contact" className="btn-brutal-outline" style={{ width: "100%" }}>
                            [XEM BÁO CÁO KỸ THUẬT VẢI DỆT]
                        </Link>
                    </div>
                </div>

                <div className="manifesto-categories-box">
                    <Link to="/best-seller" className="category-spec-cell">
                        <div>
                            <span className="cat-code">[CAT_01 // 480GSM]</span>
                            <h4>HEAVY HOODIES</h4>
                            <p>Phom Boxy dứt khoát, mũ trùm 2 lớp đứng form không xẹp.</p>
                        </div>
                        <span className="mono-spec">[XEM MẪU THỬ &rarr;]</span>
                    </Link>

                    <Link to="/best-seller" className="category-spec-cell">
                        <div>
                            <span className="cat-code">[CAT_02 // RIPSTOP]</span>
                            <h4>TACTICAL CARGO</h4>
                            <p>Túi hộp đa khoang, đai siết gấu quần và phụ kiện hợp kim.</p>
                        </div>
                        <span className="mono-spec">[XEM MẪU THỬ &rarr;]</span>
                    </Link>

                    <Link to="/best-seller" className="category-spec-cell">
                        <div>
                            <span className="cat-code">[CAT_03 // 320GSM]</span>
                            <h4>BOXY TEES</h4>
                            <p>Cổ áo dệt bo 3.5cm chống dão, vai xuôi thả lỏng tự nhiên.</p>
                        </div>
                        <span className="mono-spec">[XEM MẪU THỬ &rarr;]</span>
                    </Link>

                    <Link to="/best-seller" className="category-spec-cell">
                        <div>
                            <span className="cat-code">[CAT_04 // HARDWARE]</span>
                            <h4>ACCESSORIES</h4>
                            <p>Dây chuyền xích titanium, thắt lưng bản to khóa Cobra.</p>
                        </div>
                        <span className="mono-spec">[XEM MẪU THỬ &rarr;]</span>
                    </Link>
                </div>
            </section>

            {/* ================= 4. STREET DISPATCH FEED (SAIGON & TOKYO) ================= */}
            <section className="section-dossier-header">
                <div>
                    <span className="mono-spec" style={{ color: "#d32f2f" }}>[VISUAL ARCHIVE // 35MM]</span>
                    <h2>STREET DISPATCH FEED // SAIGON &bull; TOKYO</h2>
                </div>
                <div className="dossier-ref">
                    <span>LIVE LOOKBOOK STREAM // 2026 EDITION</span>
                </div>
            </section>

            <section className="atelier-dispatch-feed">
                <div className="dispatch-card">
                    <img src={pumaImg} alt="Saigon Lookbook" />
                    <div className="dispatch-info">
                        <span>#01 SAIGON DISPATCH</span>
                        <span>[10.7769° N]</span>
                    </div>
                </div>
                <div className="dispatch-card">
                    <img src={pumaImg} alt="Tokyo Lookbook" />
                    <div className="dispatch-info">
                        <span>#02 SHIBUYA OVERPASS</span>
                        <span>[35.6595° N]</span>
                    </div>
                </div>
                <div className="dispatch-card">
                    <img src={pumaImg} alt="Concrete Alley" />
                    <div className="dispatch-info">
                        <span>#03 ATELIER RAW LAB</span>
                        <span>[WORK IN PROGRESS]</span>
                    </div>
                </div>
                <div className="dispatch-card">
                    <img src={pumaImg} alt="Night Run" />
                    <div className="dispatch-info">
                        <span>#04 NIGHT CAMPAIGN</span>
                        <span>[REFLECTIVE 3M]</span>
                    </div>
                </div>
            </section>
        </main>
    );
}
