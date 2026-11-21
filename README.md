<p align="center">
  <img src="client/src/assets/img/logo.png" alt="StreetVibe" width="140" />
</p>

<h1 align="center">StreetVibe</h1>

<p align="center">
  Nền tảng thương mại điện tử thời trang streetwear, kết hợp giao diện React với backend Go microservices. StreetVibe theo đuổi ngôn ngữ thiết kế <b>Atelier Brutal</b> — đơn sắc, đường nét dứt khoát và thông tin sản phẩm theo phong cách kỹ thuật.
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img alt="React Router" src="https://img.shields.io/badge/React_Router-7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white" />
  <img alt="Go" src="https://img.shields.io/badge/Go-1.25-00ADD8?style=for-the-badge&logo=go&logoColor=white" />
  <img alt="Gin" src="https://img.shields.io/badge/Gin-1.12-008ECF?style=for-the-badge" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img alt="Axios" src="https://img.shields.io/badge/Axios-1.x-5A29E4?style=for-the-badge&logo=axios&logoColor=white" />
</p>

---

## 🔗 Liên kết dự án

- **Repository:** [huypg-bi/StreetVibe](https://github.com/huypg-bi/StreetVibe)
- Frontend và backend cùng nằm trong repository này.

---

## ✨ Tính năng chính (Key Features)

- **🏠 Storefront** (`/`): trang chủ giới thiệu bộ sưu tập, câu chuyện thiết kế và các sản phẩm nổi bật.
- **🛍️ Catalog & sản phẩm** (`/best-seller`, `/product/:id`): duyệt sản phẩm, xem thông tin chi tiết, danh mục và đánh giá.
- **🧺 Giỏ hàng & yêu thích** (`/cart`, `/wishlist`): giao diện giỏ hàng/checkout và danh sách sản phẩm yêu thích. Backend có API lưu giỏ hàng và wishlist theo tài khoản.
- **🔐 Tài khoản** (`/login`, `/register`): đăng nhập, đăng ký và xác thực bằng JWT.
- **🛠️ Admin** (`/admin`): quản lý sản phẩm, danh mục và người dùng; các API quản trị yêu cầu quyền admin.
- **📤 Media**: tải ảnh sản phẩm lên Media Service và phục vụ ảnh qua API Gateway.
- **📮 Contact** (`/contact`): trang thông tin liên hệ.
- **🎨 Atelier Brutal UI**: tông màu đơn sắc, đường viền rõ nét, typography Space Grotesk và JetBrains Mono, bố cục responsive.

> **Trạng thái một số luồng:** trang checkout hiện là giao diện minh họa, chưa kết nối cổng thanh toán hoặc dịch vụ tạo đơn hàng. Một số số liệu dashboard và sản phẩm mẫu được khai báo trực tiếp trong frontend.

---

## 🧰 Công nghệ sử dụng (Tech Stack)

### Frontend

| Nhóm | Công nghệ |
| :--- | :--- |
| Ngôn ngữ / UI | JavaScript + JSX, React 19 |
| Build tool | Vite 8, `@vitejs/plugin-react` |
| Routing | React Router DOM 7 |
| HTTP client | Axios |
| Icons | Lucide React |
| Chất lượng mã | ESLint 10, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` |

### Backend & Cơ sở dữ liệu

| Nhóm | Công nghệ |
| :--- | :--- |
| Ngôn ngữ | Go 1.25 |
| HTTP framework | Gin |
| ORM | GORM |
| Cơ sở dữ liệu | PostgreSQL 16 |
| Triển khai local | Docker Compose |
| Xác thực | JWT |

### Kiến trúc services

Backend chạy theo mô hình microservices. Frontend gửi request đến API Gateway; Gateway định tuyến request tới service tương ứng.

| Dịch vụ | Cổng mặc định | Database / lưu trữ | Trách nhiệm |
| :--- | :---: | :--- | :--- |
| API Gateway | `8080` | — | CORS, kiểm tra và forward thông tin JWT, định tuyến API, proxy ảnh upload |
| Auth Service | `8081` | `auth_db` | Đăng ký, đăng nhập, thông tin tài khoản và quản trị người dùng |
| Product Service | `8082` | `product_db` | Danh mục và sản phẩm |
| Customer Service | `8083` | `customer_db` | Giỏ hàng, wishlist và đánh giá sản phẩm |
| Media Service | `8084` | File system | Upload ảnh và phục vụ file trong `/uploads/` |
| PostgreSQL | `5432` | Ba database độc lập | Lưu trữ dữ liệu của Auth, Product và Customer Service |

Các API backend sử dụng prefix `/api/v1`. Gateway có health check tại `GET /health`.

---

## 📁 Cấu trúc thư mục (Project Structure)

```text
StreetVibe/
├── client/                         # React SPA
│   ├── public/                     # Favicon và tài nguyên public
│   └── src/
│       ├── app/                    # App, providers và khai báo routes
│       ├── features/
│       │   ├── admin/              # Dashboard và quản lý sản phẩm/danh mục/người dùng
│       │   ├── auth/               # Đăng nhập, đăng ký và auth state
│       │   └── products/           # Storefront, catalog, sản phẩm, cart, wishlist
│       ├── shared/                 # API client và component dùng chung
│       ├── assets/                 # Ảnh, SVG và video
│       └── styles/                 # Global styles và storefront styles
├── server/
│   ├── api-gateway/                # Gateway và reverse proxy
│   ├── services/
│   │   ├── auth-service/
│   │   ├── product-service/
│   │   ├── customer-service/
│   │   └── media-service/
│   ├── shared/                     # Package Go dùng chung
│   ├── scripts/init.sql            # Khởi tạo các database
│   └── docker-compose.yml          # PostgreSQL và các services
├── AGENTS.md                       # Quy chuẩn kiến trúc và giao diện
└── README.md
```

CSS của từng feature được tổ chức trong thư mục `styles/` tương ứng với feature đó.

---

## 🚀 Hướng dẫn cài đặt (Getting Started)

### Yêu cầu hệ thống (Prerequisites)

- **Node.js:** `20.19+` hoặc `22.12+` để chạy Vite 8.
- **npm** (đi kèm Node.js).
- **Docker Desktop** có Docker Compose để chạy backend và PostgreSQL.
- **Go 1.25+** chỉ cần thiết nếu muốn chạy hoặc phát triển backend trực tiếp ngoài Docker.

### Khởi chạy Backend

```powershell
# Từ thư mục gốc của repository
cd server
docker compose up -d --build
```

Các service mặc định sẽ được mở tại `http://localhost:8080` đến `http://localhost:8084`. Kiểm tra API Gateway bằng:

```text
http://localhost:8080/health
```

> Script `server/scripts/init.sql` tạo `auth_db`, `product_db` và `customer_db` khi PostgreSQL khởi tạo data volume lần đầu.

### Khởi chạy Frontend

Mở một terminal khác:

```powershell
# Từ thư mục gốc của repository
cd client
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal (mặc định `http://localhost:5173`).

### Biến môi trường (Environment Variables)

#### Frontend

Frontend đọc `VITE_API_BASE_URL`. Nếu không khai báo, ứng dụng dùng `http://localhost:8080/api/v1`.

Có thể tạo file `client/.env.local` để thay đổi URL API:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Các biến `VITE_*` được nhúng vào frontend khi build; không đặt secret backend trong các biến này.

#### Backend / Docker Compose

Docker Compose hỗ trợ cấu hình qua file `server/.env`. Các giá trị mặc định phù hợp cho môi trường phát triển cục bộ:

| Biến | Mặc định | Mô tả |
| :--- | :--- | :--- |
| `POSTGRES_USER` | `postgres` | Tài khoản PostgreSQL |
| `POSTGRES_PASSWORD` | `postgrespassword` | Mật khẩu PostgreSQL local |
| `POSTGRES_DB` | `postgres` | Database mặc định của container PostgreSQL |
| `POSTGRES_PORT` | `5432` | Cổng PostgreSQL trên máy host |
| `GATEWAY_PORT` | `8080` | Cổng API Gateway |
| `AUTH_SERVICE_PORT` | `8081` | Cổng Auth Service |
| `PRODUCT_SERVICE_PORT` | `8082` | Cổng Product Service |
| `CUSTOMER_SERVICE_PORT` | `8083` | Cổng Customer Service |
| `MEDIA_SERVICE_PORT` | `8084` | Cổng Media Service |
| `JWT_SECRET` | Khóa mặc định trong compose | Khóa ký JWT dùng chung giữa các service |
| `PUBLIC_BASE_URL` | `http://localhost:8080` | URL public dùng cho Media Service |

> Các mật khẩu và khóa mặc định chỉ dành cho phát triển local. Hãy thay bằng giá trị riêng, đủ mạnh ở môi trường chia sẻ hoặc production và không commit file `.env`.

### Lệnh thường dùng

Chạy trong thư mục `client/`:

| Lệnh | Mô tả |
| :--- | :--- |
| `npm run dev` | Chạy Vite development server |
| `npm run build` | Build frontend vào `client/dist/` |
| `npm run preview` | Preview bản build |
| `npm run lint` | Chạy ESLint |

Chạy trong thư mục `server/`:

| Lệnh | Mô tả |
| :--- | :--- |
| `docker compose up -d --build` | Build và chạy toàn bộ backend |
| `docker compose logs -f <service>` | Theo dõi log của service |
| `docker compose down` | Dừng các container, giữ lại database volume |

---

## 🔌 API tổng quan

Frontend gọi API Gateway qua `http://localhost:8080/api/v1`:

| Nhóm | Một số endpoint |
| :--- | :--- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `/auth/users` |
| Products | `GET /products`, `GET /products/featured`, `GET /products/best-seller`, `GET /products/:id` |
| Categories | `GET /categories`, `GET /categories/:id` |
| Cart | `GET /cart`, `POST /cart/items`, `PUT /cart/items/:productId`, `DELETE /cart/items/:productId` |
| Wishlist | `GET /wishlist`, `POST /wishlist/items`, `DELETE /wishlist/items/:productId` |
| Reviews | `GET /products/:id/reviews`, `POST /products/:id/reviews` |
| Media | `POST /media/upload`, `GET /uploads/*` |

Các thao tác quản trị sản phẩm, danh mục và người dùng yêu cầu token/quyền admin. Giỏ hàng và wishlist yêu cầu đăng nhập.

---

## 🧪 Kiểm tra

- Frontend: chạy `npm run build` và `npm run lint` trong `client/`.
- Backend: chạy `go test ./...` bên trong từng module, ví dụ `server/services/auth-service/`. Các module Go nằm trong workspace `server/go.work`.
