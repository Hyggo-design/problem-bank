# Ma trận v2 — Thêm chiều "Loại câu" — Build Plan

**What we're building:** Nâng lưới "Tạo đề theo ma trận" từ *Chủ đề × Mức độ* thành *Chủ đề × Loại câu × Mức độ* (khớp khuôn ma trận đặc tả), rồi app bốc câu vào Giỏ như cũ.

**Why:** Để Thầy đặt số câu theo cả **loại câu** (Nhiều lựa chọn / Đúng-Sai / Trả lời ngắn / Tự luận) lẫn **mức độ**, phục vụ soạn đề THCS/THPT mẫu mới có trắc nghiệm.

**Approach:** Trường `type` đã có sẵn trên mỗi bài nên KHÔNG đụng schema. Engine thuần `examMatrix.js` thêm một tầng lọc theo `type` (giữ cơ chế chống trùng `usedIds`), rồi `MatrixPage.jsx` dựng lại lưới rộng + ô tick chọn loại câu + hàng/cột tổng. Đường xuất `.tex` không bị chạm (golden-file 3/3 phải giữ nguyên).

**Files we'll create or change:**
- `src/utils/examMatrix.js` — engine bốc câu: thêm tham số `type`, đổi cấu trúc `rows.counts` lồng theo loại câu.
- `src/utils/examMatrix.test.js` — mở rộng test (lọc theo loại câu + ca chồng nhánh không trùng).
- `src/components/MatrixPage.jsx` — dựng lại lưới (cột loại câu × mức độ), ô tick loại câu + mặc định thông minh, hàng/cột tổng.
- *(Chỉ ĐỌC, không sửa)* `src/utils/constants.js` — lấy danh sách `PROBLEM_TYPES` có sẵn.

**Spec:** `.docs/specs/2026-07-14-ma-tran-v2-loai-cau-design.md`

---

### Task 1: Chuẩn bị an toàn (nhánh mới + sao lưu + mốc "trước")

**What you'll have when this is done:** Một nhánh git riêng để làm, một bản sao DB phòng hờ, và số liệu "trước khi sửa" (test/build/golden) để so sánh.

- [ ] Bước 1: Tạo nhánh làm việc riêng (không đụng `master`)
      Chạy: `git checkout -b feat-ma-tran-v2-loai-cau`
      Sẽ thấy: `Switched to a new branch 'feat-ma-tran-v2-loai-cau'`

- [ ] Bước 2: Sao lưu DB (dù tính năng này KHÔNG đổi cấu trúc DB — vẫn phòng hờ)
      Chạy (PowerShell): `Copy-Item "D:\0. Problems Bank\app-data\problem_bank.db" "D:\0. Problems Bank\app-data\problem_bank.backup-2026-07-14.db"`
      Sẽ thấy: file `problem_bank.backup-2026-07-14.db` xuất hiện trong thư mục `app-data`.

- [ ] Bước 3: Ghi lại mốc "trước" — chạy toàn bộ test
      Chạy: `CI=true npm test`
      Sẽ thấy: tất cả test XANH (ghi lại tổng số, ví dụ `Tests: 55 passed`). Trong đó có golden-file `buildContentFile` (khoá định dạng xuất `.tex`).

- [ ] Bước 4: Ghi lại mốc "trước" — build sạch
      Chạy: `CI=true npm run build`
      Sẽ thấy: `Compiled successfully` (0 warning). Đây là chuẩn để mọi task sau vẫn phải giữ 0 warning.

*(Task này không đổi code nên chưa commit.)*

---

### Task 2: Engine — thêm lọc theo "loại câu" (viết test trước)

**What you'll have when this is done:** Hàm bốc câu trong `examMatrix.js` hiểu thêm chiều loại câu và có test chứng minh: lọc đúng loại + không bốc trùng khi 1 bài ở 2 nhánh.

- [ ] Bước 1: Viết test cho hành vi MỚI trước (sẽ đỏ vì code chưa có) — thêm vào cuối `src/utils/examMatrix.test.js`
      Ý các ca cần có (dùng dữ liệu giả + `rng` tất định như các test sẵn có trong file):
      1. `candidatesForCell` chỉ trả bài đúng `type` (bài khác loại bị loại dù đúng nhánh + mức).
      2. `generateExamMatrix` với `rows` kiểu mới + `types`: bốc đúng theo (nhánh × loại × mức).
      3. **Ca chồng nhánh:** 1 bài gắn 2 nhánh, đặt số ở cả 2 ô cùng (loại · mức) → bài chỉ ra **1 lần**; ô sau lấp bằng bài khác nếu còn, hết bài thì `shortfall > 0`.
      4. `countAvailableForCell` và `pickReplacementProblem` đếm/đổi đúng theo `type`.
      Mẫu một ca (chép và mở rộng theo khuôn test có sẵn):
      ```js
      test('không bốc trùng khi 1 bài ở 2 nhánh', () => {
        const problems = [
          { id: 'C', type: 'Tự luận', difficultyByHe: { H: 'd1' }, categoryIds: ['nhanhA', 'nhanhB'], gradeIds: [] },
          { id: 'A2', type: 'Tự luận', difficultyByHe: { H: 'd1' }, categoryIds: ['nhanhA'], gradeIds: [] },
        ];
        const childrenMap = {};
        const rows = [
          { rowId: 'r1', categoryId: 'nhanhA', counts: { 'Tự luận': { d1: 1 } } },
          { rowId: 'r2', categoryId: 'nhanhB', counts: { 'Tự luận': { d1: 1 } } },
        ];
        const res = generateExamMatrix({
          problems, childrenMap, heId: 'H', gradeId: null, rows,
          types: ['Tự luận'], recentUsageIds: new Set(), rng: () => 0,
        });
        const ids = res.pickedProblems.map((p) => p.id).sort();
        expect(ids).toEqual(['A2', 'C']);          // 2 bài KHÁC nhau
        expect(res.pickedProblems.length).toBe(2); // không trùng
      });
      ```

- [ ] Bước 2: Chạy test để thấy nó ĐỎ (đúng như mong đợi, vì engine chưa hỗ trợ)
      Chạy: `CI=true npm test`
      Sẽ thấy: các ca mới FAIL; các ca cũ vẫn PASS.

- [ ] Bước 3: Sửa `src/utils/examMatrix.js` — thay 4 hàm dưới đây (giữ nguyên `collectDescendantIds`, `shuffle`, `rankAndPick`):
      ```js
      // Thêm tham số `type`: chỉ nhận bài đúng loại câu.
      const candidatesForCell = (problems, childrenMap, heId, gradeId, categoryId, type, difficultyId, excludeIds) => {
        const inBranch = new Set(collectDescendantIds(categoryId, childrenMap));
        return (problems || []).filter((p) =>
          !excludeIds.has(p.id) &&
          p.type === type &&
          (p.difficultyByHe || {})[heId] === difficultyId &&
          (p.categoryIds || []).some((cid) => inBranch.has(cid)) &&
          (!gradeId || (p.gradeIds || []).includes(gradeId))
        );
      };

      // rows: [{ rowId, categoryId, counts: { [type]: { [difficultyId]: number } } }]
      // types: mảng loại câu ĐANG bật (đúng thứ tự cột). usedIds chung -> chống trùng toàn đề.
      export const generateExamMatrix = ({ problems, childrenMap, heId, gradeId, rows, types, recentUsageIds, rng = Math.random }) => {
        const usedIds = new Set();
        const cells = [];
        for (const row of (rows || [])) {
          for (const type of (types || [])) {
            const byDiff = (row.counts && row.counts[type]) || {};
            for (const [difficultyId, rawCount] of Object.entries(byDiff)) {
              const n = parseInt(rawCount, 10) || 0;
              if (n <= 0) continue;
              const cands = candidatesForCell(problems, childrenMap, heId, gradeId, row.categoryId, type, difficultyId, usedIds);
              const picked = rankAndPick(cands, n, recentUsageIds, rng);
              picked.forEach((p) => usedIds.add(p.id));
              cells.push({ rowId: row.rowId, categoryId: row.categoryId, type, difficultyId, requested: n, picked, shortfall: n - picked.length });
            }
          }
        }
        const pickedProblems = [];
        const seen = new Set();
        for (const c of cells) for (const p of c.picked) if (!seen.has(p.id)) { seen.add(p.id); pickedProblems.push(p); }
        const totalRequested = cells.reduce((s, c) => s + c.requested, 0);
        return { cells, pickedProblems, totalRequested, totalPicked: pickedProblems.length };
      };

      export const countAvailableForCell = ({ problems, childrenMap, heId, gradeId, categoryId, type, difficultyId }) =>
        candidatesForCell(problems, childrenMap, heId, gradeId, categoryId, type, difficultyId, new Set()).length;

      export const pickReplacementProblem = ({ problems, childrenMap, heId, gradeId, categoryId, type, difficultyId, excludeIds, recentUsageIds, rng = Math.random }) => {
        const cands = candidatesForCell(problems, childrenMap, heId, gradeId, categoryId, type, difficultyId, excludeIds);
        const picked = rankAndPick(cands, 1, recentUsageIds, rng);
        return picked[0] || null;
      };
      ```

- [ ] Bước 4: Kiểm — chạy lại test
      Chạy: `CI=true npm test`
      Sẽ thấy: TẤT CẢ xanh (ca mới lẫn cũ). **Golden `buildContentFile` phải vẫn 3/3** (engine không đụng xuất `.tex`).

- [ ] Bước 5: Lưu tiến độ
      Chạy: `git add src/utils/examMatrix.js src/utils/examMatrix.test.js && git commit -m "feat(matrix): engine loc theo loai cau + test chong trung da nhanh"`
      *(Lưu ý: sau task này màn "Tạo đề theo ma trận" tạm chưa khớp — sẽ nối lại ở Task 3. Phần còn lại của app không bị ảnh hưởng vì chỉ MatrixPage dùng engine này. Đây đúng nếp cũ: commit util+test trước, MatrixPage sau.)*

---

### Task 3: Lưới mới trong MatrixPage — cột Loại câu × Mức độ (hiện đủ loại)

**What you'll have when this is done:** Trang "Tạo đề theo ma trận" hiện lưới rộng với các cột loại câu × mức độ; điền số → Tạo đề → xem lại → Đưa vào Giỏ chạy đúng. (Ô tick chọn loại + tổng làm ở task sau; task này tạm hiện đủ 4 loại.)

- [ ] Bước 1: Khai báo nhãn + thứ tự loại câu ở đầu `src/components/MatrixPage.jsx` (ngay sau các import). Import thêm `PROBLEM_TYPES` để đối chiếu (không sửa file constants).
      ```js
      import { PROBLEM_TYPES } from '../utils/constants';
      // Thứ tự cột: 3 loại TNKQ trước, Tự luận cuối (như ảnh ma trận).
      const TYPE_ORDER = ['Trắc nghiệm 4 lựa chọn', 'Đúng/Sai', 'Trả lời ngắn', 'Tự luận'];
      const TYPE_LABEL = {
        'Trắc nghiệm 4 lựa chọn': 'Nhiều lựa chọn',
        'Đúng/Sai': 'Đúng – Sai',
        'Trả lời ngắn': 'Trả lời ngắn',
        'Tự luận': 'Tự luận',
      };
      ```
      *(Chốt an toàn: `TYPE_ORDER` chứa đúng 4 giá trị của `PROBLEM_TYPES`. Nếu sau này `constants` đổi, chỉ cần sửa 2 hằng này.)*

- [ ] Bước 2: Đổi cấu trúc `counts` (lồng theo loại câu) + hàm `setCount`. Thay hàm `setCount` cũ bằng:
      ```js
      // counts: { [type]: { [difficultyId]: number } }
      const setCount = (rowId, type, diffId, value) => {
        const n = Math.max(0, parseInt(value, 10) || 0);
        setRows((prev) => prev.map((r) =>
          r.rowId === rowId
            ? { ...r, counts: { ...r.counts, [type]: { ...(r.counts[type] || {}), [diffId]: n } } }
            : r
        ));
      };
      ```
      `addRow`/`addAllLevel1` giữ `counts: {}` như cũ (rỗng, điền dần theo loại). `totalRequested` đổi cách cộng:
      ```js
      const sumRow = (r) => TYPE_ORDER.reduce((s, t) => s + Object.values(r.counts[t] || {}).reduce((a, b) => a + (b || 0), 0), 0);
      const totalRequested = rows.reduce((s, r) => s + sumRow(r), 0);
      ```

- [ ] Bước 3: Nối `runGenerate` và `swapOne` sang engine mới (thêm `types`/`type`). Task này tạm dùng **tất cả loại**:
      ```js
      const activeTypes = TYPE_ORDER; // task 4 sẽ thay bằng state selectedTypes
      const runGenerate = () => {
        const res = generateExamMatrix({ problems, childrenMap, heId: effectiveHeId, gradeId: gradeId || null, rows, types: activeTypes, recentUsageIds });
        setReviewCells(res.cells.map((c) => ({ ...c })));
        setMode('review');
      };
      ```
      Trong `swapOne`, thêm `type: cell.type` vào lời gọi `pickReplacementProblem`. Trong nhãn ô xem lại, đổi thành: `{pathWithinHe(c.categoryId)} — {TYPE_LABEL[c.type]} — {diffNameById[c.difficultyId]}`.

- [ ] Bước 4: Dựng lại bảng chế độ `build` (phần `<table>`): tiêu đề 2 tầng (loại câu → mức độ), thân là ô số theo (loại × mức) + "còn X". Khung JSX:
      ```jsx
      <thead>
        <tr>
          <th style={th} rowSpan={2}>Chủ đề</th>
          {activeTypes.map((t) => (
            <th key={t} style={{ ...th, textAlign: 'center' }} colSpan={heDifficulties.length}>{TYPE_LABEL[t]}</th>
          ))}
        </tr>
        <tr>
          {activeTypes.map((t) => heDifficulties.map((d) => (
            <th key={t + d.id} style={{ ...th, textAlign: 'center', fontWeight: 500 }}>{d.name}</th>
          )))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.rowId}>
            <td style={{ ...td, fontWeight: 600 }}>{pathWithinHe(r.categoryId)}</td>
            {activeTypes.map((t) => heDifficulties.map((d) => {
              const avail = countAvailableForCell({ problems, childrenMap, heId: effectiveHeId, gradeId: gradeId || null, categoryId: r.categoryId, type: t, difficultyId: d.id });
              return (
                <td key={t + d.id} style={{ ...td, textAlign: 'center' }}>
                  <input type="number" min="0" style={numInput} value={(r.counts[t] || {})[d.id] || ''} onChange={(e) => setCount(r.rowId, t, d.id, e.target.value)} />
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>còn {avail}</div>
                </td>
              );
            }))}
            <td style={{ ...td, textAlign: 'center' }}>
              <button title="Bỏ dòng" onClick={() => removeRow(r.rowId)} style={{ ...btn, padding: 6 }}><X size={14} /></button>
            </td>
          </tr>
        ))}
      </tbody>
      ```
      *(Bọc `<table>` trong `<div style={{ overflowX: 'auto' }}>` để không tràn ngang khi nhiều cột.)*

- [ ] Bước 5: Kiểm build + kiểm mắt bằng app thật
      Chạy: `CI=true npm run build`  → `Compiled successfully` (0 warning).
      Chạy: `npx tauri dev` → mở "Tạo đề theo ma trận", chọn hệ Toán Chuyên, Thêm 1 chủ đề, điền vài số ở cột **Tự luận**, bấm **Tạo đề** → thấy các ô xem lại có nhãn "Chủ đề — Tự luận — Mức" → **Đưa vào Giỏ** đếm đúng.
      Nếu OK: `git add src/components/MatrixPage.jsx && git commit -m "feat(matrix): luoi cot loai cau x muc do + noi engine moi"`

---

### Task 4: Ô tick chọn loại câu + mặc định thông minh

**What you'll have when this is done:** Hàng ô tick 4 loại câu; mặc định chỉ bật loại **đang có bài** trong hệ; loại tắt thì ẩn cột và không bốc; bỏ tick không mất số đã gõ.

- [ ] Bước 1: Thêm state + hàm tính mặc định (thay `const activeTypes = TYPE_ORDER;` ở Task 3)
      ```js
      const [selectedTypes, setSelectedTypes] = useState(TYPE_ORDER);
      // Loại câu "có bài" trong hệ = tồn tại bài đúng type + có độ khó trong hệ này.
      const defaultTypesFor = (heIdArg) => {
        const has = new Set();
        for (const p of (problems || [])) {
          if (p.type && (p.difficultyByHe || {})[heIdArg]) has.add(p.type);
        }
        const def = TYPE_ORDER.filter((t) => has.has(t));
        return def.length ? def : [...TYPE_ORDER]; // hệ chưa có bài -> hiện đủ để còn dựng được
      };
      const activeTypes = TYPE_ORDER.filter((t) => selectedTypes.includes(t)); // giữ đúng thứ tự cột
      ```

- [ ] Bước 2: Đặt mặc định lúc mở trang + khi đổi hệ. Thêm `useEffect` cho lần đầu, và gọi trong `changeHe`:
      ```js
      useEffect(() => { setSelectedTypes(defaultTypesFor(effectiveHeId)); /* eslint-disable-next-line */ }, [effectiveHeId]);
      ```
      *(Đổi hệ làm `effectiveHeId` đổi → effect tự đặt lại mặc định. `changeHe` giữ nguyên phần reset rows.)*

- [ ] Bước 3: Thêm hàng ô tick ngay trên bảng (trong nhánh `mode === 'build'`, trước `<table>`):
      ```jsx
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', padding: '0.6rem 0.8rem', border: '1px solid var(--color-border)', borderRadius: 8, marginBottom: 12 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Loại câu dùng cho đề:</span>
        {TYPE_ORDER.map((t) => {
          const hasData = defaultTypesFor(effectiveHeId).includes(t) || (problems || []).some((p) => p.type === t && (p.difficultyByHe || {})[effectiveHeId]);
          return (
            <label key={t} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.85rem', color: hasData ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
              <input type="checkbox" checked={selectedTypes.includes(t)}
                onChange={(e) => setSelectedTypes((prev) => e.target.checked ? [...prev, t] : prev.filter((x) => x !== t))} />
              {TYPE_LABEL[t]}{!hasData && <span style={{ fontSize: '0.72rem' }}>(chưa có bài)</span>}
            </label>
          );
        })}
      </div>
      ```
      *(Bỏ tick chỉ đổi `selectedTypes`; `rows[].counts[type]` vẫn còn nguyên trong state nên tick lại là số cũ hiện lại. Cột render theo `activeTypes` nên loại tắt tự ẩn; `runGenerate` truyền `types: activeTypes` nên loại tắt không bốc.)*

- [ ] Bước 4: Kiểm build + app thật
      Chạy: `CI=true npm run build` → 0 warning.
      Chạy: `npx tauri dev` → Toán Chuyên chỉ bật sẵn **Tự luận** (3 loại kia mờ + "(chưa có bài)"); tick "Nhiều lựa chọn" → hiện thêm cụm cột; gõ số rồi bỏ tick rồi tick lại → **số cũ còn nguyên**.
      Nếu OK: `git add src/components/MatrixPage.jsx && git commit -m "feat(matrix): o tick chon loai cau + mac dinh thong minh"`

---

### Task 5: Cột "Tổng" mỗi hàng + hàng "Tổng số câu" mỗi cột

**What you'll have when this is done:** Bảng có cột Tổng bên phải (theo chủ đề) và hàng Tổng số câu dưới cùng (theo từng cột), giống khuôn ảnh.

- [ ] Bước 1: Thêm cột "Tổng" vào tiêu đề (ô `rowSpan={2}` cuối hàng tiêu đề 1) và mỗi hàng thân:
      ```jsx
      // thead, hàng 1: thêm sau vòng map loại câu
      <th style={{ ...th, textAlign: 'center' }} rowSpan={2}>Tổng</th>
      // tbody, mỗi <tr>: thêm ô cuối trước nút bỏ dòng
      <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{sumRow(r)}</td>
      ```

- [ ] Bước 2: Thêm `<tfoot>` "Tổng số câu" (cộng theo từng cột (loại × mức) trên mọi hàng):
      ```jsx
      <tfoot>
        <tr>
          <td style={{ ...td, fontWeight: 700 }}>Tổng số câu</td>
          {activeTypes.map((t) => heDifficulties.map((d) => {
            const colSum = rows.reduce((s, r) => s + ((r.counts[t] || {})[d.id] || 0), 0);
            return <td key={t + d.id} style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{colSum}</td>;
          }))}
          <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{totalRequested}</td>
        </tr>
      </tfoot>
      ```
      *(Giữ nguyên dòng "Tổng: {totalRequested} câu" + nút Tạo đề bên dưới bảng như cũ.)*

- [ ] Bước 3: Kiểm build + app thật
      Chạy: `CI=true npm run build` → 0 warning.
      Chạy: `npx tauri dev` → điền số nhiều hàng/nhiều loại → cột Tổng mỗi hàng + hàng Tổng số câu cộng đúng; khớp "Tổng: N câu".
      Nếu OK: `git add src/components/MatrixPage.jsx && git commit -m "feat(matrix): cot tong hang + hang tong so cau"`

---

### Task 6: Kiểm toàn diện + an toàn LaTeX + bàn giao nghiệm thu

**What you'll have when this is done:** Bằng chứng cả bộ vẫn xanh, xuất `.tex` không đổi, đúng 3 file bị sửa; và checklist để Thầy nghiệm thu GUI.

- [ ] Bước 1: Chạy toàn bộ test
      Chạy: `CI=true npm test`
      Sẽ thấy: tất cả xanh; **golden `buildContentFile` 3/3 KHÔNG đổi** (chứng minh xuất `.tex` byte-identical vì ta không đụng `buildProblemTex`/`buildContentFile`).

- [ ] Bước 2: Build sạch
      Chạy: `CI=true npm run build` → `Compiled successfully`, 0 warning.

- [ ] Bước 3: Xác nhận đúng phạm vi — chỉ 3 file đổi so với `master`
      Chạy: `git diff --name-only master`
      Sẽ thấy ĐÚNG: `src/utils/examMatrix.js`, `src/utils/examMatrix.test.js`, `src/components/MatrixPage.jsx` (KHÔNG có `buildProblemTex.js`/`buildContentFile.js`/`db.js`/`ExportModal.jsx`/Rust).

- [ ] Bước 4: **Kiểm an toàn LaTeX đầu-cuối (bắt buộc)** trong `npx tauri dev`:
      1. Toán Chuyên → Thêm 1 chủ đề → đặt 1 câu ở (Tự luận · Cơ bản) → **Tạo đề** → **Đưa vào Giỏ**.
      2. Sang Giỏ → **Xuất file nội dung** → chọn template → Save As ra `.tex`.
      3. Mở file `.tex` vừa xuất: khối `\begin{bt} ... \end{bt}` của bài phải **đầy đủ, đúng công thức** (ví dụ có `$...$`), y như trước khi làm tính năng này.

- [ ] Bước 5: Checklist Thầy nghiệm thu GUI (chạy `npx tauri dev`):
      - [ ] Toán Chuyên hiện đủ 4 cột mức độ (Cơ bản/TB/Nâng cao/Đề thi); THCS/THPT hiện 3.
      - [ ] Mặc định chỉ bật loại **Tự luận** (loại chưa có bài mờ + "(chưa có bài)").
      - [ ] Bốc câu đúng loại · đúng mức; **1 bài ở 2 nhánh chọn cả 2 → chỉ ra 1 lần**; ô thiếu báo "cần X, chỉ có Y".
      - [ ] Đổi câu / Bỏ / Bốc lại / Sửa ma trận / Đưa vào Giỏ đều chạy.
      - [ ] Cột Tổng + hàng Tổng số câu cộng đúng.

- [ ] Bước 6: Sau khi Thầy nghiệm thu OK — gộp vào `master` và đẩy lên
      Chạy: `git checkout master && git merge --no-ff feat-ma-tran-v2-loai-cau -m "Merge: Ma tran v2 - them chieu loai cau (Dot B)"`
      Rồi: `git push`
      *(Nếu Thầy muốn xem trước khi push thì dừng ở merge, chưa `push`.)*

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Đọc hết plan một lượt trước khi bắt đầu.
2. Làm lần lượt theo thứ tự task — không nhảy cóc.
3. Xong bước "Kiểm" của mỗi task rồi mới sang task sau.
4. Nếu có gì không như mong đợi, DỪNG và mô tả đúng cái đang thấy — đừng sửa mò.

Nói "bắt đầu build" khi Thầy sẵn sàng làm Task 1.
