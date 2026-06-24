# Thiết Kế: Đóng gói v1.0 + Chuyển DB sang ổ D

## 1. Thông tin chung
- **Ngày**: 24/06/2026
- **Trạng thái**: Đã chốt qua brainstorm. **Chờ Thầy duyệt trước khi lập plan.**
- **Phạm vi**: (A) **Chuyển nơi lưu DB sang ổ D** (`D:\ProblemBank`) thay vì ổ C; (B) **cấu hình danh tính app** + **đóng gói `tauri build`** ra installer chạy độc lập. Mục tiêu lớn của dự án (v1.0 trước cuối T7).
- **Bối cảnh**: nối tiếp "Hoàn thiện Cài đặt" (đã merge). Nhật ký gần nhất: [.docs/15_2026_06_24.md](../15_2026_06_24.md). App đã push lên GitHub (`origin/master`).

## 2. Mục tiêu
Có một **bộ cài (`.exe`/`.msi`)** để cài app lên máy và chạy như app thường (không cần `npx tauri dev`); và **dữ liệu lưu ở ổ D** (ổ C đã đầy).

## 3. Quyết định đã chốt (Teach Me Why)
1. **DB lưu ở `D:\ProblemBank\problem_bank.db`** (Thầy yêu cầu — ổ C nặng). Mặc định cố định; app **tự tạo thư mục** nếu chưa có; **không có ổ D / tạo lỗi → tự quay về thư mục app trên C** (app không bao giờ chết vì chuyện này). *(Đổi thư mục qua UI: để backlog — v1 cố định D:\ProblemBank.)*
2. **Identifier = `com.hyggo.problembank`** (Thầy uỷ quyền em chọn). *Lưu ý:* vì DB nay ở ổ D (đường dẫn tuyệt đối) nên identifier KHÔNG còn quyết định nơi lưu DB — chỉ là tên định danh app + nơi lưu log/cache.
3. **Tên app giữ "Problems Bank"** (Thầy chốt) + tiêu đề cửa sổ "Ngân hàng câu hỏi"; **cửa sổ 1200×800** (800×600 chật cho 3 cột); **version 1.0.0**; **không ký số** (cá nhân — Windows SmartScreen báo "unknown publisher" lần đầu, bấm *More info → Run anyway*).
4. **Icon**: tạm dùng mặc định để đóng gói; Thầy sẽ đưa icon (Claude Design) sau → em chạy `tauri icon <file>` thay (specs: PNG 1024×1024, vuông, nền trong suốt, hình đơn giản).
5. **Đường dẫn tuyệt đối cho SQLite = KHẢ THI** (đã đọc mã `tauri-plugin-sql` 2.4.0: `path_mapper` dùng `PathBuf::push` → đường tuyệt đối thay đường gốc). Chỉ cần tạo sẵn thư mục cha.

## 4. Phần A — Chuyển DB sang ổ D

### 4.1. Tầng dữ liệu (`db.js`)
- Trước khi `Database.load`, xác định thư mục: `folder = localStorage['pb-db-folder'] || 'D:\\ProblemBank'`.
- Gọi lệnh Rust **`ensure_dir(folder)`** (tạo thư mục, idempotent). 
  - Thành công → `Database.load('sqlite:' + folder + '\\problem_bank.db')`; lưu `localStorage['pb-db-path-active']` = đường dẫn file thật (để Cài đặt hiển thị/sao lưu).
  - Lỗi (không có ổ D…) → cảnh báo + **fallback** `Database.load('sqlite:problem_bank.db')` (thư mục app trên C, như cũ); xoá `pb-db-path-active`.
- Phần còn lại của `db.js` (tạo bảng, migration, seed) **giữ nguyên** — chỉ đổi *nơi* file DB nằm, không đổi *nội dung/cấu trúc*.

### 4.2. Lệnh Rust mới (`lib.rs`)
```rust
#[tauri::command]
fn ensure_dir(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())
}
```
- Đăng ký vào `generate_handler!`. **Bỏ `get_db_path`** (giờ vô nghĩa vì nó trả thư mục app trên C; Cài đặt dùng `pb-db-path-active` thay thế).

### 4.3. Cài đặt — mục "Vị trí dữ liệu & sao lưu" (cập nhật)
- Đường dẫn hiển thị: đọc `localStorage['pb-db-path-active']` (fallback: `folder + '\\problem_bank.db'`) — thay cho `invoke('get_db_path')`.
- **Sao lưu ngay** + **Mở thư mục**: giữ nguyên, nay trỏ vào DB trên ổ D.

## 5. Phần B — Danh tính app + đóng gói

### 5.1. `src-tauri/tauri.conf.json`
- `identifier`: `com.tauri.dev` → `com.hyggo.problembank`.
- `version`: `0.1.0` → `1.0.0`.
- `app.windows[0]`: `width 800 → 1200`, `height 600 → 800` (title giữ "Ngân hàng câu hỏi").
- `productName` giữ "Problems Bank".
- (Icon giữ mặc định lần này; thay khi có file Thầy.)

### 5.2. Build
- Lệnh: `npx tauri build` (build React + Rust **release** → đóng gói). Lâu (build release lần đầu vài phút).
- Output (Windows): `src-tauri/target/release/bundle/` — thư mục `msi/` (`.msi`) và `nsis/` (`.exe` setup). Em sẽ chỉ Thầy file cụ thể để cài.

## 6. Những gì KHÔNG đổi / guardrail
- **KHÔNG đụng**: `buildProblemTex`, xuất `.tex`/`buildContentFile`, **schema/nội dung DB** (chỉ đổi *nơi lưu* file, không đổi bảng/cột/bài), taxonomy, Thùng rác, Template.
- Golden-file test + `buildProblemTex` byte-identical vẫn giữ.

## 7. Rủi ro & cách kiểm
- **Đường dẫn DB tuyệt đối**: đã xác nhận khả thi ở cấp mã nguồn plugin; nhưng **chỉ chạy thật (`npx tauri dev`/app đóng gói) mới thấy DB thật sự nằm ở `D:\ProblemBank`** → Thầy nghiệm thu (mở thư mục thấy file + thêm 1 bài rồi kiểm file xuất hiện).
- **Fallback ổ C**: nếu test trên máy không có ổ D, app vẫn chạy (về C).
- **Build**: `cargo check` (em) + `CI=false npm run build` (em) + `CI=true npm test` (golden) trước khi `tauri build`. `tauri build` em chạy được; **cài + chạy installer cần Thầy**.
- **`buildProblemTex` byte-identical**: `git diff` rỗng.
- **SmartScreen**: lần đầu chạy app chưa ký sẽ cảnh báo — bình thường, *More info → Run anyway*.

## 8. Tiêu chí "Done"
- [ ] App (qua `npx tauri dev`) tạo & dùng DB ở `D:\ProblemBank\problem_bank.db`; thêm/sửa/xoá/xuất chạy bình thường; Cài đặt hiển thị đúng đường dẫn ổ D; Sao lưu/Mở thư mục trỏ đúng.
- [ ] `tauri.conf.json` cập nhật (identifier/version/cửa sổ); `cargo check` sạch; `npm run build` 0 warning; golden test xanh; `buildProblemTex` byte-identical.
- [ ] `npx tauri build` ra installer trong `target/release/bundle/`; Thầy cài được + mở app chạy được + DB ở ổ D.
- [ ] (Sau) thay icon khi có file Thầy.
