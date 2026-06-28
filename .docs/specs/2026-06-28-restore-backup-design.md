# Restore Backup (Khôi phục dữ liệu) — Design Spec

**Ngày:** 28/06/2026
**Trạng thái:** Thiết kế đã chốt (Thầy duyệt 28/06/2026). Chờ build.
**Quy trình:** Claude brainstorm + spec + plan → Antigravity build → Claude check lại.

## Mục tiêu
Cho phép Thầy tự khôi phục cơ sở dữ liệu (`.db`) từ một file sao lưu có sẵn — xử lý các tình huống: dữ liệu hỏng, cài lại máy, hoặc lỡ xoá nhầm câu hỏi quan trọng. Đây là thao tác **ghi đè không hoàn tác được**, nên ưu tiên số một là **an toàn** (Thầy đã chọn mức "An toàn tối đa").

## Bối cảnh kỹ thuật
- App đã có nút **Sao lưu ngay** (Cài đặt → mục "Vị trí dữ liệu & sao lưu"): copy DB sống ra nơi Thầy chọn bằng lệnh Rust `copy_file`. **Restore là chiều ngược lại.**
- DB sống: `D:\0. Problems Bank\app-data\problem_bank.db` — đường dẫn lấy từ `localStorage['pb-db-path-active']` (fallback `pb-db-folder` + `\problem_bank.db`). `SettingsPage.jsx` đã có sẵn biến `dbPath`.
- `getDb()` (`src/utils/db.js`) cache một singleton `dbPromise`; đối tượng `Database` của `@tauri-apps/plugin-sql` có method `.close()`.

## Trải nghiệm người dùng (UX)
**Điểm vào:** nút **[Khôi phục dữ liệu]** đặt trong mục "Vị trí dữ liệu & sao lưu", cạnh "Sao lưu ngay" / "Mở thư mục".

**Luồng:**
1. Bấm **Khôi phục dữ liệu** → hộp thoại chọn file `.db` (`open` của `plugin-dialog`, lọc đuôi `.db`). Huỷ chọn → dừng.
2. **Kiểm tra file (health-check):** mở file vừa chọn ở chế độ đọc, xác minh có bảng `problems`.
   - Không hợp lệ (file lạ / không phải SQLite / thiếu bảng `problems`) → toast lỗi *"File này không phải dữ liệu Problem Bank hợp lệ."* → **dừng, không thay đổi gì.**
3. **Cảnh báo xác nhận** (`window.confirm`): *"Toàn bộ dữ liệu hiện tại sẽ bị thay thế bằng dữ liệu trong file backup. App sẽ tự lưu một bản phòng hờ trước khi thay. Bạn có chắc chắn muốn tiếp tục?"*
   - Huỷ → dừng.
4. Đồng ý → thực hiện **tuần tự**:
   - **(a) Tự lưu phòng hờ:** copy DB sống → `<thư mục DB>\problem_bank-autobackup.db` (1 file duy nhất, ghi đè bản cũ nếu có).
   - **(b) Đóng kết nối DB:** `db.close()` để nhả khoá file trên Windows.
   - **(c) Ghi đè:** copy file Thầy chọn đè lên DB sống (`copy_file`), **có thử lại vài lần** nếu Windows chưa nhả khoá ngay.
   - **(d) Tải lại app:** `window.location.reload()` → nạp dữ liệu vừa khôi phục.
5. Lỗi ở bất kỳ bước nào → toast lỗi rõ ràng; nhờ bản phòng hờ ở bước (a) nên dữ liệu luôn cứu lại được.

## Hai lớp an toàn (đúng mức Thầy chọn)
1. **Bản phòng hờ ("thuốc hối hận")** — `problem_bank-autobackup.db`, đặt **ngay trong thư mục dữ liệu** (`D:\0. Problems Bank\app-data`, bấm "Mở thư mục" là thấy). **Một file duy nhất**, ghi đè mỗi lần khôi phục (Thầy chốt — không giữ lịch sử, cho thư mục gọn). Lùi lại lần khôi phục gần nhất bằng cách bấm Khôi phục lần nữa và chọn chính file này.
2. **Health-check file backup** — mở thử (chỉ đọc), kiểm bảng `problems`. Chặn file lạ/hỏng **trước khi** đụng tới dữ liệu sống.

## Mức độ can thiệp Code
- **KHÔNG** thêm bảng DB, **KHÔNG** đổi schema, **KHÔNG** đụng `buildProblemTex` / `buildContentFile` / xuất `.tex`. → Xuất file hoàn toàn nguyên vẹn.
- Chỉ sửa **một file**: `src/components/SettingsPage.jsx` (thêm nút + hàm `restoreBackup`).
- Dùng lại lệnh Rust **`copy_file`** đã có sẵn cho cả bước (a) và (c). **Không cần viết thêm code Rust.**
- Health-check + đóng kết nối: dùng `Database.load` / `db.close()` của `@tauri-apps/plugin-sql` (thuần JS).

## Rủi ro & cách xử lý
- **Khoá file của Windows:** SQLite khoá file khi mở. Phải `db.close()` trước khi ghi đè; thêm **retry** (ví dụ 3 lần, nghỉ ngắn giữa các lần) phòng khi OS nhả khoá trễ.
- **Copy lỗi giữa chừng làm hỏng DB sống:** đã có bản phòng hờ ở bước (a) → khôi phục lại được. (Lưu ý quan trọng: bước (a) PHẢI chạy trước (b)/(c).)
- **Health-check mở file backup:** chỉ chạy `SELECT` (không ghi) rồi `close()` ngay, không làm hỏng file backup.
- **Singleton `dbPromise`:** sau `reload()` toàn bộ JS chạy lại, `dbPromise` reset → nạp DB mới sạch. Khoá chỉ nhả khi pool Rust đóng; nếu chưa nhả thì bước (c) sẽ lỗi và được retry/bắt lỗi → **không âm thầm hỏng dữ liệu**.

## Ngoài phạm vi (YAGNI)
- Không tự động dọn bản phòng hờ; không giữ lịch sử nhiều bản phòng hờ.
- Không khôi phục chọn lọc từng câu — đây là **thay toàn bộ** cơ sở dữ liệu.

## Lợi ích
Thầy an tâm tuyệt đối: mọi sự cố dữ liệu đều có đường lùi, không còn nỗi sợ "mất trắng".

## Tiêu chí nghiệm thu (cho bước Claude check lại)
- Chọn 1 file backup hợp lệ → app tạo `problem_bank-autobackup.db`, ghi đè DB, tự reload, hiện đúng dữ liệu của file backup.
- Chọn 1 file không hợp lệ (vd file `.db` rỗng/của app khác, hoặc file `.txt` đổi đuôi) → bị chặn, dữ liệu hiện tại **không đổi**.
- Sau khi khôi phục, **xuất `.tex` vẫn byte-identical** (golden test 2/2, không đụng đường xuất).
- `cargo check` không cần chạy lại (không sửa Rust); `npm run build` 0 warning.
