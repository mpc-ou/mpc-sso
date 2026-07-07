# MPClub SSO (Single Sign-On)

Hệ thống Single Sign-On (OIDC Provider) và quản lý Thành viên (User/Member), Ban (Department), Khách hàng (Client/OAuth Application) cho CLB Lập trình Thiết bị Di động (Mobile Programming Club - FIT - HCMOU).

---

## 1. Công nghệ sử dụng

- **Backend:** NestJS 11 + Prisma ORM + PostgreSQL / SQLite (Development) + Passport (Google OAuth)
- **Frontend (Admin UI & Auth screens):** React + Vite + Base UI (Radix-like primitives) + Vanilla CSS (Custom design system)
- **Cloudinary Integration:** Tải ảnh đại diện trực tiếp, tự động nén về kích cỡ **512x512 pixels** (smart cropping) và tự dọn dẹp ảnh cũ khi thay ảnh mới.
- **CI/CD:** GitHub Actions tự động kiểm lỗi cú pháp (Lint), kiểu dữ liệu (TypeScript) và build thành phẩm trên mỗi thay đổi.

---

## 2. Cài đặt và Chạy cục bộ

### Bước 1: Cài đặt thư viện phụ thuộc
```bash
pnpm install
```

### Bước 2: Cấu hình môi trường
Sao chép cấu hình mẫu từ `.env.example`:
```bash
cp .env.example .env
```
Cấu hình các tham số quan trọng trong `.env`:
- `DATABASE_URL`: Đường dẫn kết nối database (PostgreSQL hoặc SQLite).
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`: Tạo cặp khóa mã hóa bằng cách chạy lệnh `pnpm keys:generate`.
- `CLOUDINARY_URL`: Cấu hình CDN tải ảnh đại diện lên Cloudinary (định dạng `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Cần cấu hình để gửi email kích hoạt khôi phục mật khẩu.

### Bước 3: Khởi tạo cơ sở dữ liệu
```bash
# Tạo cấu trúc bảng và Client
pnpm prisma:migrate --name init
# Nạp dữ liệu mẫu ban đầu (admin mặc định và phòng ban mẫu)
pnpm prisma:seed
```

### Bước 4: Khởi chạy môi trường phát triển (Development)
Chạy song song cả NestJS Backend và React Frontend:
```bash
pnpm dev:full
```
- Server API chạy tại: `http://localhost:3000`
- Admin UI & Login Page chạy tại: `http://localhost:5173` (được proxy qua backend `/admin/ui` khi chạy build thành phẩm).

---

## 3. Cấu trúc dự án

```
prisma/schema.prisma      # Schema dữ liệu Prisma (User, Department, Client, v.v.)
.github/workflows/ci.yml  # GitHub Actions kiểm lỗi và build checks
src/                      # NestJS Backend API
├── main.ts               # Khởi tạo ứng dụng
├── app.module.ts         # Module gốc
├── auth/                 # OIDC Core & Google OAuth
├── token/                # Cấp và thu hồi Access/Refresh Token
├── userinfo/             # API cung cấp thông tin người dùng theo scope
├── admin/                # API quản trị (Users, Departments, Clients, ClubRoles)
├── password/             # Xử lý quên/đặt lại mật khẩu qua Nodemailer
├── cloudinary/           # Dịch vụ nén và quản lý tải ảnh đại diện lên Cloudinary CDN
├── api/                  # API đồng bộ dữ liệu (tương thích ngược) cho các service khác gọi
web-ui/                   # React Frontend (Vite)
├── src/
│   ├── main.tsx          # Điểm gắn ứng dụng Admin Console
│   ├── login-main.tsx    # Điểm gắn trang Đăng nhập & Đặt lại mật khẩu
│   ├── oidc-login-main.tsx # Điểm gắn trang Đăng nhập OIDC của các Client khác
│   ├── pages/            # Các trang giao diện (Users, Departments, Clients, v.v.)
│   ├── components/       # Component dùng chung (Dialog, SimpleSelect, v.v.)
│   └── i18n/             # Đa ngôn ngữ (English / Tiếng Việt)
```

---

## 4. Các câu lệnh chính (Commands)

| Lệnh | Chức năng |
|---|---|
| `pnpm build` | Biên dịch backend NestJS |
| `pnpm build:ui` | Biên dịch frontend React |
| `pnpm run lint` | Chạy bộ kiểm lỗi cú pháp ESLint |
| `pnpm test` | Chạy Unit tests |
| `pnpm test:e2e` | Chạy Integration/E2E tests |
| `pnpm prisma:studio` | Xem và chỉnh sửa trực tiếp dữ liệu qua giao diện Web |
| `pnpm keys:generate` | Tạo và in ra cặp khóa JWT ES256 |

---

## 5. Điểm nổi bật đã triển khai

1. **Gộp bảng User & Member**: Đưa các trường thông tin cá nhân gộp chung vào bảng `User` để giảm số lượng kết nối bảng (join), tăng hiệu năng và tránh sai lệch dữ liệu.
2. **Nén ảnh đại diện tự động**: Tích hợp luồng upload ảnh Cloudinary tự động căn giữa khuôn mặt (`gravity: 'face'`), nén về kích cỡ chuẩn `512x512` và tự xóa ảnh cũ của người dùng trên Cloudinary để giảm tải dung lượng lưu trữ.
3. **Bộ chọn Select Trigger cải tiến**: Tự khắc phục hạn chế hiển thị khóa thô của Select Primitive bằng cách tìm và map hiển thị nhãn thân thiện (Friendly label) ngay cả khi tùy chọn chưa được tải lên DOM.
4. **An toàn khi thao tác nguy hiểm**: Tất cả thao tác vô hiệu hóa tài khoản, kích hoạt lại tài khoản và xóa vĩnh viễn đều được tích hợp hộp thoại xác nhận của trình duyệt (`confirm(...)`) tránh thao tác nhầm.
5. **Cờ Cựu thành viên ảo**: Các API tương thích ngoại vi trả thêm các trường ảo (`isAlumni`, `Alumni`) cho các thành viên trực thuộc phòng ban quá 4 năm (chưa thiết lập ngày kết thúc) phục vụ các client ngoài.
6. **Khôi phục mật khẩu inline**: Cho phép gửi email khôi phục và đặt lại mật khẩu trực quan ngay tại các màn hình đăng nhập chung và đăng nhập OIDC mà không làm mất phiên chuyển tiếp.
