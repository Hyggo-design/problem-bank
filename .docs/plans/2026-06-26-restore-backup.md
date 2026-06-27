# Restore Backup (Khôi phục dữ liệu) — Build Plan

**What we're building:** Chức năng cho phép giáo viên khôi phục lại cơ sở dữ liệu từ một file sao lưu có sẵn một cách an toàn.

**Why:** Giải quyết trường hợp dữ liệu bị hỏng, cài lại máy tính, hoặc lỡ tay xoá nhầm dữ liệu.

**Approach:** 
1. Mở cửa sổ chọn file `.db`.
2. Tạo auto-backup phòng hờ rủi ro ghi đè nhầm.
3. Đóng kết nối cơ sở dữ liệu hiện tại để giải phóng file lock (trên Windows SQLite sẽ lock file).
4. Thực hiện copy ghi đè.
5. Tải lại ứng dụng.

**Files we'll change:**
- `src/components/SettingsPage.jsx`

---

### Task 1: Tích hợp hàm Restore Backup vào SettingsPage

**What you'll have when this is done:** Giao diện có thêm nút "Khôi phục dữ liệu" và xử lý được luồng thay thế file SQLite an toàn.

- [ ] Step 1: Mở file `src/components/SettingsPage.jsx`.
- [ ] Step 2: Import hàm `getDb` từ `../utils/db` để lấy đối tượng db và gọi `.close()`.
- [ ] Step 3: Viết hàm `restoreBackup` thực hiện 4 bước như Approach đã nêu (Dùng `window.confirm`, `invoke('copy_file')`, `db.close()`, `window.location.reload()`).
- [ ] Step 4: Thêm một nút `<button onClick={restoreBackup}>Khôi phục dữ liệu</button>` bên cạnh nút "Sao lưu ngay" và "Mở thư mục".
- [ ] Step 5: Check it works bằng cách vào Cài đặt -> Nhấn Khôi phục -> Chọn file Backup -> Nhấn OK -> Quan sát app tự reload và nạp lại dữ liệu cũ.

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order
3. Complete the "Check it works" step
4. If something doesn't work as expected, stop and describe what you see
