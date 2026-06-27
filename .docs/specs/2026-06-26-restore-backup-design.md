# Restore Backup (Khôi phục dữ liệu) — Design Spec

## Mục tiêu
Cho phép giáo viên tự mình khôi phục lại cơ sở dữ liệu (`.db`) từ một file sao lưu có sẵn, giải quyết trường hợp dữ liệu bị hỏng hoặc lỡ tay xóa nhầm câu hỏi quan trọng.

## Cách tiếp cận & Trải nghiệm người dùng (UX)
1. **Truy cập:** Trong màn hình **Cài đặt**, tại mục "Vị trí dữ liệu & sao lưu", sẽ có thêm nút `[Khôi phục dữ liệu]`.
2. **Quy trình an toàn (Option B):**
   - Khi người dùng bấm nút, hệ thống hiển thị hộp thoại chọn file `.db`.
   - Nếu đã chọn file, hiển thị một cảnh báo: *"Dữ liệu hiện tại sẽ bị ghi đè... Hệ thống sẽ tự động tạo bản sao lưu phòng hờ"*.
   - Sau khi người dùng xác nhận:
     1. Hệ thống tự động copy file DB hiện hành ra một file tên là `problem_bank-autobackup-<timestamp>.db` (Thuốc hối hận).
     2. Hệ thống ngắt kết nối với Database hiện hành (`db.close()`) để nhả quyền kiểm soát file (rất quan trọng trên Windows).
     3. Hệ thống copy file DB vừa chọn đè lên file DB hiện hành.
     4. Tự động tải lại giao diện phần mềm (`window.location.reload()`) để nạp dữ liệu mới.

## Mức độ can thiệp Code
- Không cần thêm bảng mới.
- Chỉ chỉnh sửa giao diện `SettingsPage.jsx`.
- Sử dụng hàm `invoke('copy_file')` đã có sẵn từ backend Rust của Tauri.

## Lợi ích
Đem lại sự an tâm tuyệt đối cho người dùng khi sử dụng phần mềm, loại bỏ nỗi sợ "mất dữ liệu".
