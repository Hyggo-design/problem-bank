# Past Export (Lịch sử đề thi) — Build Plan

**What we're building:** Một tính năng cho phép giáo viên xem lại lịch sử các đề thi đã xuất và dễ dàng đưa các bài toán đó trở lại giỏ hiện tại.

**Why:** Giúp giáo viên tái sử dụng các đề thi cũ một cách nhanh chóng mà không cần phải đi tìm và chọn lại từng câu hỏi.

**Approach:** Chúng ta sẽ tạo một bảng mới trong cơ sở dữ liệu (SQLite) để lưu lịch sử xuất. Sau đó, chúng ta sẽ cập nhật cửa sổ Xuất (ExportModal) để ghi lại thông tin khi xuất thành công. Cuối cùng, chúng ta tạo một cửa sổ mới (ExportHistoryModal) hiển thị trong phần Giỏ (Cart) để xem và tải lại đề cũ.

**Files we'll create or change:**
- `src/utils/db.js` — thêm bảng lưu trữ lịch sử
- `src/hooks/useExportHistory.js` — [NEW] nơi chứa các hàm lấy và lưu dữ liệu lịch sử
- `src/components/Modals/ExportModal.jsx` — gọi hàm lưu lịch sử sau khi xuất thành công
- `src/components/Modals/ExportHistoryModal.jsx` — [NEW] giao diện cửa sổ lịch sử
- `src/components/CartPanel.jsx` — thêm nút mở cửa sổ lịch sử

---

### Task 1: Tạo bảng dữ liệu lưu lịch sử (Database)

**What you'll have when this is done:** Cơ sở dữ liệu SQLite của ứng dụng sẽ tự động có thêm bảng `export_history` một cách an toàn mà không làm mất dữ liệu cũ.

- [ ] Step 1: Mở file `src/utils/db.js`
      Thêm đoạn mã SQL tạo bảng `export_history` vào ngay dưới phần tạo bảng `categories` (khoảng dòng 126).
      Mã cần thêm:
      ```javascript
      await db.execute(`CREATE TABLE IF NOT EXISTS export_history (
        id TEXT PRIMARY KEY,
        export_date TEXT NOT NULL,
        template_name TEXT NOT NULL,
        problem_ids TEXT NOT NULL
      )`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_export_date ON export_history(export_date);`);
      ```
- [ ] Step 2: Check it works
      Chạy app bằng lệnh `npx tauri dev`. App phải khởi động bình thường không báo lỗi màn hình đỏ.

### Task 2: Tạo Hook quản lý dữ liệu lịch sử

**What you'll have when this is done:** Một công cụ (hook) giúp ứng dụng dễ dàng gọi hàm `lấy danh sách lịch sử` hoặc `lưu lịch sử mới`.

- [ ] Step 1: Tạo file mới `src/hooks/useExportHistory.js`
      File này sẽ xuất ra 2 hàm: `loadHistory()` và `saveHistory(templateName, problemIds)`. Nó sẽ dùng UUID để tự tạo mã ID và JSON.stringify để lưu danh sách câu hỏi.
- [ ] Step 2: Check it works
      Vì chưa kết nối giao diện, ta chỉ có thể kiểm tra xem việc biên dịch có lỗi không bằng cách chạy `npm run build`. Bạn nên thấy "Compiled successfully".

### Task 3: Ghi nhận lịch sử mỗi khi xuất thành công

**What you'll have when this is done:** Mỗi khi bạn bấm "Xuất file nội dung" và chọn chỗ lưu, ứng dụng sẽ âm thầm ghi lại việc này vào dữ liệu.

- [ ] Step 1: Mở file `src/components/Modals/ExportModal.jsx`
      Thêm `import { useExportHistory } from '../../hooks/useExportHistory';`.
      Sử dụng hook này: `const { saveHistory } = useExportHistory();`.
- [ ] Step 2: Cập nhật hàm `doExport`
      Ngay sau khi gọi `invoke('write_text_file', ...)` thành công, thêm lệnh lưu:
      ```javascript
      const problemIds = cartItems.map(p => p.id);
      await saveHistory(baseName(selected), problemIds);
      ```
- [ ] Step 3: Check it works
      Chạy `npx tauri dev`. Chọn vài bài vào giỏ, bấm xuất file `.tex`.
      Không được có lỗi văng ra.
      (Tiếp theo ở Task 4 ta sẽ thấy lịch sử này hiện lên).

### Task 4: Xây dựng cửa sổ Lịch sử (ExportHistoryModal)

**What you'll have when this is done:** Một cửa sổ danh sách lịch sử với nút "Tải lại vào giỏ".

- [ ] Step 1: Tạo file mới `src/components/Modals/ExportHistoryModal.jsx`
      Cửa sổ này tương tự như các Modal khác, dùng `useExportHistory()` để lấy danh sách.
      Nó có một nút "Tải lại vào giỏ" sẽ gọi hàm `onLoadToCart(problemIds)`.
- [ ] Step 2: Check it works
      Chưa thể hiển thị được vì chưa có nút gọi ở Giỏ. Ta làm tiếp Task 5 rồi kiểm tra gộp.

### Task 5: Đưa nút Lịch sử vào bảng Giỏ (CartPanel)

**What you'll have when this is done:** Nút "🕒 Lịch sử xuất" xuất hiện, bấm vào sẽ hiển thị danh sách các đề cũ và hoạt động được chức năng "Tải lại vào giỏ".

- [ ] Step 1: Mở file `src/components/CartPanel.jsx`
      Thêm một nút `[🕒 Lịch sử xuất]` trên thanh công cụ (gần nút "Dọn giỏ").
- [ ] Step 2: Mở Modal khi bấm nút
      Khai báo state `showHistoryModal` và tích hợp thẻ `<ExportHistoryModal>` bên trong `CartPanel`.
- [ ] Step 3: Viết hàm xử lý "Tải lại vào giỏ"
      Dùng `useProblems` để lấy được `problems` (toàn bộ câu hỏi). Lọc ra các bài toán gốc tương ứng với các ID trong lịch sử. Cảnh báo và sau đó gọi `addToCart` cho từng bài.
- [ ] Step 4: Check it works
      Bật `npx tauri dev`. Bấm nút "Lịch sử xuất", chọn 1 lần xuất cũ và nhấn "Tải lại vào giỏ". Kiểm tra xem giỏ có chứa các câu cũ không.

### Task 6: Kiểm tra an toàn (LaTeX Safety)

**What you'll have when this is done:** Chắc chắn 100% tính năng mới không làm hỏng file LaTeX của giáo viên.

- [ ] Step 1: Tạo 1 bài tập có công thức: `$x^2 + y^2 = z^2$`.
- [ ] Step 2: Thêm bài tập vào giỏ. Bấm "Xuất file nội dung" ra file `test1.tex`.
- [ ] Step 3: Mở Thùng rác, dọn sạch giỏ.
- [ ] Step 4: Mở "Lịch sử xuất", chọn cái mới nhất, nhấn "Tải lại vào giỏ".
- [ ] Step 5: Bấm "Xuất file nội dung" ra file `test2.tex`.
- [ ] Step 6: So sánh xem `test1.tex` và `test2.tex` có bị vỡ cấu trúc không, công thức có bị hỏng không.

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order — don't skip ahead
3. Complete the "Check it works" step before moving to the next task
4. If something doesn't work as expected, stop and describe what you see — don't try random fixes

Say "let's start building" when you're ready to begin Task 1.
