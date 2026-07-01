# Tìm kiếm sâu hơn — Design Spec

**Ngày:** 01/07/2026
**Trạng thái:** Thiết kế đã chốt (Thầy duyệt 01/07/2026; brainstorm phiên này). Antigravity build → Claude check.

## Mục tiêu
Nâng cấp ô tìm kiếm ở feed thẻ. Hiện tại (`DataGrid.jsx:44-46`) chỉ khớp **chuỗi liền** trong `p.statement` + `p.tags`, **phân biệt dấu**. Ba cải tiến Thầy chốt:
1. **Soi cả lời giải** — từ khóa được tìm trong `p.solution` nữa (ngoài đề + tag).
2. **Bỏ dấu tiếng Việt** — 2 chiều: `phuong trinh` khớp `phương trình`, và ngược lại. Xử lý riêng chữ `đ/Đ`.
3. **Nhiều từ khóa, khớp TẤT CẢ** — gõ `parabol tiếp tuyến` ra bài chứa **cả hai** từ, dù rải rác ở đề hoặc lời giải (điều kiện VÀ; không cần liền nhau, không cần cùng một phần).

Phụ: khi bài lọt vào **vì** từ khóa ở **lời giải/tag** (không có ở đề) → thẻ hiện **nhãn nhỏ** "khớp: lời giải / tag" để Thầy hiểu vì sao. Bỏ tìm-theo-ID (YAGNI) → sửa lại placeholder cho khỏi hiểu nhầm.

## Điểm cốt lõi về an toàn
**KHÔNG đụng đường xuất** (`buildProblemTex`, `db.js`, schema, bảng) — tìm kiếm chỉ là cách **đọc & so khớp** khi hiển thị, không đổi dữ liệu, không thêm cột. ⇒ **Golden test xuất giữ nguyên (3/3).** Logic "bỏ dấu + so khớp" tách ra **util thuần** `src/utils/searchText.js` để **viết test khoá** (giống `findDuplicates.js`/`extractFigures.js`).

---

## Hàm thuần & cấu trúc dữ liệu

### `src/utils/searchText.js` (MỚI)
- **`normalizeVi(str)`** → chuỗi đã bỏ dấu + thường hóa:
  - `.normalize('NFD')` tách dấu tổ hợp khỏi chữ cái, rồi **bỏ mọi ký tự tổ hợp** (code point U+0300–U+036F) bằng **vòng lặp** — dùng vòng lặp thay cho regex khoảng mã để tránh rắc rối thoát ký tự khi copy vào file;
  - thay `đ`→`d`, `Đ`→`D` (ký tự riêng U+0111, NFD **không** tách), rồi `.toLowerCase()`;
  - Ký tự ASCII/LaTeX (`\frac{1}{2}`, `x^2`) giữ nguyên → tìm trong nguồn LaTeX vẫn được.
- **`makeSearchFields(problem)`** → `{ statement, solution, tags }` (mỗi trường đã `normalizeVi`). Dùng dựng **chỉ mục nhớ sẵn** (không tính lại mỗi phím).
- **`matchFields(fields, query)`** → `{ matched, hitFields }`:
  - `words = normalizeVi(query).split(/\s+/).filter(Boolean)`; **query rỗng → `{ matched: true, hitFields: [] }`** (không lọc, không nhãn);
  - `combined = statement + ' ' + solution + ' ' + tags`;
  - **khớp TẤT CẢ (VÀ):** `matched = words.every(w => combined.includes(w))`;
  - `hitFields ⊆ ['solution','tags']`: gắn `'solution'` nếu **có từ khóa nằm trong `solution` nhưng KHÔNG có trong `statement`**; tương tự `'tags'`. (Chỉ nêu chỗ khớp *không hiển nhiên* — đề đã hiện sẵn nên không gắn nhãn cho đề.)

### `src/utils/searchText.test.js` (MỚI — viết trước)
- `normalizeVi`: "Phương Trình" → "phuong trinh"; "Đường tròn" → "duong tron"; công thức LaTeX giữ nguyên.
- `matchFields`: (a) 1 từ ở đề → `matched`, `hitFields=[]`; (b) 1 từ chỉ ở lời giải → `matched`, `hitFields=['solution']`; (c) 2 từ rải rác đề+giải → `matched`; (d) thiếu 1 từ → `!matched`; (e) không dấu khớp có dấu; (f) query rỗng → `matched=true`; (g) từ khóa ở cả đề lẫn giải → `hitFields=[]` (không gắn nhãn thừa).

## Feed thẻ (`DataGrid.jsx`)
- Import `makeSearchFields`, `matchFields`.
- **Chỉ mục nhớ sẵn:** `const searchIndex = useMemo(() => new Map(problems.map(p => [p.id, makeSearchFields(p)])), [problems])` — chỉ tính lại khi kho đổi.
- Trong `filteredAndSorted` (useMemo): thay khối tìm cũ (dòng 44-46) bằng cổng `matchFields(searchIndex.get(p.id), searchTerm)` → `!matched` thì loại. Giữ nguyên thứ tự: tìm kiếm chạy **trước** `unclassifiedMode`/lọc hệ/nhánh/lớp/độ khó (điều kiện VÀ như hiện nay).
- Dựng thêm **`matchFieldsById`** (`id → ['solution'|'tags']`) cho các bài **sống sót** khi có `searchTerm`; thêm `searchIndex` vào mảng phụ thuộc useMemo.
- Ở `itemContent`: truyền `matchFields={matchFieldsById[problem.id]}` xuống `ProblemCard`.
- Empty placeholder giữ nguyên ("Không có bài nào khớp bộ lọc").

## Nhãn "khớp ở đâu" (`ProblemCard.jsx`)
- Nhận thêm prop tùy chọn **`matchFields`** (mảng, có thể `undefined`).
- Ở VÙNG 3a (dòng meta 82-89, cạnh "· 📐 Có hình"): nếu `matchFields?.length` → hiện inline nhẹ, ví dụ `· 🔍 khớp: lời giải` (map `solution`→"lời giải", `tags`→"tag"; nhiều thì nối bằng ", "). Màu muted/cobalt, cùng phong cách các chỉ dấu meta sẵn có. Không có search / khớp ở đề → không hiện gì.

## Ô tìm (`ControlsRow.jsx`)
- Đổi placeholder: `"Tìm kiếm theo ID, từ khóa, tag... (Ctrl + F)"` → `"Tìm trong đề, lời giải, tag… (Ctrl + F)"` (bỏ "ID").

## Mức can thiệp Code
- **MỚI:** `src/utils/searchText.js` + `src/utils/searchText.test.js`.
- `src/components/DataGrid.jsx` — `searchIndex` + cổng `matchFields` + `matchFieldsById` + truyền prop.
- `src/components/ProblemCard.jsx` — render nhãn `matchFields`.
- `src/components/ControlsRow.jsx` — đổi placeholder.
- **KHÔNG** đụng `buildProblemTex.js`, `db.js`, schema, `useProblems.js`, đường xuất.

## Hiệu năng
Chuẩn hóa (bỏ dấu) mỗi bài tính **1 lần**, nhớ trong `searchIndex` (useMemo theo `problems`), chỉ tính lại khi kho đổi. Mỗi phím gõ chỉ chuẩn hóa **từ khóa** (ngắn) + so chuỗi trên chuỗi đã chuẩn hóa → nhẹ. Đủ nhanh cho vài nghìn bài; **không cần debounce**. (Nếu sau này kho cực lớn mới tính tới FTS trong DB — ngoài phạm vi.)

## Rủi ro
- `matchFieldsById` phải ổn định trong một lượt lọc → đặt trong cùng useMemo với danh sách (không tạo mới mỗi render) để Virtuoso không nháy.
- `normalizeVi` chạy trên lời giải dài × toàn kho: đã chặn bằng nhớ sẵn (một lần mỗi lần data đổi).
- Chữ `đ/Đ` — thay tay, đã có test.
- Tìm trong nguồn LaTeX: khớp theo văn bản thô (gõ `frac` có thể ra bài chứa `\frac`) — chấp nhận, không phải lỗi.

## Nghiệm thu
- **Claude check:** chỉ 5 file trên đổi (KHÔNG buildProblemTex/db/schema/useProblems); `npm run build` 0 warning; **test mới pass** + **golden 3/3 không đổi**.
- **Thầy (GUI):** gõ không dấu ra bài có dấu; gõ 2 từ ra bài chứa cả hai (rải rác đề+giải); bài khớp nhờ lời giải hiện nhãn "🔍 khớp: lời giải"; xóa ô tìm → về danh sách đầy đủ; tìm kiếm vẫn chồng đúng lên lọc chuyên đề/độ khó/lớp.
