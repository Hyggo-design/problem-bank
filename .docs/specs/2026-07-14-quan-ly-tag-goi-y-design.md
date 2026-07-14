# Thiết Kế: Quản Lý Tag + Gợi Ý Gõ — Problem Bank

## 1. Thông tin chung
- **Ngày**: 14/07/2026
- **Trạng thái**: Đã brainstorm chi tiết + Thầy DUYỆT thiết kế ("tôi oke nhé"). Sẵn sàng chuyển sang Plan.
- **Đợt**: Roadmap **Đợt B** (`.docs/ROADMAP.md`) — mục "🧩 Quản lý tag + gợi ý khi gõ".
- **Phạm vi**: 4 phần — (1) **ô nhập tag kiểu viên/chip + gợi ý** trong form Thêm/Sửa/Nhập AI; (2) **lọc bài theo nhiều tag (VÀ/HOẶC)** ở cột lọc trái; (3) **màn quản lý tag** (danh sách + số bài) mở từ Cài đặt; (4) **đổi tên / gộp / xoá tag toàn kho** ngay trong màn quản lý.
- **KHÔNG trong phạm vi đợt này**: bảng tag riêng trong CSDL; màu/mô tả cho tag; tag phân cấp; gắn tag vào file `.tex`; đổi tên/gộp *nhiều tag một lượt* (chỉ làm từng tag).

### Bối cảnh (vì sao làm việc này)
- Tag hiện là **chuỗi chữ gõ tay ngăn dấu phẩy** trên mỗi bài, không có gì gợi ý → dễ đẻ biến thể (`so hoc` / `số học` / `Số Học` thành 3 tag khác nhau) làm **phân mảnh kho**, tra cứu về sau khó gom.
- Roadmap Đợt B chốt: thêm **danh sách tag + gợi ý khi gõ + đổi tên toàn kho** để chặn phân mảnh (chặn từ lúc nhập) và chữa phân mảnh (gộp lại về sau).

## 2. Mục tiêu
- **Chặn phân mảnh khi nhập**: gõ tag thì thấy ngay tag đã có để chọn lại (khớp không phân biệt hoa/thường/dấu), thay vì gõ tay đẻ biến thể mới. Vẫn cho tạo tag mới tự do.
- **Thấy toàn cảnh tag**: một chỗ liệt kê mọi tag đang dùng + số bài mỗi tag.
- **Chữa phân mảnh**: đổi tên / gộp / xoá một tag trên **mọi bài** cùng lúc.
- **Tra cứu theo tag**: chọn **một hoặc nhiều** tag để lọc bài, chế độ **VÀ** (bài đủ mọi tag đã chọn) hoặc **HOẶC** (bài có bất kỳ tag đã chọn).

## 3. Bối cảnh dữ liệu thật (kiểm CSDL read-only 14/07)
Quan trọng để đặt kỳ vọng đúng — kho tag còn **rất non**:
- **73 bài còn sống; chỉ 7 bài có tag** (66 bài chưa gắn tag nào).
- **5 tag phân biệt**: `Fermat` (3 bài) · `Định lý Fermat` (1) · `Chuyên KHTN 2025 2026` (1) · `số lập phương` (1) · `xuống thang` (1).
- **Chưa có biến thể hoa/thường/dấu** (0 nhóm) — nhưng đã ló **1 cặp nên gộp thủ công**: `Fermat` vs `Định lý Fermat` (khác chữ, máy không tự nhận là biến thể; Thầy tự đổi tên để gộp).
- **Hệ quả**: tính năng **phòng xa / hướng tới tương lai** — dựng đủ 4 phần để khi kho tag phình lên thì đã có khung chặn phân mảnh, chứ không phải để dọn đống lộn xộn (chưa có).

## 4. Hiện trạng (điểm xuất phát)
- **Lưu**: cột `problems.tags TEXT` — chuỗi các tag **ngăn dấu phẩy** (vd `cực trị, hình nón, min-max`). KHÔNG có bảng tag riêng. (`db.js`, `problemWrites.js`)
- **Nhập**: ô chữ tự do trong **`ClassificationPicker.jsx`** (mục "Tags (cách nhau bởi dấu phẩy)"), dùng chung cho form Thêm/Sửa/Nhập AI. Value đi kèm phân loại: `{ categoryIds, difficultyByHe, gradeIds, tags }`.
- **Hiện**: trên thẻ bài (`ProblemCard.jsx`) dạng `#cực trị #hình nón` (split `,` → trim → thêm `#`).
- **Tìm kiếm**: tag nằm trong tìm-kiếm-sâu (`searchText.js`, có `normalizeVi` bỏ dấu tiếng Việt) — gõ từ khoá là ra; nhãn "🔍 khớp: tag".
- **Xuất `.tex`**: **KHÔNG đụng tag** — `buildProblemTex.js` không tham chiếu `tags`. ⇒ Tag là **dữ liệu phụ thuần**; mọi thao tác tag không thể làm hỏng đường xuất.
- **Đường ghi**: `useProblems.js` — mọi hàm ghi trả `true/false` (không nuốt lỗi âm thầm — Đợt A #1); thao tác hàng loạt gọi `loadProblems()` để đồng bộ lại state với CSDL.
- **Cột lọc** (`FilterSidebar.jsx`): hiện có hệ / cây chuyên đề / độ khó / lớp / "chỉ chưa dùng" — **chưa có lọc theo tag**. Mỗi lọc **chọn 1** giá trị, kết hợp VÀ.
- **Cài đặt** (`SettingsPage.jsx`): danh sách "Row", "Quản lý phân loại" mở `CategoryManagerModal` qua prop `onManageCategories`. Có Row **"Cỡ chữ — Sắp có"** (món cỡ chữ/zoom nay đã BỎ khỏi roadmap).

## 5. Thiết kế chi tiết

### 5.1 Nguyên tắc nền + chuẩn hoá tag
- **KHÔNG thêm bảng CSDL, KHÔNG migration.** Tag vẫn lưu y như cũ (chuỗi ngăn phẩy). "Danh sách tag" = **quét mảng `problems` đã nạp sẵn** rồi gom + đếm (in-memory, rẻ ở quy mô này).
- **Danh tính tag = chuỗi đã trim**, phân biệt hoa/thường và dấu. `cực trị` ≠ `Cực trị` ≠ `cuc tri` (là các tag khác nhau về lưu trữ — đúng bản chất hiện tại). Việc gộp là thao tác **có chủ đích** của Thầy trong màn quản lý.
- **Chỉ "không phân biệt hoa/thường/dấu" ở 2 chỗ giúp việc** (dùng lại `normalizeVi`):
  - **Gợi ý khi gõ**: gõ `cuc tri` vẫn xổ ra `cực trị` đang có → Thầy chọn bản chuẩn thay vì đẻ biến thể.
  - **Sắp xếp màn quản lý**: sắp A→Z theo bản chuẩn-hoá → các biến thể (`cực trị`/`Cực trị`) nằm **sát nhau**, dễ thấy để gộp.
- **Helper thuần, có test** — `src/utils/tagUtils.js`:
  - `parseTags(str)` → mảng tag đã trim, bỏ rỗng, **khử trùng trong cùng 1 bài** (giữ thứ tự xuất hiện).
  - `serializeTags(arr)` → chuỗi `"a, b, c"` (chuẩn 1 khoảng trắng sau dấu phẩy).
  - `buildTagIndex(problems)` → `[{ tag, count }]` (đếm số **bài** dùng mỗi tag; 1 bài đếm 1 lần cho 1 tag).
  - `suggestTags(index, query, chosenSet)` → gợi ý đã lọc: khớp không dấu/không hoa-thường, **bỏ các tag đã chọn trong bài**, xếp *khớp-đầu-chuỗi trước, rồi khớp-giữa*, rồi theo số bài giảm dần.
  - `applyTagRename(tagsStr, oldTag, newTag)` → chuỗi mới: thay `oldTag`→`newTag`, **khử trùng (tự gộp nếu newTag đã có trong bài)**, bỏ rỗng.
  - `applyTagDelete(tagsStr, tag)` → chuỗi mới bỏ hẳn `tag`.
  - `matchTagFilter(problemTags[], selectedTags[], mode)` → `boolean`: `selectedTags` rỗng ⇒ `true`; `mode='and'` ⇒ bài đủ **mọi** tag; `mode='or'` ⇒ bài có **ít nhất một** tag. (Hàm thuần để lọc — dễ test, không nằm rải trong `DataGrid`.)

### 5.2 Ô nhập tag kiểu viên (chip) — `TagChipInput.jsx` (dùng trong `ClassificationPicker`)
- Component mới `src/components/TagChipInput.jsx`, props: `value` (chuỗi ngăn phẩy), `onChange(newString)`, `allTags` (danh sách gợi ý = `buildTagIndex(problems)`).
- **Hiển thị**: mỗi tag một **viên** (chip) có nút ✕ xoá; kế đó là ô "gõ thêm…".
- **Gõ để thêm**:
  - Đang gõ → **xổ danh sách gợi ý** (từ `suggestTags`), điều hướng ↑/↓, Enter/click để chọn → thêm viên đó.
  - Gõ tag **mới** (không trùng gợi ý) + Enter (hoặc dấu phẩy) → thêm viên mới.
  - **Chặn thêm trùng viên** trong cùng bài; trim trước khi thêm; bỏ qua chuỗi rỗng.
  - Backspace khi ô trống → xoá viên cuối (tiện tay).
- **Ngầm bên dưới**: các viên `serializeTags` lại thành đúng chuỗi ngăn phẩy → `ClassificationPicker` vẫn `onChange({ ...v, tags })` như cũ ⇒ **đường lưu Thêm/Sửa/Import KHÔNG đổi**, dữ liệu cũ đọc lên vẫn chuẩn.
- **Nguồn `allTags`**: tính 1 lần ở `App.jsx` (memo từ `problems`), truyền xuống 3 modal → `ClassificationPicker` → `TagChipInput`.

### 5.3 Lọc bài theo NHIỀU tag (VÀ/HOẶC) — thêm mục vào `FilterSidebar.jsx`
- **Mục "Tag"** đặt dưới mục *Lớp*:
  - Các tag dạng **viên bấm được, CHỌN NHIỀU** (bấm để bật/tắt; viên đang chọn tô đậm). Có ô "tìm tag…" để lọc danh sách khi nhiều tag (viên đã chọn vẫn hiện dù không khớp ô tìm).
  - **Nút gạt chế độ VÀ / HOẶC** ngay đầu mục:
    - **VÀ** (mặc định) — "đủ mọi tag": bài phải có **tất cả** tag đã chọn.
    - **HOẶC** — "có bất kỳ tag": bài có **ít nhất một** tag đã chọn.
  - Nút "Bỏ chọn tag" để xoá riêng lựa chọn tag.
- **Kết hợp với các lọc khác luôn là VÀ**: bài hiện ra khi thoả *(hệ/chuyên đề/độ khó/lớp)* **và** `matchTagFilter(parseTags(bài), selectedTags, mode)`. (Chế độ VÀ/HOẶC chỉ áp **giữa các tag với nhau**; khớp chuỗi tag chính xác.)
- **Mặc định VÀ** cho nhất quán với cách các lọc khác cùng thu hẹp; đổi HOẶC khi muốn gom theo chủ đề rộng.
- **State**: thêm `filterTags` (mảng, mặc định `[]`) + `filterTagMode` (`'and'` | `'or'`, mặc định `'and'`) vào `useUIState.js`; truyền qua `App.jsx` → `DataGrid.jsx` để lọc; gộp cả hai vào "Xoá lọc".

### 5.4 Màn quản lý tag — `TagManagerModal.jsx` (mở từ Cài đặt)
- **Cài đặt**: thêm Row "Quản lý tag" (icon tag) → nút "Mở" gọi prop `onManageTags` (song song `onManageCategories`); `App.jsx` mở `TagManagerModal`.
- **Nội dung modal**:
  - Ô **Tìm** (lọc danh sách) + **Sắp xếp**: `A→Z (không phân biệt hoa/thường/dấu)` *(mặc định)* / `Số bài giảm dần`.
  - Danh sách: mỗi dòng = `tên tag · N bài · [Đổi tên] [Xoá]`.
  - **Đổi tên** (cũng chính là **gộp**): bấm → dòng thành ô sửa (Lưu/Huỷ). Lưu → **hỏi xác nhận kèm số bài** ("Đổi 'so hoc' → 'số học' trên 3 bài?"). Nếu tên mới **trùng tag đã có** ⇒ **tự gộp** (bài lỡ có cả hai chỉ giữ một — nhờ `applyTagRename` khử trùng). Chặn tên mới rỗng.
  - **Xoá**: hỏi xác nhận ("Gỡ tag 'X' khỏi 3 bài? (không xoá bài)") → gỡ khỏi mọi bài.
- Danh sách tag trong modal cũng dựng từ `buildTagIndex(problems)` (tự cập nhật sau khi đổi/xoá vì `loadProblems`).

### 5.5 Độ tin cậy (bám Đợt A #1)
- Đổi tên/gộp/xoá là **ghi hàng loạt** nhiều bài. Thêm:
  - `problemWrites.js`: helper `updateProblemTags(db, id, tagsStr)` = `UPDATE problems SET tags=$1 WHERE id=$2` (chỉ đụng cột `tags`).
  - `useProblems.js`: `renameTag(oldTag, newTag)` / `deleteTag(tag)` — tính danh sách bài bị ảnh hưởng (in-memory), ghi từng bài, **trả `true/false`**, rồi `loadProblems()`. Hỏng ghi ⇒ trả `false`.
- Modal: chỉ báo **"đã đổi/đã xoá"** khi trả `true`; hỏng thì **toast lỗi thật** (không báo thành công giả) + nạp lại để màn khớp CSDL.
- *(Ghi chú transaction — Đợt C):* chưa gói all-or-nothing (plugin SQL dùng pool kết nối). Chấp nhận vì đổi tên là **tìm-thay chuỗi idempotent**: hỏng giữa chừng thì chạy lại an toàn, không hư dữ liệu. Ghim transaction để Đợt C.

## 6. Guardrail (an toàn)
- ❌ **KHÔNG đổi schema DB**, không thêm bảng/cột, không migration. Tag vẫn là cột `tags` chuỗi ngăn phẩy.
- ❌ **KHÔNG đụng đường xuất `.tex`**: `buildProblemTex.js` / `buildContentFile.js` giữ nguyên byte-for-byte ⇒ **golden-file test KHÔNG đổi**.
- ❌ **KHÔNG đụng Rust**, không thêm thư viện.
- ✅ **Giữ nguyên định dạng lưu** (chuỗi ngăn phẩy) ⇒ tương thích dữ liệu cũ + đường lưu Thêm/Sửa/Import.
- ✅ Dọn kèm (nhỏ): **gỡ Row "Cỡ chữ — Sắp có"** trong Cài đặt (món đã BỎ khỏi roadmap 14/07) để không hứa hão.

## 7. Kiểm thử
- **`tagUtils.test.js`** (hàm thuần):
  - `parseTags`: trim, bỏ đoạn rỗng (`"a,,b, "`→`["a","b"]`), khử trùng trong bài (`"a, a"`→`["a"]`), giữ thứ tự.
  - `serializeTags`: `["a","b"]`→`"a, b"`; mảng rỗng → `""`.
  - `buildTagIndex`: đếm đúng số **bài** (bài có `"a, a"` chỉ +1 cho `a`); gộp đúng theo chuỗi chính xác (`Fermat` và `Định lý Fermat` là 2 tag).
  - `suggestTags`: `cuc tri`→ gợi ý `cực trị`; loại tag đã chọn; xếp khớp-đầu trước khớp-giữa; query rỗng xử lý gọn.
  - `applyTagRename`: đổi thường; **gộp khi tên mới đã có** (`"a, b"` đổi `a`→`b` ⇒ `"b"`); đổi chỉ khác hoa/thường (`Fermat`→`fermat`); không đụng bài không chứa tag.
  - `applyTagDelete`: bỏ đúng tag, giữ phần còn lại; bỏ luôn dấu phẩy thừa.
  - `matchTagFilter`: `selectedTags` rỗng ⇒ luôn `true`; `and` cần đủ mọi tag (thiếu 1 ⇒ `false`); `or` chỉ cần 1 tag; bài không tag + có chọn ⇒ `false`.
- **Regression**: chạy full test; **`buildContentFile` golden KHÔNG đổi**; `CI=true npm run build` **0 warning**.
- **GUI** (cần Tauri + SQL ⇒ Claude không tự kiểm được → **Thầy nghiệm thu** trong `npx tauri dev`), checklist:
  - Chip: thêm/xoá viên; gõ ra gợi ý (kể cả gõ không dấu); tạo tag mới; không thêm trùng viên; Sửa bài cũ hiện đúng viên; lưu xong đọc lại đúng.
  - Lọc theo tag: chọn nhiều tag; **VÀ** (đủ mọi tag) vs **HOẶC** (bất kỳ tag) lọc đúng bài; kết hợp với lọc hệ/lớp; ô "tìm tag…" lọc danh sách; "Xoá lọc" xoá cả tag đã chọn + chế độ.
  - Quản lý tag: số bài đúng; sắp A→Z cho biến thể nằm cạnh; đổi tên áp lên mọi bài; **gộp** khi trùng tên; xoá gỡ khỏi mọi bài; xác nhận hiện đúng số bài; báo lỗi thật nếu ghi hỏng.
  - Ví dụ thật: gộp `Định lý Fermat` → `Fermat` (thành 4 bài `Fermat`).

## 8. Những gì KHÔNG làm đợt này (chốt để tránh phình)
- Bảng tag riêng trong CSDL; màu/mô tả/nhóm tag; tag phân cấp.
- Đổi tên/gộp **nhiều tag một lượt** (chỉ làm từng tag — Thầy xác nhận 14/07); gợi ý tự động "các tag này có thể trùng".
- Gắn tag vào file `.tex`.

## 9. Backlog / mở rộng sau
- Gộp nhiều tag một lượt; phát hiện biến thể tự động (gợi ý gộp).
- (Đợt B khác) Quét trùng toàn kho. · (Ma trận v2) lưu mẫu · điểm số.

---
*Thầy đã duyệt thiết kế ("tôi oke nhé"). Bước tiếp: lập Plan (writing-plans) chia task app-chạy-được-sau-mỗi-bước, rồi build.*
