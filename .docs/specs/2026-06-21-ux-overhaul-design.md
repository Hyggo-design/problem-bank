# Thiết Kế: Đợt Dựng Lại UX/UI — Problem Bank

## 1. Thông tin chung
- **Ngày**: 21/06/2026
- **Trạng thái**: Đã chốt hướng đi & thiết kế cốt lõi qua phiên brainstorm (skill `problem-bank-ui` + `brainstorming`) — chờ Thầy review tài liệu này trước khi lập kế hoạch build **Giai đoạn 1**.
- **Phạm vi**: Làm lại **lớp giao diện** (nhìn + bố cục + luồng thao tác) của app. **KHÔNG** đụng nghiệp vụ, schema taxonomy, hay logic bóc tách/xuất LaTeX.
- **Bối cảnh**: Nối tiếp ngay sau khi epic Hệ Thống Phân Loại (Task 1–18) hoàn tất. Đây là "việc lớn kế tiếp" đã chốt hoãn tới sau taxonomy.

## 2. Mục tiêu
Đưa app từ "chạy được" lên "**dùng sướng**": đọc rõ trong một liếc mắt, lướt nhanh, thao tác ít bước, nhất quán, và hợp với việc Thầy dạy **nhiều hệ** (THCS/THPT/Chuyên/Olympic). Kịp đóng gói trước **Tháng 8 2026**. Ưu tiên **độ tin cậy hơn số lượng tính năng**.

## 3. Nguyên tắc nền (từ skill `problem-bank-ui`)
- **Hệ thiết kế**: nền trắng ấm `#FAFAF9` + xám slate + **một** màu nhấn xanh `#3B82F6`; chữ **Inter** (nội dung) + **JetBrains Mono** (toán/mã); lưới **8px**; icon Lucide; tinh thần *calm – readable – functional*.
- **Thứ tự ưu tiên**: ① Dễ đọc → ② Bàn-phím-trên-hết → ③ Mật độ danh sách → ④ Nhất quán → ⑤ Trạng thái rỗng → ⑥ Tương phản → ⑦ Hover → ⑧ Lỗi → ⑨ Dark mode (tuỳ chọn) → ⑩ Animation nhẹ.
- **Luật "Teach Me Why"**: mỗi quyết định thiết kế đều kèm lý do.

## 4. Soi hiện trạng (tóm tắt audit)
**Điểm tốt — giữ nguyên**: danh sách đã virtualize (`react-virtuoso`); `ClassificationPicker` (cây tick + lọc nhanh) rất ổn, tái dùng được; Preview render LaTeX đẹp; có sẵn nền phím tắt; toast báo lỗi khi thêm bài.

**Điểm vướng NẶNG**:
- Danh sách hiện **LaTeX thô** (cột "Trích dẫn đề bài" in thẳng `\frac{...}` thay vì render).
- **Inter & JetBrains Mono CHƯA hề được nạp** — `index.html`/`index.css` đặt font hệ thống (thực chạy **Segoe UI**); ô nhập LaTeX dùng `monospace` chung.
- **Mất viền focus** (`outline:none` khắp nơi) + chưa duyệt danh sách bằng bàn phím.
- **Preview hiện thông tin legacy sai**: dòng phụ đọc `topic`/`level` cũ nên bài nào cũng hiện *"Chưa phân loại • Độ khó: Mức 1"*.
- Chữ phụ `#94a3b8` trên nền trắng (~2.8:1) — **dưới ngưỡng tương phản 4.5:1**.

**Điểm vướng NHẸ**:
- Chưa có "tokens": hex rải khắp nơi, toàn inline style, bo góc 6 kiểu (4/6/8/10/12/999px).
- `src/App.css` là **code chết** (không nơi nào import); animation `fadeIn` ở Toolbar **không tồn tại** (chưa khai báo `@keyframes`).
- Danh sách chính **chưa có trạng thái rỗng**; thiếu hover ở nhiều chỗ bấm được; Header 4 thẻ 4 màu hơi "ồn"; lọc chuyên đề vẫn là **dropdown phẳng** (không scale).

## 5. Tầm nhìn & lộ trình 3 giai đoạn
Quyết định (Thầy chốt): đi theo nhịp **"nền tảng trước → bố cục sau"**, vì phần nền vô hình (font/tokens) được mọi màn về sau dùng lại; làm nền trước thì không phải tô màu hai lần.

- **Giai đoạn 1 — Nền tảng**: làm app *hiện tại* đúng–đẹp–nhất quán mà **giữ nguyên bố cục**. (Chi tiết ở mục 6 — sẵn sàng lập kế hoạch.)
- **Giai đoạn 2 — Danh sách kiểu thẻ**: thay bảng dày bằng **thẻ render**, full-width, cuộn vô tận; Preview & Giỏ thành **lớp phủ hiện-theo-yêu-cầu**. (Mục 7.)
- **Giai đoạn 3 — Sidebar cây lọc + bố cục tổng**: thay dropdown lọc bằng **cây** ở cột trái. (Mục 8.)

## 6. GIAI ĐOẠN 1 — Nền tảng (chi tiết)
**A. Chữ** — nạp thật **Inter** (body 16px / line-height 1.6) + **JetBrains Mono** (ô nhập LaTeX & mọi chuỗi mã), **đóng gói kèm app** để chạy offline.

**B. Bộ "tokens"** — một nơi định nghĩa màu / khoảng cách / bo góc (theo palette skill), đặt token **theo nghĩa** (nền · bề mặt · chữ · viền · nhấn). Mọi màn đọc từ tokens, bỏ hex rời. Cấu trúc theo nghĩa để **sau bật dark mode rất rẻ**.

**C. Render LaTeX trong danh sách** — tái dùng đúng bộ render của Preview (`LatexBlockRenderer`/`MathText`). Đây là cú nâng đọc-được lớn nhất.

**D. Sửa Preview** — hiển thị đúng phân loại mới (`categoryIds`/`difficultyByHe`/`gradeIds`) thay cho `topic`/`level` legacy.

**E. Tương tác rõ ràng** — trả lại viền focus (vòng xanh nhẹ) cho mọi ô/nút; hover thống nhất cho dòng danh sách, nút icon, nút thường.

**F. Trạng thái rỗng** cho danh sách — phân biệt *"chưa có bài nào"* và *"không khớp bộ lọc"* + gợi ý hành động.

**G. Dọn & nhất quán** — bỏ `App.css` chết + `fadeIn` ma; nâng tương phản chữ phụ ≥ 4.5:1; nền trắng-ấm; Header gọn lại (bớt 4-màu-rực, bỏ emoji icon).

**Mặc định đã chốt**: bundle font (offline); tokens dựng sẵn "khe" cho dark mode nhưng **chưa bật** dark mode ở GĐ1; Header làm gọn.

## 7. GIAI ĐOẠN 2 — Danh sách kiểu thẻ (tầm nhìn; đào sâu khi tới)
Cảm hứng từ một "math archive" Thầy tham khảo, **đã lọc lại cho app cá nhân**.

- **Mỗi bài = một thẻ**, đề render ngay (kể cả công thức khối), **full-width**, **cuộn vô tận** (đổi `react-virtuoso` từ chế độ bảng → danh sách/thẻ — cùng thư viện).
- **Thiết kế thẻ (ĐÃ CHỐT)**:
  - **Đề render ở trên cùng** (dẫn bằng đề; bài của Thầy không có "tiêu đề" riêng nên đề chính là đầu thẻ).
  - **Phân loại nhóm theo HỆ**: mỗi hệ một dòng = **trọn đường cây** (`Hệ › … › nhánh`) + **badge độ khó bên phải** (cây trước, mức độ sau). Nếu một hệ có nhiều chuyên đề → liệt kê nhiều đường cây, **độ khó của hệ hiện một lần** (vì độ khó định theo hệ).
  - **Dòng chân**: loại câu · lớp · tag.
  - **Hàng nút**: trái `[Xem đầy đủ] [Lời giải — bung tại chỗ] [Mã LaTeX]` · phải `[Thêm vào giỏ] [Sửa] [Xoá]`.
  - **Đã bỏ**: nút "Nguồn" và vạch màu trái (vì một bài thuộc nhiều hệ/độ khó → tô một màu là sai bản chất).
- **Preview Panel → "Xem đầy đủ"**: lớp phủ hiện-theo-yêu-cầu = chế độ đọc một bài, rộng rãi, có copy LaTeX & bật/tắt lời giải.
- **Cart Panel → "Giỏ"**: lớp phủ hiện-theo-yêu-cầu. → cả hai trả lại không gian cho danh sách full-width.
- **Nút "Mã LaTeX"**: tái dùng bộ dựng `\begin{bt}…` của chức năng Xuất đề (chép đề / lời giải / cả khối) — **an toàn tuyệt đối**.
- **Mật độ**: chấp nhận thẻ render (cao) vì list full-width + bộ lọc + cuộn vô tận lo việc tìm bài.
- **Câu hỏi mở (brainstorm riêng trước khi build GĐ2)**: thiết kế chi tiết lớp phủ *Xem đầy đủ* & *Giỏ*; các biến thể của nút *Mã LaTeX*; có cần nút đổi mật độ không.

## 8. GIAI ĐOẠN 3 — Thanh điều hướng + lọc hệ-first + tính năng kèm theo (tầm nhìn)
GĐ3 gồm **hai mảnh chính** + một số **tính năng mới** đi kèm.

### 8.1. Thanh điều hướng (nav rail kiểu Gmail)
Thanh dọc icon ở mép trái, nhảy giữa các đích/lớp phủ. **Mảnh, gập được** để không lấn feed.
- **Đích lõi**: Bài (Home) · Giỏ đề (badge) · Quản lý phân loại (đưa từ modal ra thành đích riêng) · Cài đặt (dark mode, cỡ chữ, mặc định xuất đề, khoá API Gemini, vị trí DB/backup).
- **Hành động nhanh** đầu rail: + Thêm bài · Import (Toolbar nhờ vậy gọn lại).
- **Đích thêm (Thầy chọn)**: Template xuất đề · Lịch sử đề đã xuất · Thùng rác.
- **Gom nhóm cho đỡ chật**: cụm "sản xuất đề" (Giỏ + Template + Lịch sử) gần nhau — Template & Lịch sử có thể nằm *trong* khu Xuất đề; Thùng rác nép cạnh Cài đặt ở đáy.

### 8.2. Lọc hệ-first (thay dropdown)
- **Khoá vào MỘT hệ tại một thời điểm** (Thầy luôn soạn trong 1 hệ, không lọc nhiều hệ cùng lúc). Hệ quả: sidebar lọc **chỉ hiện cây của đúng hệ đó** (ngắn, sạch), và **ô độ khó = thang của riêng hệ đó** (hết cảnh gom nhóm rối).
- **Cây chuyên đề luôn hiện (gập được)**: bấm một nhánh → feed hiện bài của nhánh đó **gồm nhánh con** (`getDescendantIds` đã có). Đây là bản "luôn hiện" của kiểu drill MathNet, để lọc lại nhanh khi soạn.
- Kết hợp lọc: nhánh + độ khó (hệ) + lớp + loại câu + tag + tìm văn bản.
- **Bố cục 3 cột**: nav rail (mảnh) | sidebar lọc (scoped 1 hệ, gập được) | card feed (rộng).
- **Câu hỏi mở (cho phiên thiết kế GĐ3 chi tiết)**: cách chọn hệ ban đầu — **tabs/segmented** (4 hệ, đổi nhanh) hay **trang "đáp" kiểu lưới** (MathNet-style); cách gập sidebar; rail có nhãn hay icon-only.

### 8.3. Tính năng mới đi kèm (KHÔNG thuần UI — mỗi cái có thiết kế riêng)
- **Template xuất đề — Mức 2 (đã chốt)**: ngoài lưu **preset** (bộ giá trị các ô), cho chọn trong **2–3 khung `.tex` dựng sẵn & test** (vd: Đề thi có header / Phiếu bài tập gọn / Tuyển tập kèm lời giải; cỡ chữ; số cột). Quản lý template **giống Quản lý phân loại** (CRUD theo tên). **Bắt buộc kiểm thử golden-file** (xem 11.8). Mức 3 (khung LaTeX tự soạn) để sau.
- **Thùng rác (xoá mềm)**: thêm cờ "đã xoá"; xoá → vào thùng rác, hoàn tác/khôi phục được; xoá hẳn ở thùng rác. Tăng an toàn dữ liệu.
- **Lịch sử đề đã xuất**: lưu lại các lần xuất (config + ảnh chụp giỏ/loại template) để mở/đóng gói lại. *(Có thể để sau nếu gấp.)*

## 9. Những gì KHÔNG thay đổi
- **Đề bài LaTeX & lời giải** — không đụng.
- **Bóc tách LaTeX khi nhập** và **nội dung mỗi bài** (`\begin{bt}`, `\loigiai`, công thức) — **giữ nguyên hoàn toàn**.
- **Xuất `.tex`**: khung mặc định hiện tại **giữ nguyên** (thành template mặc định). Tính năng Template (GĐ3) **mở rộng** bằng cách THÊM vài khung mới — phần mở rộng này được canh giữ bằng **kiểm thử golden-file** để không bao giờ làm vỡ output. Nút *Mã LaTeX* chỉ tái dùng bộ dựng có sẵn.
- **Schema taxonomy + nghiệp vụ** (`useProblems`, `useTaxonomy`) — giữ nguyên. **Không thêm trường dữ liệu mới** (thẻ dẫn bằng đề + phân loại sẵn có; "nguồn" nếu cần thì ghi vào tag).
- **Loại câu** và **tag tự do** — giữ.

## 10. Phạm vi v1 & để sau
- **Trong v1 (kịp Tháng 8)**: GĐ1 đầy đủ; GĐ2 card feed + lớp phủ Xem-đầy-đủ/Giỏ + nút Mã LaTeX; GĐ3 thanh điều hướng + lọc hệ-first + **Template Mức 2** + **Thùng rác**.
- **Cảnh báo phạm vi**: GĐ3 đã thêm **3 tính năng mới** (template/thùng rác/lịch sử) — không còn thuần UI, nên đội việc & kiểm thử. Nếu deadline căng, **cắt theo thứ tự**: Lịch sử đề → bớt số khung template (chỉ 2) → (giữ Thùng rác vì rẻ & an toàn).
- **Để sau (không chặn deadline)**: dark mode (token đã sẵn sàng); **Template Mức 3** (khung LaTeX tự soạn); Lịch sử đề đã xuất; tách *Giỏ*/*Xem đầy đủ* thành **cửa sổ Tauri rời** (multi-window); nút đổi mật độ; kéo-thả; yêu thích/ghim; thống kê/dashboard riêng; nhóm theo phân loại khi xuất.

---

## 11. PHẦN KỸ THUẬT (Thầy có thể bỏ qua — dành cho bước lập kế hoạch)

### 11.1. Tokens & hệ thiết kế
- Đặt **CSS variables** ở `:root` (trong `index.css`) — inline style đọc qua `var(--…)`; hoặc một file `theme.js`. Chốt ở bước plan. Mục tiêu: nguồn-sự-thật-duy-nhất, tên token theo nghĩa, sẵn sàng cho dark mode.
- Thống nhất thang bo góc (vd `--radius-md: 8px`, `--radius-pill: 999px`) và khoảng cách theo lưới 8px.

### 11.2. Font (offline)
- Bundle **Inter** + **JetBrains Mono** dạng `woff2` trong `public/` + `@font-face`, hoặc dùng `@fontsource/*`. Bỏ phụ thuộc Google Fonts khi chạy. Cập nhật `index.html`/`index.css` (đang để font hệ thống) cho khớp.

### 11.3. Render danh sách
- Đổi `DataGrid` từ `TableVirtuoso` → `Virtuoso` (danh sách/thẻ) — cùng `react-virtuoso`, đã chứng minh chịu được hàng nghìn bài. `itemContent` render thẻ; tái dùng `LatexBlockRenderer`.

### 11.4. Nút "Mã LaTeX"
- Rút bộ dựng `\begin{bt} … \loigiai{…} \end{bt}` từ `App.handleFinalExport` thành **helper dùng chung** (cho cả Xuất đề lẫn nút chép). **Không** đổi format đầu ra.

### 11.5. Sửa Preview
- `PreviewPanel` đọc `categoryIds`/`difficultyByHe`/`gradeIds` (qua `useTaxonomy`) thay cho `problem.topic`/`problem.level`.

### 11.6. Lớp phủ
- *Xem đầy đủ* & *Giỏ* dùng **lớp phủ trong-app** (modal/drawer), **không** mở cửa sổ Tauri thứ hai ở v1 (tránh đồng bộ state giữa 2 cửa sổ — hợp tiêu chí tin-cậy > tính-năng).

### 11.7. Dọn dẹp
- Xoá `src/App.css` (đã chết) và animation `fadeIn` không tồn tại; bỏ các `outline:none` trơ; gom hover/focus vào tokens.

### 11.8. Template xuất đề (GĐ3) — kỹ thuật
- Bóc bộ dựng `.tex` hiện tại (trong `App.handleFinalExport`) thành các **"khung" tham số hoá**; mỗi khung là một hàm dựng đã test. Template = `{ khung_id, giá trị các ô, tuỳ chọn (cỡ chữ / số cột / kèm lời giải) }`.
- **Kiểm thử golden-file**: mỗi khung + bộ dữ liệu mẫu cố định → so `.tex` đầu ra với file mẫu đã duyệt; chạy trước khi commit. Bất kỳ thay đổi nào làm lệch output đều bị bắt.
- Lưu template trong SQLite (bảng `export_templates`), CRUD **giống taxonomy**.
- **KHÔNG** đổi nội dung mỗi bài (`\begin{bt}`…); template chỉ là **lớp bọc tài liệu**.

### 11.9. Câu hỏi mở cho bước lập kế hoạch
1. Tokens bằng **CSS variables** hay **JS theme object**?
2. Font: bundle thủ công `woff2` hay dùng `@fontsource`?
3. Thứ tự build GĐ1 (đề xuất): tokens + font → render list → sửa Preview → focus/hover/empty state → dọn dẹp.
4. GĐ2 & GĐ3 sẽ có **phiên brainstorm riêng** (cho lớp phủ & sidebar) trước khi build.
