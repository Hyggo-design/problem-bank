# Thiết Kế: Hoàn thiện trang Cài đặt (API key · Dark mode · DB & sao lưu)

## 1. Thông tin chung
- **Ngày**: 24/06/2026
- **Trạng thái**: Đã chốt phạm vi + cách làm qua brainstorm. **Chờ Thầy duyệt trước khi lập plan.**
- **Phạm vi**: Biến 3 mục **placeholder** trên trang Cài đặt thành **chức năng thật**: (1) nhập **API key Gemini**, (2) bật **Dark mode**, (3) **vị trí DB & sao lưu**. *(Cỡ chữ TẠM HOÃN; phần mở rộng Cài đặt khác để sau khi đóng gói.)*
- **Bối cảnh**: đợt UX overhaul (GĐ1–3) đã xong phần cốt lõi; chuyển sang dọn "nợ nhỏ" + chuẩn bị **đóng gói v1.0 trước cuối T7**. Nhật ký gần nhất: [.docs/14_2026_06_24.md](../14_2026_06_24.md).
- **Tận dụng sẵn có**: hạ tầng `tauri-plugin-dialog` + lệnh Rust (từ đợt Template); token `[data-theme="dark"]` đã đầy đủ trong `index.css`.

## 2. Mục tiêu
App **đóng gói dùng được thật**: Smart Import có chỗ nhập API key (không phụ thuộc biến môi trường lúc build), dùng được ban đêm (dark mode), và Thầy **tự sao lưu dữ liệu** an toàn.

## 3. Các quyết định đã chốt (Teach Me Why)
1. **Làm 3 mục, hoãn Cỡ chữ.** *Vì sao:* API key + Dark mode + Backup là cái cần ngay cho bản đóng gói; cỡ chữ ưu tiên thấp (app trộn px/rem nên làm đúng cần zoom WebView — để sau).
2. **API key lưu cục bộ trong app** (không từ biến môi trường). *Vì sao:* `process.env.REACT_APP_*` bị "đóng băng" lúc build → bản đóng gói thiếu key, Smart Import hỏng. Lưu `localStorage` đọc lúc chạy ⇒ Thầy nhập 1 lần, dùng mãi. App cá nhân 1 máy ⇒ lưu thẳng (không mã hoá) là chấp nhận được.
3. **Dark mode = công tắc thủ công Sáng/Tối**, áp sớm lúc khởi động. *Vì sao:* token đã sẵn; set `data-theme` sớm (trước khi React vẽ) để **không nháy màu**. "Theo hệ thống" để sau (YAGNI).
4. **Backup = COPY file DB ra nơi Thầy chọn** (không khôi phục trong v1). *Vì sao:* copy là thao tác an toàn (chỉ đọc DB); "khôi phục" phải ghi đè DB + khởi động lại app ⇒ rủi ro, để sau.
5. **Lấy đường dẫn DB + copy nhị phân bằng lệnh Rust.** *Vì sao:* `read_text_file` hiện có làm hỏng file nhị phân; và lấy đường dẫn qua Rust tránh vướng quyền `path` phía JS.

## 4. Chi tiết từng mục

### 4.1. API key Gemini
- **Cài đặt** — mục "Khoá API Gemini": ô nhập dạng **che** (type=password) + nút **hiện/ẩn**; nút **Lưu** ghi `localStorage['pb-gemini-key']` (hoặc tự lưu khi đổi). Hiện trạng thái "đã lưu key" (không in ra key).
- **Smart Import (rewire)**: chuyển việc tạo `genAI` **từ `App` sang `SmartImportModal`**. SmartImport đọc key = `localStorage['pb-gemini-key'] || process.env.REACT_APP_GEMINI_API_KEY || ''` (giữ fallback env cho lúc Thầy dev). Có key → tạo `new GoogleGenerativeAI(key)`; **không key → bước Upload hiện nhắc "Chưa có API key — vào Cài đặt để nhập"** + khoá nút "Bắt đầu chuyển hóa" (không còn lỗi khó hiểu).
- `App.jsx`: bỏ `import GoogleGenerativeAI`, hằng `GEMINI_API_KEY`, biến `genAI`, và prop `genAI={genAI}`.

### 4.2. Dark mode
- **Khởi động** (`src/index.js`): trước khi render, đọc `localStorage['pb-theme']` (mặc định `'light'`) và `document.documentElement.setAttribute('data-theme', theme)`.
- **Cài đặt** — mục "Giao diện tối": công tắc Sáng/Tối; khi đổi → set lại `data-theme` trên `<html>` (đổi màu tức thì, vì token là CSS-var) + lưu `localStorage['pb-theme']`. Công tắc khởi tạo theo trạng thái hiện tại.

### 4.3. Vị trí DB & sao lưu
- **Cài đặt** — mục "Vị trí dữ liệu & sao lưu":
  - Hiện **đường dẫn DB** (gọi lệnh Rust `get_db_path`, hiện read-only).
  - Nút **Sao lưu ngay**: mở `save()` (gợi ý tên `problem_bank-backup-YYYY-MM-DD.db`, nhắm tới thư mục DB) → `copy_file(dbPath, đích)` → toast.
  - Nút **Mở thư mục**: `open_path(thư mục DB)` (mở Explorer; thư mục suy ra từ `dbPath`).
- **KHÔNG** làm khôi phục từ backup (để sau).

## 5. Hạ tầng Rust (thêm vào `lib.rs`, đăng ký `invoke_handler`)
```rust
#[tauri::command]
fn get_db_path(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("problem_bank.db").to_string_lossy().to_string())
}

#[tauri::command]
fn copy_file(src: String, dst: String) -> Result<(), String> {
    std::fs::copy(&src, &dst).map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?;
    Ok(())
}
```
- `get_db_path` cần `use tauri::Manager;` (cho `app.path()`).
- Thêm 3 lệnh vào `generate_handler!` cùng 3 lệnh template hiện có.
- *Lưu ý*: `explorer` đôi khi trả exit code khác 0 dù mở thành công → chỉ cần `spawn()` chạy được là OK (không kiểm exit).

## 6. Những gì KHÔNG đổi / guardrail
- **KHÔNG đụng**: `buildProblemTex`, xuất `.tex`/`buildContentFile`, schema/taxonomy, Thùng rác, khung 3 cột. Backup chỉ **đọc-copy** file DB.
- **KHÔNG** thêm trường dữ liệu; **KHÔNG** sửa cấu trúc DB.
- Golden-file test + `buildProblemTex` vẫn nguyên (git-proven nếu cần).

## 7. Rủi ro & cách kiểm
- **Rust mới**: `cargo check` (em chạy được, không cần GUI).
- **Frontend**: `CI=false npm run build` 0 warning.
- **Đường dẫn DB hiển thị**: Thầy đối chiếu với đường dẫn thật `%APPDATA%\com.tauri.dev\problem_bank.db` (nếu plugin sql dùng thư mục khác, sửa lại chỗ ghép tên file).
- **Trực quan (Thầy `npx tauri dev`)**: nhập key → Smart Import chạy (ảnh/pdf); xoá key → Smart Import nhắc vào Cài đặt; bật/tắt dark mode đổi màu + nhớ qua khởi động lại; Sao lưu ngay ra file `.db` mở được + đúng kích thước; Mở thư mục bật Explorer đúng chỗ.
- **An toàn dữ liệu**: backup là copy, không sửa DB gốc; mở app sau backup dữ liệu còn nguyên.

## 8. Tiêu chí "Done"
- [ ] Cài đặt nhập + lưu API key (che/hiện); Smart Import đọc key từ Cài đặt; không key → nhắc rõ, không lỗi.
- [ ] Công tắc Sáng/Tối đổi màu tức thì + nhớ qua khởi động lại (không nháy lúc mở).
- [ ] Hiện đúng đường dẫn DB; Sao lưu ngay tạo bản copy `.db` hợp lệ; Mở thư mục đúng chỗ.
- [ ] `cargo check` sạch · `npm run build` 0 warning · `buildProblemTex` không đổi.
- [ ] Dữ liệu/đề/xuất không bị ảnh hưởng.
