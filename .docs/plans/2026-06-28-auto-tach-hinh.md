# Tự tách hình + Badge "Có hình" — Build Plan

**What we're building:** App tự phát hiện & tách mã hình (TikZ/ảnh) khỏi mã LaTeX khi Thêm/Sửa/Import (bỏ 2 ô hình thủ công), và hiện chip "📐 Có hình" trên thẻ + Xem đầy đủ.

**Why:** Để nhập/import nhanh (không phải tự copy hình vào ô riêng) và nhìn ra ngay bài nào có hình.

**Approach:** Gom logic tách về một util chung `extractFigures.js` (tách `\begin{bt}` + `\loigiai` + hình); dùng ở Thêm, Sửa, Import. Sửa khi nạp form Sửa thì ghép hình về lại bằng `reconstructProblemLatex`. Thêm badge đọc 2 cột `figStatement`/`figSolution` sẵn có. **KHÔNG đụng đường xuất, schema, hay DB.**

**Files we'll create or change:**
- `src/utils/extractFigures.js` — [MỚI] `extractFigures` + `parseProblemLatex` + `reconstructProblemLatex`
- `src/utils/extractFigures.test.js` — [MỚI] unit test + round-trip
- `src/components/Modals/AddProblemModal.jsx` — bỏ 2 ô hình, dùng `parseProblemLatex`
- `src/components/Modals/EditProblemModal.jsx` — bỏ 2 ô hình, ghép lại khi nạp, `parseProblemLatex` khi lưu
- `src/components/Modals/SmartImportModal.jsx` — `handleFinalSave` dùng `parseProblemLatex`
- `src/components/ProblemCard.jsx` — badge
- `src/components/PreviewPanel.jsx` — badge

**Spec:** `.docs/specs/2026-06-28-auto-tach-hinh-design.md` (đọc trước khi build).

> ✅ **An toàn:** `buildProblemTex.js`, `db.js`, `useProblems.js` **KHÔNG đổi**. Golden test xuất giữ nguyên 3/3.

---

### Task 1: Tạo util tách hình + viết test (làm & kiểm trước, chưa cần giao diện)

**What you'll have when this is done:** Một bộ hàm tách/ghép hình chạy đúng, có test khoá (kể cả round-trip sửa đi sửa lại).

- [ ] Step 1: Tạo file mới `src/utils/extractFigures.js` với nội dung:
      ```javascript
      // Tách mã hình (TikZ/ảnh) khỏi text + gom logic tách \begin{bt}/\loigiai về một chỗ.
      // Dùng chung cho Thêm / Sửa / Import. KHÔNG đụng đường xuất (buildProblemTex).

      // Tách hình khỏi `text`. Trả { clean, figures }.
      export const extractFigures = (text) => {
        if (!text) return { clean: '', figures: '' };
        let working = text;
        const figs = [];

        // (1) \begin{center}...\end{center} CÓ chứa hình -> lấy phần trong, bỏ center.
        working = working.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, (whole, inner) => {
          if (/\\begin\{tikzpicture\}|\\includegraphics/.test(inner)) {
            figs.push(inner.trim());
            return '';
          }
          return whole; // center không chứa hình -> giữ nguyên
        });

        // (2) tikzpicture để trần
        working = working.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, (m) => {
          figs.push(m.trim());
          return '';
        });

        // (3) includegraphics để trần
        working = working.replace(/\\includegraphics(?:\[[^\]]*\])?\{[^}]*\}/g, (m) => {
          figs.push(m.trim());
          return '';
        });

        const clean = working.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        return { clean, figures: figs.join('\n') };
      };

      // rawLatex -> { statement, solution, figStatement, figSolution }.
      export const parseProblemLatex = (raw) => {
        let cleanText = (raw || '').replace(/\\begin\{bt\}/g, '').replace(/\\end\{bt\}/g, '').trim();
        let statement = cleanText;
        let solution = '';
        const loigiaiMatch = cleanText.match(/\\loigiai\{([\s\S]*?)\}(?=\s*$|\\end)/);
        if (loigiaiMatch) {
          solution = loigiaiMatch[1].trim();
          statement = cleanText.replace(loigiaiMatch[0], '').trim();
        }
        const s = extractFigures(statement);
        const sol = extractFigures(solution);
        return { statement: s.clean, figStatement: s.figures, solution: sol.clean, figSolution: sol.figures };
      };

      // problem -> rawLatex (ghép hình về vị trí canonical) để nạp vào ô Sửa.
      export const reconstructProblemLatex = (problem) => {
        const statement = problem.statement || '';
        const solution = problem.solution || '';
        const figStatement = (problem.figStatement || '').trim();
        const figSolution = (problem.figSolution || '').trim();

        let body = statement;
        if (figStatement) body += `\n${figStatement}`;
        if (solution || figSolution) {
          let inner = '';
          if (figSolution) inner += `${figSolution}\n`;
          inner += solution;
          body += `\n\\loigiai{\n${inner}\n}`;
        }
        return `\\begin{bt}\n${body}\n\\end{bt}`;
      };
      ```

- [ ] Step 2: Tạo file mới `src/utils/extractFigures.test.js`:
      ```javascript
      import { extractFigures, parseProblemLatex, reconstructProblemLatex } from './extractFigures';

      test('extractFigures: bỏ \\begin{center} bọc tikz, lưu hình trần', () => {
        const { clean, figures } = extractFigures(
          'Cho hình.\n\\begin{center}\n\\begin{tikzpicture}\n\\draw (0,0)--(1,0);\n\\end{tikzpicture}\n\\end{center}\nTính.'
        );
        expect(figures).toBe('\\begin{tikzpicture}\n\\draw (0,0)--(1,0);\n\\end{tikzpicture}');
        expect(clean).toBe('Cho hình.\n\nTính.');
      });

      test('extractFigures: includegraphics trần', () => {
        const { clean, figures } = extractFigures('Xem ảnh \\includegraphics[width=5cm]{h1} rồi giải.');
        expect(figures).toBe('\\includegraphics[width=5cm]{h1}');
        expect(clean).toBe('Xem ảnh  rồi giải.');
      });

      test('extractFigures: bài không hình -> không đổi', () => {
        const { clean, figures } = extractFigures('Chứng minh $x^2+y^2=z^2$.');
        expect(figures).toBe('');
        expect(clean).toBe('Chứng minh $x^2+y^2=z^2$.');
      });

      test('parseProblemLatex: tách đề/lời giải/hình', () => {
        const raw = '\\begin{bt}\nCho tam giác. \\begin{tikzpicture}\\draw (0,0)--(1,0);\\end{tikzpicture}\n\\loigiai{\n\\includegraphics{h}\nGiải.\n}\n\\end{bt}';
        const r = parseProblemLatex(raw);
        expect(r.statement).toBe('Cho tam giác.');
        expect(r.figStatement).toBe('\\begin{tikzpicture}\\draw (0,0)--(1,0);\\end{tikzpicture}');
        expect(r.solution).toBe('Giải.');
        expect(r.figSolution).toBe('\\includegraphics{h}');
      });

      test('round-trip: parse(reconstruct(p)) trả lại đúng p', () => {
        const p = {
          statement: 'Cho tam giác $ABC$.',
          solution: 'Dựng đường cao.',
          figStatement: '\\begin{tikzpicture}\n\\draw (0,0)--(1,0);\n\\end{tikzpicture}',
          figSolution: '\\includegraphics{hinh1}',
        };
        const r = parseProblemLatex(reconstructProblemLatex(p));
        expect(r.statement).toBe(p.statement);
        expect(r.solution).toBe(p.solution);
        expect(r.figStatement).toBe(p.figStatement);
        expect(r.figSolution).toBe(p.figSolution);
      });
      ```

- [ ] Step 3: Check it works
      Chạy: `npx react-scripts test --watchAll=false`
      Bạn sẽ thấy: tất cả test **pass** (5 test mới của extractFigures + 3 golden cũ = **8 passed**). Nếu 1 test lệch, đối chiếu lại khoảng trắng/`\t` trong file util — KHÔNG sửa test cho khớp code sai, mà xem lại logic.

### Task 2: Bỏ 2 ô hình ở form Thêm, dùng bộ tách

**What you'll have when this is done:** Form Thêm chỉ còn 1 ô Mã LaTeX; lưu xong hình tự tách.

- [ ] Step 1: Mở `src/components/Modals/AddProblemModal.jsx`. Thêm import:
      ```javascript
      import { parseProblemLatex } from '../../utils/extractFigures';
      ```
- [ ] Step 2: Trong `getInitialFormData()`, XOÁ 2 dòng `figStatement: ''` và `figSolution: ''` (trả về như cũ: `rawLatex`, `type`, `notes`).
- [ ] Step 3: XOÁ 2 khối `<div>` ô nhập "Hình đề bài" và "Hình lời giải" (đã thêm ở đợt trước, nằm ngay trên phần "Loại câu").
- [ ] Step 4: Trong `handleSubmit`, THAY đoạn bóc tách thủ công (từ `let cleanText = raw...` tới hết khối `if (loigiaiMatch) {...}`) bằng:
      ```javascript
      const { statement, solution, figStatement, figSolution } = parseProblemLatex(raw);
      ```
      Trong object `newProblem`, đảm bảo 4 trường này được gán (sửa 2 dòng `figStatement: formData.figStatement` / `figSolution: formData.figSolution` thành `figStatement,` / `figSolution,`):
      ```javascript
        statement,
        solution,
        figStatement,
        figSolution,
      ```
- [ ] Step 5: Check it works
      Chạy `npx tauri dev`. Mở **Thêm bài**: chỉ còn 1 ô Mã LaTeX (không còn 2 ô hình). Dán 1 bài có `\begin{center}\begin{tikzpicture}...\end{tikzpicture}\end{center}` trong đề → Lưu → không lỗi.

### Task 3: Bỏ 2 ô hình ở form Sửa, ghép lại khi nạp

**What you'll have when this is done:** Form Sửa hiện đầy đủ (đề + hình + lời giải) trong 1 ô; lưu lại tách đúng, không mất hình.

- [ ] Step 1: Mở `src/components/Modals/EditProblemModal.jsx`. Thêm import:
      ```javascript
      import { parseProblemLatex, reconstructProblemLatex } from '../../utils/extractFigures';
      ```
- [ ] Step 2: Trong `useState({ rawLatex: '', type: 'Tự luận', notes: '', figStatement: '', figSolution: '' })`, XOÁ `figStatement: ''` và `figSolution: ''`.
- [ ] Step 3: Trong `useEffect`, THAY dòng dựng `latex` thủ công bằng:
      ```javascript
      const latex = reconstructProblemLatex(problem);
      ```
      và trong `setFormData({...})` XOÁ 2 dòng `figStatement: problem.figStatement || ''` / `figSolution: problem.figSolution || ''`.
- [ ] Step 4: XOÁ 2 khối `<div>` ô nhập "Hình đề bài"/"Hình lời giải" (trên phần "Loại câu").
- [ ] Step 5: Trong `handleSubmit`, sau bước chuẩn hoá `\angle`→`\widehat`, THAY đoạn bóc tách thủ công bằng:
      ```javascript
      const { statement, solution, figStatement, figSolution } = parseProblemLatex(raw);
      ```
      Trong `updatedProblem`, sửa 2 dòng fig thành `figStatement,` / `figSolution,` (lấy từ biến vừa tách, KHÔNG lấy `formData`).
      Check: `npx tauri dev` → Sửa một bài vừa tạo ở Task 2 → ô Mã LaTeX hiện lại cả hình → Lưu → mở Sửa lần nữa, hình vẫn còn (không nhân đôi, không mất).

### Task 4: Import tự tách hình

**What you'll have when this is done:** Smart Import nhiều bài cũng tự tách hình.

- [ ] Step 1: Mở `src/components/Modals/SmartImportModal.jsx`. Thêm import:
      ```javascript
      import { parseProblemLatex } from '../../utils/extractFigures';
      ```
- [ ] Step 2: Trong `handleFinalSave`, THAY đoạn bóc tách thủ công (từ `let cleanText = item.rawLatex...` tới hết `if (solMatch) {...}`) bằng:
      ```javascript
      const { statement, solution, figStatement, figSolution } = parseProblemLatex(item.rawLatex);
      ```
      Trong object `return {...}`, thêm `figStatement,` và `figSolution,` (cạnh `statement,`/`solution,`).
- [ ] Step 3: Check it works
      Chạy `npm run build` → `Compiled successfully.` 0 warning.

### Task 5: Badge "📐 Có hình" trên thẻ + Xem đầy đủ

**What you'll have when this is done:** Bài có hình hiện chip "📐 Có hình" ở thẻ và ở Xem đầy đủ.

- [ ] Step 1: Mở `src/components/ProblemCard.jsx`. Trong VÙNG 3a, ở dòng meta (chỗ `{problem.type || 'Tự luận'} ... {problem.tags ? ... }`), thêm vào CUỐI (trước `</div>` của dòng đó):
      ```jsx
            {(problem.figStatement || problem.figSolution)
              ? <span style={{ color: 'var(--color-cobalt)', fontWeight: 500 }}> · 📐 Có hình</span>
              : ''}
      ```
- [ ] Step 2: Mở `src/components/PreviewPanel.jsx`. Trong `<span>` meta ở header (chỗ `{` • ${parsed.type}`}`), thêm ngay sau nó:
      ```jsx
            {(problem.figStatement || problem.figSolution) ? ' • 📐 Có hình' : ''}
      ```
- [ ] Step 3: Check it works
      `npx tauri dev` → bài có hình hiện "📐 Có hình" trên thẻ; bấm "Xem đầy đủ" → dòng thông tin trên cùng cũng có "📐 Có hình". Bài không hình thì không hiện.

### Task 6: Kiểm tra an toàn LaTeX + nghiệm thu + lưu

**What you'll have when this is done:** Chắc chắn xuất `.tex` vẫn đúng (hình + công thức), test xanh, đã commit.

- [ ] Step 1: Chạy toàn bộ test: `npx react-scripts test --watchAll=false` → **8 passed** (5 mới + 3 golden cũ KHÔNG đổi).
- [ ] Step 2: `npm run build` → `Compiled successfully.` 0 warning.
- [ ] Step 3: Kiểm tra an toàn (LaTeX): tạo 1 bài, ô Mã LaTeX dán:
      ```
      \begin{bt}
      Cho tam giác. Chứng minh $x^2+y^2=z^2$.
      \begin{center}\begin{tikzpicture}\draw (0,0)--(2,0)--(1,2)--cycle;\end{tikzpicture}\end{center}
      \loigiai{
      \includegraphics{tamgiac}
      Dựng đường cao.
      }
      \end{bt}
      ```
      Lưu → thẻ hiện "📐 Có hình", phần đề hiển thị KHÔNG còn mã tikz (đã tách). Thêm vào giỏ → **Xuất file nội dung** ra `D:\check-tach.tex`. Mở file: công thức `$x^2+y^2=z^2$` nguyên vẹn; hình đề trong `\begin{center}` SAU đề; `\includegraphics{tamgiac}` trong `\loigiai` TRƯỚC lời giải; center KHÔNG bị lồng 2 lần.
- [ ] Step 4: Thầy nghiệm thu PDF: `\input` `check-tach.tex` vào `main.tex` → biên dịch → hình ra đúng.
- [ ] Step 5: Lưu tiến độ (spec+plan đã commit sẵn; chỉ commit code):
      Run: `git add src/utils/extractFigures.js src/utils/extractFigures.test.js src/components/Modals/AddProblemModal.jsx src/components/Modals/EditProblemModal.jsx src/components/Modals/SmartImportModal.jsx src/components/ProblemCard.jsx src/components/PreviewPanel.jsx`
      Run: `git commit -m "feat(import): tu tach hinh khoi ma LaTeX + badge Co hinh"`
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
- `git status`: chỉ 7 file trên (+ docs). KHÔNG đụng `buildProblemTex.js`, `db.js`, `useProblems.js`, schema.
- Test: **8 passed** (golden 3/3 KHÔNG đổi — chứng tỏ đường xuất nguyên vẹn) + round-trip pass.
- `parseProblemLatex` dùng đúng ở cả 3 nơi (Add/Edit/Import); EditModal nạp form bằng `reconstructProblemLatex`.
- 2 ô hình thủ công đã bị gỡ ở cả Add lẫn Edit; không còn tham chiếu `formData.figStatement/figSolution`.
- Badge đọc `figStatement || figSolution`, có ở ProblemCard + PreviewPanel.
- Bài cũ (tạo bằng 2-ô đợt trước) sửa lại không mất hình (nhờ reconstruct + round-trip idempotent).
