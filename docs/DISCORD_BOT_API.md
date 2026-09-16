# Hướng dẫn tích hợp MPC SSO API & Webhook (Dành cho Bot Discord)

Tài liệu này cung cấp chi tiết cách kết nối Discord Bot với MPC SSO để tra cứu thành viên, đồng bộ role Discord theo Ban và cập nhật nickname tự động.

---

## 1. Thông tin chung & Xác thực

- **Production Base URL**: `https://auth.mpclub.dev`
- **Local Dev URL**: `http://localhost:3000`
- **Header xác thực bắt buộc**:
  ```http
  X-Service-Key: <SERVICE_API_KEY>
  Content-Type: application/json
  ```
  *(Liên hệ quản trị viên để nhận `SERVICE_API_KEY`)*

---

## 2. Các trường dữ liệu quan trọng

Trong các response trả về từ `/api/users/*`, đối tượng người dùng có 2 trường ảo quan trọng:

| Trường | Kiểu dữ liệu | Ý nghĩa & Cách tính | Ứng dụng trên Discord |
|---|---|---|---|
| `currentDepartment` | `string \| null` | Mã `code` của Ban hiện tại có `startAt` mới nhất (vd: `"PROGRAMMING"`, `"DESIGN"`, `"MEDIA"`...) | Dùng để cấp Role Ban tương ứng trên Discord Server |
| `classOf` | `number \| null` | Năm khoá của thành viên (vd: `2021`). Ưu tiên 1 là `term` của club role cũ nhất, ưu tiên 2 là năm của `startAt` cũ nhất | Dùng để định dạng nickname (ví dụ: `[K21] Nguyễn Văn A`) |

---

## 3. Danh sách API Endpoints

### 3.1. Lấy thông tin thành viên theo Discord ID

- **Endpoint**: `GET /api/users/discord/:discordId`
- **Ví dụ**: `GET /api/users/discord/732157441889927239`
- **Headers**:
  ```http
  X-Service-Key: <SERVICE_API_KEY>
  ```
- **Response mẫu (`200 OK`)**:
  ```json
  {
    "id": "cmm516y3a000004l48tt6hysu",
    "username": "holedev",
    "email": "ho.pl@ou.edu.vn",
    "firstName": "Hồ",
    "middleName": null,
    "lastName": "Phan Lê",
    "mssv": "2051052051",
    "phone": "0901234567",
    "avatar": "https://example.com/avatar.jpg",
    "discordId": "732157441889927239",
    "discordUsername": "hole",
    "currentDepartment": "PROGRAMMING",
    "classOf": 2021,
    "clubRoles": [
      {
        "id": "cmm519l6q000004jufzmbeoye",
        "position": "DEPARTMENT_LEADER",
        "startAt": "2022-10-01T00:00:00.000Z",
        "endAt": "2025-08-01T00:00:00.000Z",
        "department": {
          "id": "cmq97zw1l000005la03c0e8fr",
          "name": "Ban Lập trình",
          "code": "PROGRAMMING"
        }
      }
    ],
    "member": {
      "id": "cmm516y3a000004l48tt6hysu",
      "firstName": "Hồ",
      "lastName": "Phan Lê",
      "mssv": "2051052051",
      "currentDepartment": "PROGRAMMING",
      "classOf": 2021,
      "isAlumni": true
    }
  }
  ```
- **Response lỗi (`404 Not Found`)**: Nếu Discord ID chưa được liên kết với tài khoản SSO nào:
  ```json
  {
    "statusCode": 404,
    "message": "User not found by Discord ID",
    "error": "Not Found"
  }
  ```

---

### 3.2. Cập nhật / Liên kết Discord ID cho User

Dùng khi Bot muốn gán thủ công hoặc cập nhật Discord ID cho thành viên:

- **Endpoint**: `PATCH /api/users/:id/discord`
  *(Tham số `:id` có thể là SSO CUID hoặc `username`)*
- **Headers**:
  ```http
  X-Service-Key: <SERVICE_API_KEY>
  Content-Type: application/json
  ```
- **Body mẫu (Liên kết)**:
  ```json
  {
    "discordId": "732157441889927239",
    "discordUsername": "hole"
  }
  ```
- **Body mẫu (Gỡ liên kết)**:
  ```json
  {
    "discordId": null
  }
  ```
- **Response**: Trả về thông tin user sau khi cập nhật (status `200 OK`).

---

### 3.3. Lấy thông tin user theo ID hoặc Username

- **Endpoint**: `GET /api/users/:id` (hỗ trợ cả `:id` là CUID hoặc `username`)
- **Headers**:
  ```http
  X-Service-Key: <SERVICE_API_KEY>
  ```

---

### 3.4. Lấy danh sách thành viên (Phân trang)

- **Endpoint**: `GET /api/users?page=1&limit=20`
- **Headers**:
  ```http
  X-Service-Key: <SERVICE_API_KEY>
  ```

---

## 4. Nhận sự kiện Realtime qua Webhook

Bạn có thể tạo một webhook endpoint trên bot (ví dụ: `https://bot.mpclub.dev/webhook/sso`) và đăng ký trên trang quản trị SSO (`/admin/ui/webhooks`).

### 4.1. Headers của Webhook gửi tới Bot

Mỗi lần có sự kiện, SSO gửi `POST` kèm các header:
- `X-MPC-Event`: Tên sự kiện (ví dụ `member.changed`)
- `X-MPC-Signature`: `sha256=<hex>` (chữ ký HMAC-SHA256 của body request, tính bằng webhook secret)

### 4.2. Cách xác thực chữ ký (Node.js / Express)

```javascript
import crypto from 'node:crypto';

function verifyWebhook(payloadRawBody, signatureHeader, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payloadRawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}
```

### 4.3. Cấu trúc Payload sự kiện `member.changed`

Khi người dùng liên kết Discord (trên web hoặc qua API), hoặc được cập nhật ban/chức vụ, webhook sẽ gửi payload:

```json
{
  "event": "member.changed",
  "timestamp": "2026-09-16T08:30:00.000Z",
  "actor": {
    "id": "cmm516y3a000004l48tt6hysu",
    "username": "holedev",
    "fullName": "Phan Lê Hồ",
    "avatar": "https://...",
    "discordId": "732157441889927239",
    "discordUsername": "hole",
    "currentDepartment": "PROGRAMMING",
    "classOf": 2021
  },
  "target": {
    "id": "cmm516y3a000004l48tt6hysu",
    "username": "holedev",
    "fullName": "Phan Lê Hồ",
    "avatar": "https://...",
    "discordId": "732157441889927239",
    "discordUsername": "hole",
    "currentDepartment": "PROGRAMMING",
    "classOf": 2021
  },
  "changedFields": [
    "discordId",
    "discordUsername",
    "discordAvatar",
    "discordLinkedAt"
  ],
  "ip": "1.2.3.4",
  "data": {
    "action": "discord-linked",
    "discordId": "732157441889927239",
    "discordUsername": "hole"
  }
}
```

### 4.4. Các giá trị của `data.action`

- `discord-linked`: Thành viên vừa liên kết tài khoản Discord.
- `discord-unlinked`: Thành viên vừa huỷ liên kết Discord.
- `role-added` / `role-updated` / `role-removed`: Chức vụ/Ban CLB của thành viên thay đổi.
- `created` / `updated` / `deleted`: Admin thêm / sửa / xoá thành viên.

### 4.5. Luồng xử lý khuyến nghị cho Bot

Khi nhận được `member.changed`:
1. Kiểm tra `target.discordId`: Nếu có giá trị:
2. Dựa vào `target.currentDepartment` (ví dụ `"PROGRAMMING"`, `"DESIGN"`...), gán Role Ban tương ứng trên Discord Guild.
3. Dựa vào `target.classOf` (ví dụ `2021`) và `target.fullName`, cập nhật Server Nickname thành:
   `[K{classOf}] {fullName}` (ví dụ: `[K21] Phan Lê Hồ`).
