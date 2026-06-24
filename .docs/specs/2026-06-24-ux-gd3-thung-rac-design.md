# Thiết Kế: GĐ3 (đợt con) — Thùng rác (xoá mềm)

## 1. Thông tin chung
- **Ngày**: 24/06/2026
- **Trạng thái**: Đã chốt hướng đi & các câu hỏi mở qua phiên brainstorm (skill `brainstorming`). **Chờ Thầy duyệt tài liệu này trước khi lập kế hoạch build.**
- **Phạm vi**: Một **đợt con của GĐ3** — chuyển hành vi xoá bài từ **xoá cứng** sang **xoá mềm** + thêm **trang Thùng rác** (khôi phục / xoá hẳn). Đụng schema **nhẹ** (thêm 1 cột), KHÔNG đụng xuất `.tex`.
- **Bối cảnh**: Nối tiếp GĐ3 đợt 1 (khung 3 cột + palette Cobalt, đã merge `master`). Đây là đợt con **được khuyến nghị làm trước** trong 3 đợt còn lại (Thùng rác · Template xuất Mức 2 · Lịch sử đề) vì rẻ, an toàn, tăng bảo vệ dữ liệu.
- **Tài liệu gốc**: [.docs/specs/2026-06-21-ux-overhaul-design.md](2026-06-21-ux-overhaul-design.md) (tầm nhìn GĐ3) · spec đợt 1 [.docs/specs/2026-06-23-ux-gd3-khung-3-cot-design.md](2026-06-23-ux-gd3-khung-3-cot-design.md). Nhật ký gần nhất: [.docs/12_2026_06_24.md](../12_2026_06_24.md).

## 2. Mục tiêu đợt này
Khi lỡ tay xoá một (hoặc nhiều) bài, Thầy **không mất ngay** mà có **lưới an toàn**: bài rơi vào Thùng rác, có thể **Khôi phục** lại nguyên trạng (kể cả phân loại), hoặc **Xoá hẳn** khi chắc chắn. Giảm rủi ro mất dữ liệu thật khi app đã đóng gói.

## 3. Các quyết định đã chốt (kèm lý do — "Teach Me Why")

1. **Xoá mềm thay vì xoá cứng.** Hiện `deleteProblem`/`bulkDeleteProblems` xoá thẳng (`DELETE`) khỏi DB — không thể hoàn tác. Đổi thành đánh dấu "đã xoá"; bài biến khỏi feed nhưng vẫn nằm trong DB cho tới khi Thầy chủ động xoá hẳn.
2. **Đánh dấu bằng MỐC THỜI GIAN, không phải cờ đúng/sai.** Thêm cột `deletedAt` (kiểu `TEXT`, cho NULL). NULL = đang dùng; có mốc ISO = đang ở thùng rác. *Vì sao:* biết *khi nào* xoá → hiển thị "đã xoá [ngày]", sắp theo ngày xoá, và mở đường auto-dọn về sau — mà chỉ tốn 1 cột.
3. **Thùng rác = mục riêng trên nav rail** (icon `Trash2`), **không** nhét vào Cài đặt. *Vì sao (Thầy chốt):* khác với "Quản lý phân loại" (là *thiết lập*), Thùng rác là nơi **khôi phục NỘI DUNG** — cùng họ với Bài/Giỏ. Đúng metaphor Gmail mà nav rail vốn mô phỏng (Gmail để Trash ở rail). 1 bấm tới nơi khi cần khôi phục gấp.
4. **Xác nhận khi xoá — không cào bằng** (Thầy chốt):
   - **Xoá 1 bài** (nút trên thẻ): **đi ngay, không popup**, hiện toast *"Đã chuyển vào thùng rác"* + nút **Hoàn tác** vài giây. *Vì sao:* xoá mềm đã reversible nên popup cũ là ma sát thừa; Hoàn tác là cách sửa nhanh kiểu Gmail.
   - **Xoá hàng loạt**: **giữ hộp xác nhận** như hiện tại (vì ảnh hưởng nhiều bài cùng lúc).
5. **Bài đang trong Giỏ mà bị xoá mềm → gỡ luôn khỏi Giỏ** (Thầy chốt). *Vì sao:* mô hình nhất quán "đã xoá = ra khỏi lưu thông", tránh lỡ xuất một bài đã bỏ. Giỏ là bản sao riêng ở `localStorage` nên chỉ cần gỡ phần tử cùng `id`. **Khôi phục KHÔNG tự thêm lại** vào giỏ (Thầy tự thêm nếu cần).
6. **Xoá hẳn thì dọn luôn 3 bảng nối phân loại.** *Vì sao:* xoá cứng hiện tại để lại "rác mồ côi" ở `problem_categories/_difficulties/_grades` (lỗi sẵn có). Khi xoá hẳn từ thùng rác, ta `DELETE` cả các dòng nối → tiện thể vá lỗi này. (Xoá *mềm* thì GIỮ nguyên các dòng nối để khôi phục.)
7. **Tự dọn = thủ công ở v1.** Không tự xoá sau N ngày. *Vì sao:* an toàn tuyệt đối, không mất dữ liệu ngoài ý muốn. Cột `deletedAt` đã mở đường auto-dọn 30 ngày *sau này* nếu Thầy muốn (YAGNI — chưa làm).

## 4. Schema & tầng dữ liệu (`db.js`, `useProblems.js`)

### 4.1. Migration (an toàn, idempotent)
- Thêm vào `getDb()` đúng mẫu sẵn có:
  ```sql
  ALTER TABLE problems ADD COLUMN deletedAt TEXT DEFAULT NULL
  ```
  bọc trong `try/catch` (chạy lại nhiều lần vẫn an toàn — nếu cột đã có thì SQLite ném lỗi, ta bỏ qua).
- (Tuỳ chọn nhẹ) thêm `CREATE INDEX IF NOT EXISTS idx_deleted ON problems(deletedAt)` để lọc nhanh.

### 4.2. Đọc dữ liệu
- `loadProblems`: đổi truy vấn chính thành `... FROM problems WHERE deletedAt IS NULL ORDER BY dateAdded DESC` → feed/lọc/Header chỉ thấy bài chưa xoá.
- Thêm `loadTrash()` (hoặc gộp 1 lần tải): `... FROM problems WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC` → danh sách thùng rác, kèm phân loại như bài thường (để hiện cây/độ khó/lớp trên thẻ thùng rác).

### 4.3. Hàm mới / sửa trong `useProblems`
- `deleteProblem(id)` (sửa): `UPDATE problems SET deletedAt = <now ISO> WHERE id = $1`; cập nhật state (gỡ khỏi `problems`, thêm vào danh sách trash).
- `bulkDeleteProblems(ids)` (sửa): `UPDATE ... SET deletedAt = <now> WHERE id IN (...)`.
- `restoreProblem(id)` (mới): `UPDATE ... SET deletedAt = NULL WHERE id = $1`.
- `purgeProblem(id)` (mới): `DELETE FROM problems WHERE id = $1` **+** `DELETE FROM problem_categories/_difficulties/_grades WHERE problem_id = $1`.
- `emptyTrash()` (mới): xoá hẳn mọi bài có `deletedAt IS NOT NULL` (kèm dọn 3 bảng nối tương ứng).
- *(tuỳ chọn)* `restoreAll()` nếu muốn nút "Khôi phục tất cả".

## 5. Giao diện & hành vi

### 5.1. Nav rail — thêm mục Thùng rác
- Mục mới `Thùng rác` (icon `Trash2`), đặt ở **nhóm dưới** cạnh `Cài đặt`.
- **Badge số bài** khi thùng > 0 (giống badge Giỏ).
- `currentView` thêm giá trị `'trash'`.

### 5.2. Trang Thùng rác (`currentView === 'trash'`)
- **Tiêu đề** + dòng mô tả ngắn ("Bài đã xoá. Khôi phục để dùng lại, hoặc xoá hẳn để giải phóng.").
- **Hành động đầu trang**: `Xoá sạch thùng rác` (đỏ, **có xác nhận** — không hoàn tác). *(tuỳ chọn)* `Khôi phục tất cả`.
- **Danh sách bài đã xoá** — thẻ **gọn** (không tái dùng nguyên `ProblemCard` để tránh các nút Thêm giỏ/Sửa/chọn không hợp ngữ cảnh): đề (render LaTeX như feed) + dòng phân loại + nhãn *"Đã xoá [ngày]"*. Mỗi thẻ 2 nút: **Khôi phục** · **Xoá hẳn** (Xoá hẳn có xác nhận).
- **Empty state** khi rỗng: "Thùng rác trống".

### 5.3. Luồng xoá (feed)
- **Nút Xoá trên thẻ** (`onDelete` ở `App.jsx`): bỏ `window.confirm`; gọi `deleteProblem(id)` → gỡ khỏi preview nếu đang mở → **gỡ khỏi Giỏ nếu có** → toast *"Đã chuyển vào thùng rác"* + **Hoàn tác** (bấm = `restoreProblem(id)` + toast "Đã khôi phục").
- **Xoá hàng loạt** (`handleBulkDelete`): **giữ** `window.confirm`; gọi `bulkDeleteProblems(ids)` → gỡ các bài đó khỏi Giỏ → toast kết quả (có thể kèm Hoàn tác cho cả mẻ — *tuỳ chọn*, không bắt buộc v1).
- Phím tắt `Ctrl+Del` vẫn trỏ `handleBulkDelete` (không đổi).

### 5.4. Toast Hoàn tác (kỹ thuật)
- Mở rộng `useToast` thêm 1 kiểu toast có nút hành động (react-hot-toast cho phép render JSX tuỳ biến + `toast.dismiss`). Một hàm kiểu `undoToast(message, onUndo)`.

## 6. Những gì KHÔNG đổi / ngoài phạm vi
- **KHÔNG đụng**: nội dung/định dạng LaTeX mỗi bài, bóc tách khi nhập, **xuất `.tex`** (`buildProblemTex` + `handleFinalExport` giữ nguyên → output **byte-identical**), schema taxonomy (6 bảng cũ giữ nguyên; chỉ THÊM cột `deletedAt` cho `problems`), `useTaxonomy`, `ProblemCard`/`PreviewModal`/`CartPanel` (nội dung — chỉ wiring gỡ-khỏi-giỏ ở `App`).
- **KHÔNG** auto-dọn theo thời gian (để sau).
- **KHÔNG** lịch sử thao tác xoá/khôi phục (ngoài phạm vi — đó là đợt "Lịch sử").

## 7. Rủi ro & cách kiểm
- **Rủi ro chính**: bỏ sót một nơi đang đọc `problems` mà quên rằng giờ đã loại bài xoá → may là `loadProblems` lọc tại nguồn nên mọi nơi dùng `problems` tự đúng (feed, Header stats, lọc). Cần rà các truy vấn `SELECT ... FROM problems` khác (nếu có) để thêm điều kiện `deletedAt IS NULL`.
- **Kiểm xuất `.tex` byte-identical**: chứng minh ở cấp mã nguồn (`git diff` cho thấy `buildProblemTex`/`handleFinalExport` không bị chạm) như các đợt trước.
- **Kiểm dữ liệu**: xoá mềm → bài rời feed, vào thùng rác, phân loại còn nguyên; Khôi phục → về feed đúng phân loại; Xoá hẳn → mất khỏi DB **và** 3 bảng nối (không còn rác mồ côi); Giỏ → bài bị xoá rời giỏ.
- **Build**: `CI=false npm run build` → kỳ vọng `Compiled successfully`, 0 warning sau mỗi task.
- **Backup trước khi đụng schema**: copy `%APPDATA%\com.tauri.dev\problem_bank.db` trước khi chạy migration lần đầu (dù migration chỉ THÊM cột, vẫn backup cho chắc).

## 8. Tiêu chí "Done"
- [ ] Xoá 1 bài → biến khỏi feed, vào thùng rác, có toast Hoàn tác hoạt động.
- [ ] Xoá hàng loạt (giữ confirm) → các bài vào thùng rác, rời Giỏ.
- [ ] Nav rail có mục Thùng rác + badge số đúng.
- [ ] Trang Thùng rác: liệt kê đúng bài đã xoá (mới xoá lên đầu), Khôi phục & Xoá hẳn hoạt động, Xoá sạch có xác nhận, empty state.
- [ ] Khôi phục → bài về feed nguyên phân loại; KHÔNG tự vào lại Giỏ.
- [ ] Xoá hẳn → sạch cả 3 bảng nối.
- [ ] Xuất `.tex` byte-identical (git-proven) + build 0 warning.
