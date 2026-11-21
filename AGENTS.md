# 📌 AGENTS.md - Hướng Dẫn & Quy Chuẩn Dự Án StreetVibe

Tài liệu này lưu trữ toàn bộ các nguyên tắc kiến trúc, quy chuẩn code và lưu ý quan trọng để các AI Agent luôn nắm bắt ngữ cảnh chính xác và nhất quán khi phát triển dự án **StreetVibe**.

---

## 🏛️ 1. Kiến Trúc Tổng Thể Dự Án (Architecture)

Dự án StreetVibe được xây dựng theo mô hình **Microservices** (Backend Go) kết hợp **Single Page Application** (Frontend React).

* **Frontend:** Nằm trong thư mục `client/`
  * Công nghệ: **React 19**, **Vite**, **React Router DOM v7**, **Axios**, **Lucide React**.
* **Backend:** Nằm trong thư mục `server/`
  * Công nghệ: **Golang**, **Gin Framework**, **GORM**, **PostgreSQL 16**, chạy cô lập trong **Docker Compose**.

### Bản đồ Cổng & Microservices:
| Dịch vụ | Cổng Host | Database | Vai trò |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `8080` | Không | Cổng tiếp nhận duy nhất từ Frontend, định tuyến Reverse Proxy, xử lý CORS, decode JWT & forward `X-User-Id`, `X-User-Role`. |
| **Auth Service** | `8081` | `auth_db` | Đăng ký, đăng nhập, cấp JWT, hồ sơ cá nhân (`/auth/me`), quản lý người dùng & phân quyền (`/auth/users`). |
| **Product Service** | `8082` | `product_db` | Quản lý danh mục (`/categories`) và sản phẩm (`/products`), lọc, phân trang. |
| **Customer Service** | `8083` | `customer_db` | Giỏ hàng (`/cart`), Wishlist (`/wishlist`), Đánh giá sản phẩm (`/products/:id/reviews`). |
| **Media Service** | `8084` | File System | Xử lý upload ảnh (`/media/upload`) và phục vụ file tĩnh (`/uploads/*`). |
| **PostgreSQL** | `5432` | 3 DB độc lập | User: `postgres`, Password: `postgrespassword`. |

---

## 🎨 2. Quy Tắc Viết CSS & Tổ Chức Styles (BẮT BUỘC TUÂN THỦ)

> **QUY TẮC CỐT LÕI TỪ NGƯỜI DÙNG:**  
> **CSS phải được viết riêng theo từng folder/module, không viết lung tung!**

1. **Vị trí đặt file CSS:**
   * Mọi CSS của một feature phải nằm bên trong thư mục `styles/` của chính feature đó.
   * Ví dụ:
     * Feature Admin: `client/src/features/admin/styles/` (gồm `admin.css`, `usersPanel.css`, v.v.).
     * Feature Auth: `client/src/features/auth/styles/`
     * Feature Products: `client/src/features/products/styles/`
   * **Tuyệt đối không** viết dồn style tính năng vào file `global.css` hay để file css rải rác ngoài thư mục gốc của feature.

2. **Cách đặt tên Class (Naming Convention):**
   * Sử dụng tiền tố theo module để tránh xung đột css (ví dụ: `.users-panel-container`, `.admin-sidebar`, `.product-card-item`).
   * Không style trực tiếp lên các thẻ HTML chung như `table`, `input`, `button` mà không có wrapper class bao quanh.

---

## 🔐 3. Xác Thực & Phân Quyền (Auth & RBAC)

* **JWT:** Cấp phát khi đăng nhập/đăng ký, lưu ở `localStorage.getItem("token")`.
* **Axios Interceptor (`apiClient.js`):** Tự động gắn `Authorization: Bearer <token>` vào mọi HTTP request gửi lên Gateway.
* **Gateway Forwarding:** API Gateway tự động giải mã token và gắn các headers cho downstream services:
  * `X-User-Id`: UUID của người dùng.
  * `X-User-Role`: `admin` hoặc `customer`.
* **Quyền Admin:**
  * Người dùng đăng ký đầu tiên tự động nhận quyền `admin`.
  * Chỉ `admin` mới được truy cập `/admin`, gọi API thêm/sửa/xóa sản phẩm, danh mục và quản lý người dùng (`/api/v1/auth/users`).
  * Admin không thể tự hạ quyền hoặc tự xóa chính tài khoản của mình nhằm chống lockout.

---

## 👥 4. Chức Năng Quản Lý Người Dùng (Admin Users Management)

Hệ thống quản lý người dùng cung cấp các API & UI chuyên biệt:
* **API Endpoints:**
  * `GET /api/v1/auth/users`: Lấy danh sách người dùng (hỗ trợ tìm kiếm `search`, lọc `role`, phân trang `page`, `limit`).
  * `POST /api/v1/auth/users`: Tạo người dùng mới trực tiếp từ Admin.
  * `PUT /api/v1/auth/users/:id/role`: Cập nhật vai trò (`customer` <-> `admin`).
  * `DELETE /api/v1/auth/users/:id`: Xóa người dùng.
* **Frontend Component:** `client/src/features/admin/components/UsersPanel.jsx`
* **Styles riêng:** `client/src/features/admin/styles/usersPanel.css`

---

## 🐳 5. Thao Tác Docker & Database

* Khởi động Docker toàn bộ services:
  ```powershell
  cd server
  docker compose up -d
  ```
* Khởi động lại khi sửa code Go trong service:
  ```powershell
  cd server
  docker compose up -d --build <tên_service>   # ví dụ: docker compose up -d --build auth-service
  ```
* Kết nối Database bằng **DBeaver**:
  * Host: `localhost`, Port: `5432`, User: `postgres`, Pass: `postgrespassword`
  * Nhớ bật checkbox **`Show all databases`** trong cấu hình DBeaver để thấy đủ cả 3 DB: `auth_db`, `product_db`, `customer_db`.

---

## 🏛️ 6. Quy Chuẩn Thiết Kế "Atelier Brutal" (Design System Specification)

Hệ sinh thái giao diện của StreetVibe tuân thủ nghiêm ngặt ngôn ngữ thiết kế **Atelier Brutal** (High-End Streetwear & Archival Minimalism):

1. **Bảng màu (Monochrome & Raw Concrete):**
   * Nền chính: `#ffffff` hoặc `#f9f9f9` (Off-white tối giản).
   * Nền phụ (Surface Dim / Container): `#f3f3f3` đến `#ebebeb`.
   * Viền & Đường kẻ: `1px solid #000000` hoặc `#e0e0e0`. Tuyệt đối không dùng bóng đổ mềm (`box-shadow: none`) và không bo góc tròn (`border-radius: 0px`).
   * Điểm nhấn kỹ thuật / Khan hiếm: Đỏ cảnh báo `#d32f2f` cho các tag `[HOT DROP]`, `[LOW STOCK]`, `[CÒN 03 CHIẾC]`.
2. **Typography & Spec Formatting:**
   * Phông chính: **Space Grotesk** (hình học, dứt khoát).
   * Phông kỹ thuật / Metadata: **JetBrains Mono** cho mã SKU, định lượng vải GSM, tọa độ, timestamp, tỉ lệ kho.
   * Quy cách hiển thị: Chữ in hoa (UPPERCASE), dấu ngoặc vuông `[TAG]`, ký hiệu phân tách kỹ thuật `//`.
3. **Các phân hệ cốt lõi đã hoàn thiện:**
   * **Homepage (`/`):** Ticker drop marquee, Hero Archival Brutalism, Grid 4 mẫu thử GSM, Manifesto kỹ thuật dệt & xưởng thủ công, Street Dispatch Feed Saigon-Tokyo.
   * **Catalog (`/best-seller`):** Tỉ lệ kho realtime, Spec Filter Matrix (GSM slider 280-520+ GSM, Form dáng, Size S-XXL), Lưới 4 cột và Countdown banner mở bán Drop tiếp theo.
   * **Product Detail (`/product/:id`):** Gallery ảnh chi tiết, chỉ số model lookbook, RFID chip passport, **Modal Fit Algorithm Matrix** (tự động tính size qua slider chiều cao / cân nặng và bảng số đo thực tế), khối Complete The Fit (-15%).
   * **Cart & Checkout (`/cart`):** All-in-one Checkout, khay giữ đồ Reservation Tray đếm ngược 15:00, mã VIP Drop Pass, bộ chọn thanh toán VietQR (tự tạo mã QR), MoMo, Stripe, COD.
   * **Admin Ops (`/admin`):** 4 thẻ KPI Drop, biểu đồ vận tốc chuyển đổi theo giờ, bảng điều hành kho Inventory Matrix, luồng đơn hàng và security log chống bot.

