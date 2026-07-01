# Tìm kiếm sâu hơn — Build Plan

**What we're building:** Ô tìm ở feed thẻ giờ (1) **soi cả lời giải** (không chỉ đề + tag), (2) **bỏ dấu tiếng Việt** (gõ "phuong trinh" ra "phương trình"), (3) **nhiều từ khóa khớp TẤT CẢ** (gõ "parabol tiếp tuyến" ra bài chứa cả hai, rải rác đề/lời giải).

**Why:** Nhập data thật xong sẽ có nhiều bài — tìm nhanh và đúng hơn, không phụ thuộc gõ đúng dấu hay nhớ đúng cụm liền nhau; và biết vì sao một bài hiện ra (nhãn "khớp: lời giải").

**Approach:** Tách toàn bộ logic "bỏ dấu + so khớp" ra **util thuần** `src/utils/searchText.js` (để viết test khoá). `DataGrid` dựng sẵn một **chỉ mục nhớ lại** (normalize mỗi bài 1 lần) rồi lọc qua util; thẻ bài hiện **nhãn nhỏ** khi khớp ở lời giải/tag. **KHÔNG đụng đường xuất, DB, schema, hay `useProblems`.**

**Files we'll create or change:**
- `src/utils/searchText.js` — [MỚI] `normalizeVi` + `makeSearchFields` + `matchFields`
- `src/utils/searchText.test.js` — [MỚI] unit test (bỏ dấu, khớp TẤT CẢ, nhãn lời giải, query rỗng)
- `src/components/ProblemCard.jsx` — nhận prop `matchFields`, hiện nhãn "🔍 khớp: lời giải/tag"
- `src/components/ControlsRow.jsx` — đổi placeholder (bỏ "ID")
- `src/components/DataGrid.jsx` — chỉ mục `searchIndex` + cổng lọc `matchFields` + `matchFieldsById` + truyền prop

**Spec:** `.docs/specs/2026-07-01-tim-kiem-sau-design.md` (đọc trước khi build).

> ✅ **An toàn:** `buildProblemTex.js`, `db.js`, schema, `useProblems.js` **KHÔNG đổi** (tìm kiếm chỉ là cách đọc & so khớp khi hiển thị). Golden test xuất giữ nguyên 3/3.

> ℹ️ **Không có ràng buộc thứ tự nguy hiểm:** util mới độc lập; `ProblemCard` chỉ **thêm 1 prop tùy chọn** (không có vẫn chạy). Có thể chạy `npx tauri dev` để nghiệm thu ngay sau Task 3.

---

### Task 1: Tạo util tìm kiếm + viết test (làm & kiểm trước, độc lập giao diện)

**What you'll have when this is done:** Ba hàm thuần `normalizeVi` / `makeSearchFields` / `matchFields`, có test khoá (bỏ dấu, khớp TẤT CẢ từ khóa, gắn nhãn đúng chỗ).

- [ ] Step 1: Tạo file mới `src/utils/searchText.js` với nội dung:
      ```javascript
      // Tìm kiếm sâu: bỏ dấu tiếng Việt + so khớp nhiều từ khóa (VÀ) trên đề + lời giải + tag.
      // Hàm THUẦN, tách riêng để viết test. KHÔNG đụng đường xuất / DB.

      // Bỏ dấu tiếng Việt + thường hóa. Giữ nguyên ASCII/LaTeX (frac, x^2).
      // Dùng vòng lặp theo code point (U+0300–U+036F = khối dấu tổ hợp) để tránh
      // rắc rối thoát ký tự trong regex — chạy như nhau, an toàn khi copy.
      export const normalizeVi = (str = '') => {
        const decomposed = String(str).normalize('NFD'); // tách dấu tổ hợp khỏi chữ cái
        let out = '';
        for (const ch of decomposed) {
          const code = ch.codePointAt(0);
          if (code >= 0x300 && code <= 0x36f) continue;   // bỏ mọi dấu tổ hợp
          out += ch;
        }
        // đ/Đ là ký tự riêng (U+0111), NFD không tách → thay tay; rồi hạ chữ thường.
        return out.replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
      };

      // Dựng sẵn 3 trường đã bỏ dấu cho 1 bài (để nhớ lại, không tính mỗi phím gõ).
      export const makeSearchFields = (problem = {}) => ({
        statement: normalizeVi(problem.statement || ''),
        solution: normalizeVi(problem.solution || ''),
        tags: normalizeVi(problem.tags || ''),
      });

      // So khớp: MỌI từ khóa phải có mặt (VÀ) trong (đề + lời giải + tag).
      // Trả { matched, hitFields }. hitFields ⊆ ['solution','tags']: nơi có từ khóa
      // mà ĐỀ không có (để gắn nhãn "vì sao bài này hiện ra"). Query rỗng → matched=true.
      export const matchFields = (fields = { statement: '', solution: '', tags: '' }, query = '') => {
        const words = normalizeVi(query).split(/\s+/).filter(Boolean);
        if (words.length === 0) return { matched: true, hitFields: [] };

        const combined = `${fields.statement} ${fields.solution} ${fields.tags}`;
        const matched = words.every((w) => combined.includes(w));
        if (!matched) return { matched: false, hitFields: [] };

        const hitFields = [];
        if (words.some((w) => fields.solution.includes(w) && !fields.statement.includes(w))) hitFields.push('solution');
        if (words.some((w) => fields.tags.includes(w) && !fields.statement.includes(w))) hitFields.push('tags');
        return { matched: true, hitFields };
      };
      ```

- [ ] Step 2: Tạo file mới `src/utils/searchText.test.js`:
      ```javascript
      import { normalizeVi, makeSearchFields, matchFields } from './searchText';

      const fields = (statement, solution = '', tags = '') =>
        makeSearchFields({ statement, solution, tags });

      test('normalizeVi: bỏ dấu tiếng Việt + thường hóa', () => {
        expect(normalizeVi('Phương Trình')).toBe('phuong trinh');
        expect(normalizeVi('Đường tròn ngoại tiếp')).toBe('duong tron ngoai tiep');
      });

      test('normalizeVi: giữ nguyên ký tự LaTeX/ASCII', () => {
        expect(normalizeVi('\\frac{1}{2} + x^2')).toBe('\\frac{1}{2} + x^2');
      });

      test('matchFields: 1 từ ở ĐỀ → khớp, không gắn nhãn', () => {
        const r = matchFields(fields('Giải phương trình bậc hai'), 'phuong trinh');
        expect(r.matched).toBe(true);
        expect(r.hitFields).toEqual([]);
      });

      test('matchFields: 1 từ chỉ ở LỜI GIẢI → khớp, nhãn solution', () => {
        const r = matchFields(fields('Cho tam giác ABC', 'Áp dụng định lý Pytago'), 'pytago');
        expect(r.matched).toBe(true);
        expect(r.hitFields).toEqual(['solution']);
      });

      test('matchFields: nhiều từ khớp TẤT CẢ, rải rác đề + lời giải', () => {
        const r = matchFields(fields('Cho parabol (P)', 'Viết phương trình tiếp tuyến của (P)'), 'parabol tiep tuyen');
        expect(r.matched).toBe(true);
      });

      test('matchFields: thiếu 1 từ → không khớp', () => {
        const r = matchFields(fields('Cho parabol (P)', 'Tính diện tích'), 'parabol tiep tuyen');
        expect(r.matched).toBe(false);
      });

      test('matchFields: gõ không dấu khớp nội dung có dấu', () => {
        const r = matchFields(fields('Đường tròn nội tiếp tam giác'), 'duong tron');
        expect(r.matched).toBe(true);
      });

      test('matchFields: query rỗng → khớp (không lọc)', () => {
        const r = matchFields(fields('Bất kỳ'), '   ');
        expect(r.matched).toBe(true);
        expect(r.hitFields).toEqual([]);
      });

      test('matchFields: từ khóa ở cả đề lẫn lời giải → không gắn nhãn thừa', () => {
        const r = matchFields(fields('Tính tích phân', 'Tích phân từng phần'), 'tich phan');
        expect(r.matched).toBe(true);
        expect(r.hitFields).toEqual([]);
      });
      ```

- [ ] Step 3: Check it works
      Run: `npx react-scripts test --watchAll=false`
      You should see: tất cả **pass** — **23 passed** (9 mới của searchText + 6 findDuplicates + 5 extractFigures + **3 golden buildContentFile KHÔNG đổi**). Nếu 1 test lệch, KHÔNG sửa test cho khớp; xem lại logic trong `searchText.js`.

### Task 2: Nhãn "khớp ở đâu" trên thẻ + sửa placeholder ô tìm (2 chỉnh giao diện nhỏ)

**What you'll have when this is done:** `ProblemCard` biết nhận `matchFields` và hiện nhãn; ô tìm không còn chữ "ID" gây hiểu nhầm.

- [ ] Step 1: Mở `src/components/ProblemCard.jsx`. Ở khai báo props (≈ dòng 7–10), THÊM `matchFields` vào danh sách:
      ```javascript
      const ProblemCard = ({
        problem, classification, selected, matchFields,
        onToggleSelect, onPreview, onAddToCart, onEdit, onDelete, onCopied,
      }) => {
      ```
- [ ] Step 2: Trong VÙNG 3a (dòng meta), tìm khối span "Có hình" (≈ dòng 86–88):
      ```jsx
      {(problem.figStatement || problem.figSolution)
        ? <span style={{ color: 'var(--color-cobalt)', fontWeight: 500 }}> · 📐 Có hình</span>
        : ''}
      ```
      Ngay **sau** khối này (vẫn bên trong `<div style={{ marginTop: 6, ... }}>`, tức trước dấu `</div>` ở ≈ dòng 89), THÊM:
      ```jsx
      {matchFields && matchFields.length > 0 && (
        <span style={{ color: 'var(--color-cobalt)', fontWeight: 500 }}>
          {' · 🔍 khớp: ' + matchFields.map((f) => (f === 'solution' ? 'lời giải' : 'tag')).join(', ')}
        </span>
      )}
      ```
- [ ] Step 3: Mở `src/components/ControlsRow.jsx`. Ở ô input (≈ dòng 16), đổi placeholder:
      ```jsx
      placeholder="Tìm kiếm theo ID, từ khóa, tag... (Ctrl + F)"
      ```
      thành:
      ```jsx
      placeholder="Tìm trong đề, lời giải, tag… (Ctrl + F)"
      ```
- [ ] Step 4: Check it works
      Run: `npm run build` → `Compiled successfully.` **0 warning**. (Nhãn chưa hiện gì vì `DataGrid` chưa truyền `matchFields` — sẽ nối ở Task 3.)

### Task 3: Nối DataGrid — chỉ mục + cổng lọc mới + truyền nhãn → nghiệm thu GUI

**What you'll have when this is done:** Gõ ô tìm là lọc theo tìm-kiếm-sâu; bài khớp nhờ lời giải/tag hiện nhãn.

- [ ] Step 1: Mở `src/components/DataGrid.jsx`. Ở khối import đầu file (sau dòng `import ProblemCard from './ProblemCard';`, ≈ dòng 7), THÊM:
      ```javascript
      import { makeSearchFields, matchFields } from '../utils/searchText';
      ```
- [ ] Step 2: Ngay sau khối `const validBranchIds = useMemo(...)` (kết thúc ≈ dòng 40), THÊM chỉ mục tìm kiếm nhớ sẵn:
      ```javascript
      // Chỉ mục tìm kiếm: chuẩn hóa (bỏ dấu) đề + lời giải + tag của mỗi bài, nhớ lại
      // — chỉ tính lại khi kho đổi (không tính mỗi phím gõ).
      const searchIndex = useMemo(
        () => new Map(problems.map((p) => [p.id, makeSearchFields(p)])),
        [problems]
      );
      ```
- [ ] Step 3: Trong `filteredAndSorted`, THAY khối tìm cũ (≈ dòng 44–47):
      ```javascript
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!p.statement.toLowerCase().includes(search) && !(p.tags && p.tags.toLowerCase().includes(search))) return false;
      }
      ```
      bằng 1 dòng dùng util:
      ```javascript
      if (searchTerm && !matchFields(searchIndex.get(p.id), searchTerm).matched) return false;
      ```
- [ ] Step 4: Ở **mảng phụ thuộc** của `filteredAndSorted` useMemo (≈ dòng 68), THÊM `searchIndex`:
      ```javascript
      }, [problems, sortBy, validBranchIds, filterGrade, filterDifficulty, searchTerm, selectedHe, unclassifiedMode, parentMap, searchIndex]);
      ```
- [ ] Step 5: Ngay **sau** khối `filteredAndSorted` (trước `return (`), THÊM useMemo nhãn:
      ```javascript
      // Nhãn "khớp ở đâu" cho các bài đang hiển thị (chỉ khi đang tìm).
      const matchFieldsById = useMemo(() => {
        const map = {};
        if (!searchTerm) return map;
        for (const p of filteredAndSorted) {
          const r = matchFields(searchIndex.get(p.id), searchTerm);
          if (r.hitFields.length) map[p.id] = r.hitFields;
        }
        return map;
      }, [filteredAndSorted, searchIndex, searchTerm]);
      ```
- [ ] Step 6: Trong `itemContent`, ở `<ProblemCard ... />` (≈ dòng 117–127), THÊM prop (ví dụ ngay dưới dòng `classification={classification}`):
      ```jsx
      matchFields={matchFieldsById[problem.id]}
      ```
- [ ] Step 7: Check it works
      Run: `npm run build` → `Compiled successfully.` **0 warning** (không có cảnh báo react-hooks/exhaustive-deps).
      Run: `npx tauri dev`. Kiểm 4 điều:
      1. Gõ **không dấu** một cụm có trong kho (vd `duong tron`) → ra bài có "đường tròn".
      2. Gõ **2 từ** (vd `parabol tiep tuyen`) → chỉ ra bài chứa **cả hai** (dù nằm rải rác đề/lời giải).
      3. Một bài khớp **nhờ lời giải** (từ khóa không có ở đề) → thẻ hiện `🔍 khớp: lời giải`.
      4. **Xóa** ô tìm → về danh sách đầy đủ; tìm kiếm vẫn chồng đúng lên lọc chuyên đề/độ khó/lớp.

### Task 4: Nghiệm thu an toàn xuất + test + lưu

**What you'll have when this is done:** Chắc chắn đường xuất `.tex` KHÔNG đổi (golden 3/3), test xanh, đã commit code.

- [ ] Step 1: Chạy toàn bộ test: `npx react-scripts test --watchAll=false` → **23 passed** (9 searchText + 6 findDuplicates + 5 extractFigures + **3 golden buildContentFile KHÔNG đổi**). Golden không đổi = đường xuất nguyên vẹn.
- [ ] Step 2: `npm run build` → `Compiled successfully.` **0 warning**.
- [ ] Step 3: Kiểm tra an toàn LaTeX (dù tính năng này không đụng xuất): tạo 1 bài có công thức `$x^2 + y^2 = z^2$`, thêm vào giỏ, **Xuất file nội dung** ra `D:\check-search.tex`. Mở file: công thức `$x^2 + y^2 = z^2$` còn nguyên vẹn (chứng tỏ tìm kiếm không làm hỏng nội dung lưu/xuất).
- [ ] Step 4: Lưu tiến độ (spec+plan commit riêng; ở đây chỉ commit code):
      Run: `git add src/utils/searchText.js src/utils/searchText.test.js src/components/ProblemCard.jsx src/components/ControlsRow.jsx src/components/DataGrid.jsx`
      Run: `git commit -m "feat(search): tim kiem sau - bo dau + nhieu tu khoa + soi loi giai"`
      (Chưa push — để Claude check lại trước.)

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order — don't skip ahead
3. Complete the "Check it works" step before moving to the next task
4. If something doesn't work as expected, stop and describe what you see — don't try random fixes

Say "let's start building" when you're ready to begin Task 1.

---

## Ghi chú cho bước Claude check lại
- `git status`: chỉ 5 file trên (+ docs spec/plan). KHÔNG đụng `buildProblemTex.js`, `db.js`, schema, `useProblems.js`, capabilities Rust.
- Test: **23 passed**, trong đó **golden 3/3 KHÔNG đổi** (đường xuất nguyên vẹn) + 9 test searchText (bỏ dấu, khớp TẤT CẢ, nhãn lời giải, query rỗng, không gắn nhãn thừa).
- `searchText.js` là util thuần: `normalizeVi` bỏ dấu bằng vòng lặp code point (U+0300–U+036F) + xử lý `đ/Đ` riêng (NFD không tách); `matchFields` khớp VÀ trên `statement+solution+tags`; `hitFields` chỉ gồm nơi có từ khóa **mà đề không có**.
- `DataGrid`: `searchIndex` (useMemo theo `problems`) nhớ sẵn phần normalize; cổng lọc gọi `matchFields`; `matchFieldsById` trong useMemo riêng (deps đủ `filteredAndSorted, searchIndex, searchTerm`) → không nháy Virtuoso; đã thêm `searchIndex` vào deps của `filteredAndSorted`.
- `ProblemCard`: prop `matchFields` tùy chọn; chỉ hiện nhãn khi mảng có phần tử; map `solution`→"lời giải", `tags`→"tag".
- `ControlsRow`: chỉ đổi chữ placeholder (bỏ "ID" — đã bỏ tìm-theo-ID theo YAGNI).
- Không thêm bảng/cột/localStorage nào; không đổi hành vi lọc chuyên đề/độ khó/lớp (tìm kiếm chồng lên, điều kiện VÀ).
