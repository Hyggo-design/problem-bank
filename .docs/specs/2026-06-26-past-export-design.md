# Past Export (Lịch sử đề thi) — Design Spec

## Mục tiêu
Cho phép giáo viên xem lại lịch sử các đề thi đã xuất bản trước đây và dễ dàng đưa các câu hỏi từ đề cũ vào giỏ hiện tại để tái sử dụng.

## Cách tiếp cận & Giao diện (UI/UX)
1. **Truy cập:** Trong bảng **Giỏ (Cart)**, thêm một nút bấm `[🕒 Lịch sử xuất]` ở cạnh tiêu đề.
2. **Hiển thị (Modal Lịch sử xuất):** 
   - Bấm vào nút trên sẽ mở một cửa sổ phụ (Modal) nổi lên.
   - Cửa sổ hiển thị danh sách các lần xuất đề trước đây, sắp xếp từ mới nhất đến cũ nhất.
   - Mỗi mục trong lịch sử sẽ hiển thị:
     - Thời gian xuất (VD: *26/06/2026 09:30*).
     - Tên file/Template (VD: *NoiDung.tex*).
     - Số lượng câu hỏi có trong đề (VD: *15 câu*).
3. **Thao tác:** 
   - Mỗi mục có một nút **"Tải lại vào giỏ"**.
   - Khi bấm, toàn bộ danh sách ID câu hỏi của lần xuất đó sẽ được nạp lại vào giỏ hiện tại. (Có cảnh báo nếu giỏ hiện tại đang có câu hỏi: "Thầy muốn ghi đè giỏ hiện tại hay thêm vào giỏ?").
   - Sau khi tải thành công, Modal đóng lại để Thầy làm việc tiếp với giỏ.

## Lưu trữ dữ liệu (Database)
- Tạo bảng mới trong SQLite: `export_history`
  - `id` (TEXT PRIMARY KEY)
  - `export_date` (TEXT - ISO format)
  - `template_name` (TEXT)
  - `problem_ids` (TEXT - JSON array của các ID câu hỏi)
- Cập nhật hàm xử lý tại `db.js` để tự động tạo bảng này.
- Khi người dùng bấm "Xuất file nội dung" thành công tại `ExportModal`, gọi hàm lưu bản ghi này vào cơ sở dữ liệu.

## Những rủi ro cần lưu ý
- Câu hỏi cũ có thể đã bị xoá khỏi DB (hoặc nằm trong thùng rác). Khi tải lại vào giỏ, hệ thống chỉ lấy những câu hỏi hiện còn tồn tại trong kho (và bỏ qua các ID bị thiếu).

## Mở rộng xuất (LaTeX)
Tính năng này không thay đổi logic xuất file `.tex`, đảm bảo 100% an toàn cho cấu trúc LaTeX.
