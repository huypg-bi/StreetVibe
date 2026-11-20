# StreetVibe Microservices Backend (GoLang + PostgreSQL)

Hệ thống Backend Microservices cho dự án thương mại điện tử:

## Các dịch vụ:
1. **api-gateway** (Port 8080): Đón request từ Client, xác thực JWT, phân luồng đến các service.
2. **services/auth-service** (Port 8081): Quản lý Users, phân quyền, Login/Register.
3. **services/product-service** (Port 8082): Quản lý Danh mục và Sản phẩm.
4. **services/customer-service** (Port 8083): Giỏ hàng, Wishlist, Đánh giá (Reviews).
5. **services/media-service** (Port 8084): Upload và xử lý file hình ảnh.

## Cơ sở dữ liệu:
* PostgreSQL (Quản lý qua Docker Compose)
