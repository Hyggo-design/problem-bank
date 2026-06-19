# 🎓 Tài Liệu Toàn Diện: Hệ Thống Ngân Hàng Câu Hỏi Toán Học (Problems Bank)

Tài liệu này được biên soạn chi tiết để cung cấp cái nhìn toàn diện về dự án **Problems Bank** phục vụ công việc giảng dạy môn Toán. Thầy có thể chia sẻ trực tiếp file này cho Claude hoặc các LLM khác để chúng nhanh chóng nắm bắt cấu trúc dự án, cơ sở dữ liệu, luồng xử lý và phát triển thêm tính năng mới mà không cần giải thích lại từ đầu.

---

## 1. Tổng Quan Dự Án (Project Overview)

- **Mục tiêu**: Quản lý ngân hàng câu hỏi Toán học cá nhân dành cho giáo viên, hỗ trợ định dạng công thức LaTeX, bóc tách đề bài tự động bằng AI, quản lý giỏ câu hỏi và đóng gói đề thi thành file `.tex` (LaTeX) chuẩn định dạng của các thầy cô Toán tại Việt Nam.
- **Kiến trúc**: Ứng dụng Desktop chạy offline sử dụng **Tauri v2** kết hợp:
  - **Frontend**: React 18, CSS thuần (Styling hiện đại, Clean UI, có responsive).
  - **Backend**: Rust (Đóng vai trò cầu nối native, không chứa logic nghiệp vụ phức tạp).
  - **Database**: SQLite cục bộ, truy cập thông qua plugin chính thức `@tauri-apps/plugin-sql`.
  - **AI Engine**: Tích hợp trực tiếp thư viện `@google/generative-ai` để gọi model `gemini-flash-latest` bóc tách câu hỏi từ tài liệu thô (ảnh/PDF).

---

## 2. Cấu Trúc Thư Mục Dự Án (Directory Structure)

Dưới đây là cấu trúc chi tiết của mã nguồn hiện tại:

```text
problem-bank/
├── .docs/                      # Thư mục lưu trữ tài liệu dự án và nhật ký phát triển
│   ├── PROJECT_DOCUMENTATION.md # Tài liệu kiến trúc toàn diện của hệ thống (File này)
│   └── 01_2026_06_17.md        # Nhật ký thay đổi và tiến độ dự án (STT_DATE)
├── public/                     # Thư mục chứa tài nguyên tĩnh (HTML template, favicon...)
│   └── index.html              # Entry point HTML của ứng dụng web
├── src/                        # Mã nguồn ứng dụng Frontend (React)
│   ├── components/             # Các React Component tái sử dụng
│   │   ├── Modals/             # Các cửa sổ tương tác (Modal)
│   │   │   ├── AddProblemModal.jsx     # Form thêm câu hỏi bằng tay (LaTeX preview)
│   │   │   ├── EditProblemModal.jsx    # Form chỉnh sửa thông tin câu hỏi
│   │   │   ├── ExportModal.jsx         # Cấu hình đề thi (Tên trường, kỳ thi, đảo câu...) và xuất LaTeX
│   │   │   ├── SmartImportModal.jsx    # Giao diện tải file/ảnh, bóc tách câu hỏi bằng AI và rà soát kết quả
│   │   │   └── DuplicateWarningModal.jsx # Giao diện cảnh báo trùng lặp Premium, đối sánh LaTeX trực quan (KaTeX)
│   │   ├── CartPanel.jsx       # Bảng quản lý giỏ câu hỏi đã chọn bên tay phải
│   │   ├── ControlsRow.jsx     # Thanh lọc câu hỏi (tìm kiếm, chọn chuyên đề, chọn mức độ, sắp xếp)
│   │   ├── DataGrid.jsx        # Grid/Danh sách hiển thị các câu hỏi (Render LaTeX, checkbox chọn câu)
│   │   ├── ErrorBoundary.jsx   # Thành phần bắt lỗi giao diện chống crash app
│   │   ├── ExTestRenderer.jsx  # Render giao diện tài liệu thử nghiệm
│   │   ├── Header.jsx          # Header hiển thị thống kê tổng số câu, số câu chưa phân loại, giỏ hàng...
│   │   ├── MathText.jsx        # Trình render LaTeX sử dụng KaTeX (`react-katex`)
│   │   ├── PreviewPanel.jsx    # Bảng xem trước chi tiết nội dung đề bài và lời giải bên phải
│   │   └── Toolbar.jsx         # Thanh công cụ chứa nút thêm mới, import AI, xóa hàng loạt, thêm vào giỏ hàng
│   ├── hooks/                  # Các Custom Hooks quản lý State và Business Logic
│   │   ├── useCart.js          # Quản lý giỏ đề thi (thêm, xóa, làm sạch giỏ - lưu tạm ở LocalStorage)
│   │   ├── useKeyboardShortcuts.js # Quản lý và xử lý phím tắt hệ thống (hotkeys-js)
│   │   ├── useProblems.js      # Kết nối SQLite thực hiện CRUD câu hỏi (tải, thêm, sửa, xóa lẻ/hàng loạt)
│   │   ├── useToast.js         # Tiện ích hiển thị thông báo nhanh (react-hot-toast)
│   │   └── useUIState.js       # Quản lý các trạng thái giao diện (đóng/mở modal, từ khóa tìm kiếm, bộ lọc)
│   ├── utils/                  # Thư mục chứa các hàm tiện ích và cấu hình hệ thống
│   │   ├── constants.js        # Khai báo hằng số: Danh sách chuyên đề Toán, Mức độ, Dạng câu hỏi
│   │   └── db.js               # Khởi tạo SQLite, tạo bảng `problems`, chạy di cư (Migration) dữ liệu và đánh Index
│   ├── App.css                 # File CSS chứa toàn bộ giao diện và hiệu ứng animations
│   ├── App.jsx                 # Component gốc (Root) phối hợp các hook và layout chính của ứng dụng
│   ├── index.css               # CSS toàn cục (Global CSS)
│   └── index.js                # Điểm khởi đầu render ứng dụng React vào DOM
├── src-tauri/                  # Thư mục dự án Backend (Rust & Tauri cấu hình)
│   ├── capabilities/           # Định nghĩa phân quyền truy cập tính năng native cho Tauri v2
│   ├── icons/                  # Các icon ứng dụng trên desktop
│   ├── src/                    # Mã nguồn Rust
│   │   ├── lib.rs              # File cấu hình khởi chạy app, đăng ký plugin SQLite, Logger
│   │   └── main.rs             # Entry point của ứng dụng Rust
│   ├── Cargo.toml              # Quản lý thư viện phụ thuộc của Rust (dependencies: tauri, tauri-plugin-sql)
│   └── tauri.conf.json         # File cấu hình ứng dụng desktop (kích thước cửa sổ, build script, định danh...)
├── package.json                # Quản lý các thư viện NPM và script chạy dự án (React & Tauri CLI)
└── README.md                   # Hướng dẫn nhanh cho dự án
```

---

## 3. Cấu Trúc Cơ Sở Dữ Liệu (Database Schema)

Dự án sử dụng cơ sở dữ liệu SQLite cục bộ được đặt tên là `problem_bank.db`. File dữ liệu này được lưu trữ tự động trong thư mục dữ liệu cục bộ của hệ điều hành do Tauri quản lý (không lo bị mất dữ liệu khi dọn dẹp bộ nhớ đệm trình duyệt như LocalStorage).

Bảng chính có tên là `problems` với cấu trúc như sau:

| Tên Cột | Kiểu Dữ Liệu SQLite | Ý Nghĩa / Mục Đích Sử Dụng |
| :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | Định danh duy nhất cho từng câu hỏi (sử dụng UUID phiên bản 4). |
| `statement` | `TEXT` | Đề bài Toán học (hỗ trợ đầy đủ cú pháp LaTeX, ví dụ: `$x^2$` hoặc biểu thức lớn). |
| `solution` | `TEXT` | Lời giải chi tiết của bài toán dưới dạng LaTeX. |
| `topic` | `TEXT` | Chuyên đề Toán học (ví dụ: `Đạo hàm`, `Tích phân`, `Lượng giác`, `Hình học không gian`...). |
| `level` | `INTEGER` | Độ khó của câu hỏi. Nhận giá trị: `1` (Cơ bản), `2` (Trung bình), `3` (Nâng cao). |
| `tags` | `TEXT` | Các từ khóa tìm kiếm nhanh, lưu dưới dạng chuỗi ngăn cách bởi dấu phẩy (ví dụ: `cực trị, hàm ẩn`). |
| `dateAdded` | `TEXT` | Thời gian thêm câu hỏi vào cơ sở dữ liệu (định dạng chuỗi ISO hoặc ngày địa phương). |
| `timesUsed` | `INTEGER` | Số lần câu hỏi này đã được chọn để đưa vào đề thi (dành cho mục đích phân tích tần suất). |
| `type` | `TEXT` | Dạng thức câu hỏi: `Tự luận`, `Trắc nghiệm`, `Đúng/Sai`, `Trả lời ngắn`, `Chứng minh`. |
| `shortAnswer` | `TEXT` | Kết quả/đáp án ngắn (dành riêng cho dạng bài trả lời ngắn hoặc điền khuyết). |
| `options` | `TEXT` | Danh sách phương án trắc nghiệm lựa chọn (Lưu dưới dạng chuỗi JSON của một mảng các Object). |
| `metadata` | `TEXT` | Cột dữ liệu dự phòng lưu dưới dạng chuỗi JSON `"{}"` để giáo viên mở rộng thêm các thuộc tính khác. |

### Các Index (Chỉ Mục) tối ưu hiệu năng:
Để ứng dụng có thể tìm kiếm và lọc tức thời trên cơ sở dữ liệu lớn (>10.000 câu hỏi), hệ thống tự động khởi tạo các chỉ mục:
- `idx_topic` trên cột `topic`
- `idx_level` trên cột `level`
- `idx_date` trên cột `dateAdded`

---

## 4. Hằng Số Định Nghĩa (Constants)
File định nghĩa các thuộc tính phân loại câu hỏi nằm tại [constants.js](file:///d:/0.%20Problems%20Bank/src/utils/constants.js):

- **Topics (Chủ đề)**:
  - `Đạo hàm`, `Tích phân`, `Lượng giác`, `Số phức`, `Ma trận`, `Hình học không gian`, `Xác suất`, `Giới hạn`, `Chưa phân loại`.
- **Levels (Độ khó)**:
  - Mức `1` - Cơ bản.
  - Mức `2` - Trung bình.
  - Mức `3` - Nâng cao.
- **Problem Types (Dạng câu hỏi)**:
  - `Tự luận`, `Trắc nghiệm`, `Chứng minh`, `Đúng/Sai`, `Trả lời ngắn`.

---

## 5. Các Tính Năng Cốt Lõi & Luồng Nghiệp Vụ (Core Features & Logic)

### 5.1. Quản lý câu hỏi (CRUD)
- **Thêm/Sửa câu hỏi**: Thầy cô có thể thêm thủ công câu hỏi với đầy đủ các trường thông tin. Các trường trắc nghiệm phương án lựa chọn được lưu trữ dưới dạng mảng JSON trong cột `options` (đánh dấu `isTrue: true` cho đáp án đúng).
- **Xóa hàng loạt (Bulk Delete)**: Hệ thống cho phép chọn nhiều câu hỏi cùng lúc và thực thi xóa trực tiếp bằng một truy vấn SQL `DELETE FROM problems WHERE id IN ($1, $2, ...)` thay vì chạy vòng lặp, tăng tốc xử lý và tránh nghẽn luồng.

### 5.2. Công cụ tìm kiếm & Lọc thời gian thực (Real-time Search & Filter)
- Tìm kiếm từ khóa full-text kết hợp giữa đề bài (`statement`) và từ khóa (`tags`).
- Lọc chéo cùng lúc theo Chuyên đề (Topic), Mức độ khó (Level) và sắp xếp linh hoạt theo ngày thêm hoặc độ khó.

### 5.3. Giỏ câu hỏi & Đóng gói đề thi LaTeX (Exam Cart & LaTeX Export)
- Giáo viên chọn các câu hỏi ưng ý đưa vào Giỏ đề thi (Cart) lưu trữ tạm ở LocalStorage.
- Khi chọn **Xuất bản đề thi** (Export), hệ thống mở Modal cấu hình:
  - Nhập Tên trường, Tên kỳ thi, Môn học, Thời gian làm bài.
  - Tùy chọn **Đảo thứ tự câu hỏi ngẫu nhiên** (Shuffle) trước khi đóng gói.
  - Tùy chọn **Bao gồm Lời giải chi tiết** (sử dụng lệnh `\loigiai{...}` của gói ex_test).
  - Tải về file `.tex` hoàn chỉnh, tương thích tốt với trình biên dịch LaTeX phổ biến tại Việt Nam (Texmaker, Overleaf...).

### 5.4. Tính Năng Smart Import: Tự Động Bóc Tách Bằng AI & Regex
Đây là tính năng thông minh giúp giáo viên nhanh chóng nạp đề từ nhiều nguồn tài liệu khác nhau. Logic xử lý chia làm 2 luồng tại [SmartImportModal.jsx](file:///d:/0.%20Problems%20Bank/src/components/Modals/SmartImportModal.jsx):

#### Luồng 1: Bóc tách file `.tex` hoặc `.txt` bằng Regular Expression (Regex)
Hệ thống đọc trực tiếp nội dung file chữ và dùng Regex quét cấu trúc chuẩn:
```regex
/\\begin\{bt\}([\s\S]*?)\\end\{bt\}/g
```
Đồng thời thực hiện thay thế một số ký hiệu toán học phổ thông (ví dụ: đổi lệnh góc `\angle` hoặc `\angle{ABC}` thành ký hiệu mũ góc `\widehat{ABC}`). Luồng này chạy cực kỳ nhanh và 100% offline.

#### Luồng 2: Nhận diện ảnh và file PDF bằng trí tuệ nhân tạo (Gemini API)
Giáo viên có thể chụp màn hình đề bài hoặc tải file PDF chứa nhiều câu hỏi lên rồi bấm xử lý:
1. Client React đọc file chuyển đổi thành dữ liệu Base64.
2. Gọi API của Gemini (`gemini-flash-latest`) với cấu trúc prompt chi tiết yêu cầu trích xuất cấu trúc câu hỏi sang dạng LaTeX và phân tích các trường dữ liệu theo định dạng JSON:
   ```text
   Trích xuất tất cả bài toán trong tài liệu này sang LaTeX (chuẩn gói ex_test, dùng \widehat{} thay cho \angle). Trả về mảng JSON cấu trúc: [{"statement": "đề bài", "solution": "lời giải (nếu có)", "topic": "chuyên đề dự đoán", "level": 1 hoặc 2 hoặc 3, "type": "Tự luận" hoặc "Trắc nghiệm"}]. CHỈ TRẢ VỀ JSON.
   ```
3. Nhận kết quả JSON từ AI, bóc tách chuỗi, tự động chuyển đổi thành cấu trúc đề bài chuẩn LaTeX (`\begin{bt}...\end{bt}`).
4. Cho phép giáo viên **Rà soát trực quan (Review Stage)**: Thầy cô có thể sửa nội dung đề bài được nhận dạng ngay trên giao diện, thay đổi nhanh Chuyên đề, Loại câu hỏi, Mức độ và xóa các câu nhận diện sai trước khi lưu.
5. **Lưu hàng loạt thông minh (Optimized Bulk Insert)**: Để tránh lỗi quá tải tham số của SQLite (Parameter Limit) khi import cùng lúc hàng trăm câu hỏi, mã nguồn chia nhỏ mảng câu hỏi thành các chunk nhỏ (mỗi chunk 50 câu), thực hiện câu lệnh Insert dạng Batch duy nhất cho từng chunk giúp tối ưu hóa bộ nhớ và tốc độ ghi đĩa.

### 5.5. Tính Năng Phát Hiện Câu Trùng Lặp (Duplicate Detection)
Để tránh lưu trữ các câu hỏi trùng nhau trong cơ sở dữ liệu:
1. **Thuật toán so khớp Sorensen-Dice**: Khi giáo viên nhấn lưu, hệ thống phân tích đề bài mới nhập thành các cặp ký tự liên tiếp (character bigrams) và so sánh với tất cả câu hỏi sẵn có. Thuật toán này có độ phức tạp thấp $O(M+N)$, cho tốc độ quét tức thì (dưới 5ms) và nắm bắt chính xác độ tương tự của các công thức toán học/LaTeX.
2. **Cảnh báo trùng lặp trực quan (DuplicateWarningModal)**: Nếu phát hiện câu hỏi có độ tương đồng $\geq 85\%$, hệ thống sẽ hiển thị một Modal màu vàng cam cảnh báo Premium:
   - Hiển thị song song đề bài của câu đang soạn và câu trùng nhất trong hệ thống dưới dạng LaTeX đã được KaTeX render chuẩn hóa.
   - Hỗ trợ nút **Vẫn tiếp tục lưu** (Force Save) và **Quay lại chỉnh sửa** (Cancel để chỉnh lại nội dung câu hỏi).
3. **Thông minh loại bỏ tự báo trùng (Self-matching edit protection)**: Khi Thầy chỉnh sửa một câu hỏi đã tồn tại (chỉ sửa Chuyên đề, Độ khó, Lời giải, Tags...), hệ thống tự động nhận diện ID câu hỏi đang sửa và so sánh văn bản đề bài. Nếu văn bản đề bài không thay đổi, hệ thống sẽ bỏ qua cảnh báo để tránh gây phiền nhiễu cho người dùng.

### 5.6. Phím Tắt Hệ Thống (Keyboard Shortcuts)
Sử dụng thư viện `hotkeys-js` để tăng tốc độ làm việc của giáo viên mà không cần rê chuột:
- `Ctrl + N`: Mở form thêm câu hỏi thủ công.
- `Ctrl + F`: Đặt con trỏ chuột (Focus) vào ô tìm kiếm nhanh.
- `Escape`: Đóng nhanh bảng xem trước (Preview).
- `Ctrl + Shift + A`: Chọn tất cả câu hỏi trên trang (Chưa gán logic cụ thể).
- `Ctrl + Shift + N`: Bỏ chọn tất cả các câu hỏi đang chọn.
- `Delete / Backspace`: Thực hiện xóa hàng loạt các câu hỏi đang được chọn.
- `Ctrl + E`: Mở cấu hình và xuất đề thi sang LaTeX.
- `Ctrl + L`: Xóa toàn bộ các bộ lọc tìm kiếm đang áp dụng.
- `Ctrl + ,`: Mở nhanh phần cài đặt ứng dụng.
*(Lưu ý: Hệ thống thông minh tự động vô hiệu hóa phím tắt khi người dùng đang tập trung gõ văn bản trong các ô Input hoặc Textarea để tránh kích hoạt nhầm phím tắt).*

---

## 6. Hướng Dẫn Phát Triển Cho Claude (Developer Prompts)

Khi muốn Claude viết thêm tính năng hoặc sửa lỗi, Thầy có thể dán kèm các prompt mẫu dưới đây cùng với file tài liệu này:

### Prompt 1: Thêm trường dữ liệu mới vào DB
> "Dựa trên tài liệu `.docs/PROJECT_DOCUMENTATION.md` đính kèm, tôi muốn bổ sung thêm trường `difficulty_score` (điểm số đánh giá độ khó từ 1-100) vào cơ sở dữ liệu. Hãy hướng dẫn và viết code thay đổi cấu trúc bảng trong `db.js`, cập nhật hàm `addProblem`, `updateProblem` trong `useProblems.js` và cập nhật form trong `AddProblemModal.jsx`."

### Prompt 2: Thêm tính năng xuất PDF trực tiếp từ ứng dụng
> "Dựa trên tài liệu `.docs/PROJECT_DOCUMENTATION.md`, tôi muốn bổ sung tính năng xuất trực tiếp danh sách câu hỏi trong giỏ hàng ra file PDF ngay trong ứng dụng bằng thư viện `jspdf` hoặc `html2pdf.js` đã được khai báo ở `package.json`. Hãy viết code tích hợp nút xuất PDF vào component `CartPanel.jsx`."

### Prompt 3: Cấu hình thay đổi ngưỡng cảnh báo trùng lặp (Threshold)
> "Dựa trên tài liệu `.docs/PROJECT_DOCUMENTATION.md`, tôi muốn cho phép giáo viên tùy chỉnh ngưỡng phần trăm cảnh báo trùng lặp (ví dụ 75% hoặc 90% thay vì cố định 85%) thông qua một ô cấu hình trong Cài đặt và lưu vào LocalStorage. Hãy hướng dẫn cập nhật `useProblems.js` và `App.jsx` để thực hiện tính năng này."
