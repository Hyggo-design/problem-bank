# Thiết Kế: GĐ3 (đợt con) — Template xuất "file nội dung" (Mức 2)

## 1. Thông tin chung
- **Ngày**: 24/06/2026
- **Trạng thái**: Đã chốt hướng đi & các câu hỏi mở qua phiên brainstorm (skill `brainstorming`). **Chờ Thầy duyệt tài liệu này trước khi lập kế hoạch build.**
- **Phạm vi**: Đợt con **nặng & rủi ro nhất** của GĐ3 — đổi cách xuất `.tex` từ "một tài liệu độc lập cứng" sang **xuất FILE NỘI DUNG** dựa trên **template do Thầy tự soạn** (đặt trong một thư mục), để `\input` vào `main.tex` của Thầy.
- **Bối cảnh**: nối tiếp GĐ3 đợt 1 (khung) + đợt Thùng rác (đã merge). Nhật ký gần nhất: [.docs/13_2026_06_24.md](../13_2026_06_24.md).
- **Tài liệu gốc**: tầm nhìn GĐ3 ở [.docs/specs/2026-06-21-ux-overhaul-design.md](2026-06-21-ux-overhaul-design.md).

## 2. Bối cảnh quan trọng — workflow thật của Thầy (định hình lại cả tính năng)
Brainstorm hé lộ cách Thầy thật sự làm (khác hẳn hình dung "khung tài liệu" ban đầu):
- Một **thư mục dự án LaTeX**: `main.tex` (preamble đồ sộ tự chế — docclass `book`, gói `ex_test[loigiai]`, watermark, lệnh `\begin{name}`, `\begin{bt}`, `\cautn/\cautl`…) + thư mục con `data/` chứa **file nội dung**.
- `main.tex` gọi nội dung bằng `\input{data/Tên file.tex}`.
- **File nội dung** chỉ gồm: một khối `\begin{name}…\end{name}` (header) → dòng `%Từ đây tôi bắt đầu gõ bài tập nè` → các bài (`\begin{bt}…`).
- 2 skeleton mẫu Thầy đưa: **Phiếu BT** (`name` 3 ô: *Tên bài học / Ngày học / Tên giáo viên*) và **Đề thi** (`name` 6 ô: *Phòng GD / Trường / Tên kỳ thi / Môn thi / Năm học / Thời gian*).

**⟹ Việc của app:** KHÔNG xuất cả tài liệu nữa, mà xuất **đúng FILE NỘI DUNG**: lấy template Thầy chọn → điền header → **chèn các khối `\begin{bt}` của giỏ** → lưu thành 1 file `.tex` (qua hộp thoại Save As) để Thầy bỏ vào `data/` rồi chạy `main`.

## 3. Các quyết định đã chốt (kèm lý do — "Teach Me Why")
1. **Xuất "file nội dung", BỎ xuất "tài liệu độc lập" cũ** (Thầy chốt). *Vì sao:* khung cũ (`\documentclass{article}` + header giữa trang) KHÔNG khớp `main.tex` thật của Thầy (docclass `book`, lệnh riêng) ⇒ vô dụng với pipeline thật. Thay bằng xuất fragment để `\input`.
2. **Template = file `.tex` do Thầy soạn, app ĐỌC từ một thư mục** (Thầy chốt). *Vì sao:* Thầy đã có sẵn skeleton + toàn quyền tuỳ biến LaTeX; app không nên "đẻ" LaTeX cứng trong code. App chỉ *điền* và *chèn bài*.
3. **App tự dựng form header từ chính template** (Thầy chốt): đọc các dòng `{} %Nhãn` trong `\begin{name}` để biết số ô + nhãn (Phiếu BT 3 ô, Đề thi 6 ô — tự thích nghi mỗi template). *Vì sao:* một cơ chế chạy cho mọi template, không hard-code danh sách trường.
4. **Cấu hình thư mục template 1 lần (trong Cài đặt) + Save As mỗi lần xuất** (Thầy chốt). *Vì sao:* thư mục cố định để liệt kê template; Save As cho Thầy chủ động lưu vào đúng `data/` của dự án đang làm + đặt tên file.
5. **`buildProblemTex` (khối `\begin{bt}` mỗi bài) GIỮ NGUYÊN — vẫn sacred** (dùng chung Mã LaTeX + Xem đầy đủ + xuất mới). *Vì sao:* khối này đã khớp `ex_test` của Thầy; đụng vào là vỡ cả 3 nơi. Chứng minh byte-identical bằng `git diff`.
6. **Golden-file test pin định dạng FILE NỘI DUNG mới** (thay vai trò "byte-identical vs khung cũ"). *Vì sao:* khung cũ bị bỏ nên không còn mốc cũ để so; nhưng định dạng mới cần một mốc cố định để các thay đổi sau không âm thầm làm lệch xuất.

## 4. Định dạng template & cơ chế xuất (phần lõi)

### 4.1. Một template (file nội dung) trông như thế nào
Giữ đúng như file Thầy đang dùng — KHÔNG bắt Thầy thêm token lạ:
```latex
\begin{name}
	{} %Tên bài học
	{} %Ngày học
	{} %Tên giáo viên
\end{name}

%Từ đây tôi bắt đầu gõ bài tập nè
```
- **Header** = khối `\begin{name} … \end{name}` đầu file; mỗi dòng dạng `{...} %Nhãn`.
- **Phần thân** = mọi thứ sau header; các bài sẽ được **nối vào CUỐI** nội dung template.

### 4.2. App đọc template thế nào (parse)
- Tìm khối giữa `\begin{name}` và `\end{name}`.
- Mỗi dòng khớp mẫu `^\s*\{[^}]*\}\s*%\s*(.+?)\s*$` ⇒ một **ô header** với nhãn = phần sau `%`, theo đúng thứ tự.
- Nếu template không có `\begin{name}` ⇒ 0 ô header (vẫn xuất được, chỉ chèn bài).

### 4.3. App tạo file nội dung thế nào (hàm thuần `buildContentFile`)
`buildContentFile(templateText, fieldValues, problems, { includeSolution, shuffle })`:
1. **Điền header**: với ô thứ *i* (theo thứ tự), thay `{...}` đầu tiên trên dòng đó bằng `{giá trị Thầy nhập}`. Giá trị **chèn nguyên văn** (Thầy có thể gõ LaTeX; tự tránh `%` trần / ngoặc lệch — sẽ ghi chú trong UI).
2. **Dựng các bài**: `problems` (đảo thứ tự nếu `shuffle`) → `blocks = problems.map(p => buildProblemTex(p, { includeSolution })).join('\n\n')`.
3. **Ghép**: `ketqua = headerDaDien.replace(/\s*$/, '') + '\n\n' + blocks + '\n'` (cắt khoảng trắng cuối template rồi nối chính xác `\n\n` + bài + `\n`). *Quy ước whitespace này được golden-file test khoá.*
4. Trả chuỗi `.tex`. (Không thêm `% Câu N` — giữ đúng phong cách Thầy tự gõ; ex_test tự đánh số qua `\newtheorem{bt}`.)

### 4.4. Liệt kê template trong thư mục
- Chỉ hiện các file `.tex` là **fragment nội dung** = file **KHÔNG chứa** `\documentclass` (để tự loại `main.tex` ra khỏi danh sách chọn).

## 5. Hạ tầng Tauri (mới)
App hiện chỉ có plugin `sql` + `log`; cần thêm khả năng đọc/ghi file ngoài + hộp thoại:
- **`tauri-plugin-dialog`** (Cargo + npm `@tauri-apps/plugin-dialog`): hộp thoại **chọn thư mục** (Cài đặt) + **Save As** (xuất). Đăng ký trong `lib.rs`, thêm quyền `dialog:default` vào `capabilities/default.json`.
- **Lệnh Rust tự viết** (đọc/ghi file bằng `std::fs`, full quyền — tránh rắc rối scope của plugin fs), đăng ký qua `invoke_handler` (lệnh app KHÔNG cần khai quyền capability):
  - `list_content_templates(dir) -> Vec<String>`: liệt kê file `.tex` trong `dir` mà nội dung không chứa `\documentclass`.
  - `read_text_file(path) -> String`.
  - `write_text_file(path, contents) -> ()`.
  - Tất cả trả `Result<_, String>` để báo lỗi rõ ràng.
- **Lưu ý**: đổi `Cargo.toml`/`lib.rs` ⇒ `npx tauri dev` build lại Rust (lâu lần đầu). Em kiểm Rust bằng `cargo check` trong `src-tauri` (không cần mở GUI). `npm run build` chỉ build frontend.

## 6. Giao diện & luồng
### 6.1. Cài đặt — thêm mục "Thư mục template"
- Mục mới (thay placeholder "Mặc định xuất đề"): hiện đường dẫn thư mục template hiện tại + nút **Chọn thư mục…** (dialog chọn folder). Lưu vào `localStorage` (`pb-template-folder`).

### 6.2. ExportModal — viết lại cho "file nội dung"
Mở từ nút **Xuất đề** ở Giỏ (như cũ). Nội dung mới:
- **Chọn template** (dropdown các fragment `.tex` trong thư mục đã cấu hình). Nếu chưa cấu hình thư mục → báo + link sang Cài đặt.
- **Form header động** (sinh từ template đã chọn): mỗi ô = một nhãn đọc từ comment; Thầy điền.
- **2 công tắc**: *Bao gồm lời giải* (`includeSolution`) · *Đảo thứ tự câu* (`shuffle`) — giữ như cũ.
- Nút **Xuất file nội dung** → dựng chuỗi (`buildContentFile`) → mở **Save As** (gợi ý tên + nhắm tới thư mục template) → ghi file bằng `write_text_file` → toast thành công.
- Bỏ các ô cũ (Tên trường/Kỳ thi/Môn/Thời gian giữa modal) — header giờ do template + form động lo.

### 6.3. Giỏ đề
- Giữ nguyên. (Số bài trong giỏ = các bài sẽ được chèn.)

## 7. Golden-file test (BẮT BUỘC)
- Tạo `src/utils/buildContentFile.js` (hàm thuần, không phụ thuộc Tauri/React) + `src/utils/buildContentFile.test.js`.
- Test: cho **1 template mẫu cố định** (giống DeThi.tex) + **2–3 bài cố định** (có công thức `$…$`, có `\choice/\True`, có `\loigiai`) + bộ giá trị header cố định ⇒ so khớp **đúng từng byte** với một chuỗi kỳ vọng (golden) viết thẳng trong test.
- Mục tiêu: khoá định dạng (thứ tự, khoảng trắng, xuống dòng, vị trí chèn). Chạy `CI=true npm test` → xanh.
- (Khuyến khích) thêm test nhỏ cho `buildProblemTex` để chốt khối `\begin{bt}` không đổi.

## 8. Những gì KHÔNG đổi / guardrail
- **`buildProblemTex` giữ nguyên** (byte-identical, git-proven) — đụng là vỡ Mã LaTeX + Xem đầy đủ.
- **KHÔNG đụng**: schema DB, taxonomy, nội dung/bóc tách bài, Thùng rác, khung 3 cột.
- **Bỏ có chủ đích**: hàm xuất tài liệu độc lập cũ (`handleFinalExport` dựng `\documentclass…\end{document}`) — thay bằng luồng file nội dung. (Helper chết `useCart.exportCart` để yên, không trong phạm vi.)
- **Phạm vi v1**: chỉ chèn các bài thành chuỗi `\begin{bt}` liên tiếp; KHÔNG tự chia phần `\cautn/\cautl`, KHÔNG tự sinh bảng đáp án `\indapan`, KHÔNG seed sẵn template (Thầy trỏ tới thư mục của mình).

## 9. Rủi ro & cách kiểm
- **Rust mới**: kiểm bằng `cd src-tauri; cargo check` (em chạy được, không cần GUI). Lỗi Rust chỉ lộ khi build Tauri nên phải cargo check trước.
- **Quyền Tauri/dialog**: nếu hộp thoại không mở → kiểm `capabilities/default.json` có `dialog:default` và `lib.rs` đã `.plugin(tauri_plugin_dialog::init())`.
- **Định dạng xuất**: golden-file test khoá; ngoài ra Thầy xuất 1 file thật, mở bằng editor + `\input` vào `main.tex` chạy thử ra PDF (nghiệm thu trực quan — phần này cần máy Thầy).
- **buildProblemTex byte-identical**: `git diff master -- src/utils/buildProblemTex.js` → rỗng.
- **Build**: `CI=false npm run build` (frontend) 0 warning + `cargo check` (Rust) sạch + `CI=true npm test` (golden) xanh.

## 10. Tiêu chí "Done"
- [ ] Cài đặt: chọn được thư mục template; app liệt kê đúng các fragment `.tex` (ẩn `main.tex`).
- [ ] ExportModal: chọn template → form header hiện đúng nhãn (Phiếu BT 3 ô / Đề thi 6 ô); điền được.
- [ ] Xuất → Save As → ra 1 file nội dung: header đã điền, các bài `\begin{bt}` của giỏ nối sau dòng mốc, `includeSolution`/`shuffle` đúng.
- [ ] File xuất `\input` vào `main.tex` của Thầy biên dịch ra PDF đúng (Thầy kiểm).
- [ ] `buildProblemTex` byte-identical (git) ; golden-file test xanh ; `npm run build` 0 warning ; `cargo check` sạch.
