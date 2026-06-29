# Hình vẽ + Căn lề khi xuất (.tex) — Build Plan

**What we're building:** Hai ô nhập hình (đề bài + lời giải) cho mỗi câu, và việc xuất file `.tex` tự thụt lề đẹp; cả hai cùng gộp vào khối `\begin{bt}` lúc xuất.

**Why:** Để Thầy gắn được hình (TikZ/ảnh) vào câu hỏi, và file `.tex` xuất ra gọn gàng dễ đọc (không bị mất căn lề).

**Approach:** Thêm 2 cột DB `figStatement`/`figSolution` (migration an toàn) → lưu/sửa qua form → `buildProblemTex` chèn hình (bọc `\begin{center}`) đúng vị trí và thụt lề mọi dòng bằng TAB. LaTeX bỏ qua khoảng trắng đầu dòng nên **PDF không đổi**; golden test cập nhật sang khuôn mới + thêm case có hình.

**Files we'll change:**
- `src/utils/db.js` — thêm 2 cột + migration idempotent
- `src/hooks/useProblems.js` — lưu 2 cột ở `addProblem` + `updateProblem`
- `src/components/Modals/AddProblemModal.jsx` — 2 ô nhập hình
- `src/components/Modals/EditProblemModal.jsx` — 2 ô nhập hình + nạp giá trị cũ
- `src/utils/buildProblemTex.js` — thụt lề + chèn hình (phần SACRED)
- `src/utils/buildContentFile.test.js` — cập nhật golden + thêm case có hình

**Spec:** `.docs/specs/2026-06-28-hinh-ve-va-can-le-xuat-design.md` (đọc trước khi build).

> ⚠️ **Quan trọng:** đây là thay đổi định dạng `.tex` CÓ CHỦ ĐÍCH (mất byte-identical cũ). PDF không đổi vì LaTeX bỏ qua khoảng trắng đầu dòng. Ngoại lệ duy nhất: bài có `verbatim`/`lstlisting` (hiếm trong Toán).

---

### Task 1: Thêm 2 cột dữ liệu cho hình (Database)

**What you'll have when this is done:** Bảng `problems` có thêm 2 cột `figStatement`, `figSolution` một cách an toàn; bài cũ không mất gì.

- [ ] Step 1: SAO LƯU DB trước khi đổi cấu trúc
      Mở app → Cài đặt → **Sao lưu ngay** → lưu ra ví dụ `D:\truoc-them-hinh.db`. (Phòng hờ.)

- [ ] Step 2: Mở `src/utils/db.js`. Trong câu `CREATE TABLE IF NOT EXISTS problems (...)`, sửa dòng `metadata TEXT ` (đang là cột cuối) thành 3 dòng:
      ```javascript
            metadata TEXT,
            figStatement TEXT,
            figSolution TEXT
      ```
      (Thêm dấu phẩy sau `metadata TEXT`, rồi thêm 2 dòng mới. Không xoá gì khác.)

- [ ] Step 3: Ngay DƯỚI khối migration `deletedAt` (đoạn `ALTER TABLE problems ADD COLUMN deletedAt ...` trong `try/catch`), thêm 2 khối migration tương tự:
      ```javascript
        // 🛠️ MIGRATION: 2 cột mã hình (TikZ/ảnh). Bài cũ -> NULL, an toàn (idempotent).
        try {
          await db.execute(`ALTER TABLE problems ADD COLUMN figStatement TEXT`);
        } catch (e) { /* cột đã có -> bỏ qua */ }
        try {
          await db.execute(`ALTER TABLE problems ADD COLUMN figSolution TEXT`);
        } catch (e) { /* cột đã có -> bỏ qua */ }
      ```

- [ ] Step 4: Check it works
      Chạy: `npx tauri dev`
      App phải khởi động bình thường, **không màn hình đỏ**, danh sách bài cũ **vẫn hiện đủ** (chứng tỏ migration an toàn).

### Task 2: Lưu 2 trường hình khi Thêm/Sửa bài

**What you'll have when this is done:** Khi lưu hoặc cập nhật bài, giá trị 2 ô hình được ghi xuống DB.

- [ ] Step 1: Mở `src/hooks/useProblems.js`. Trong hàm `addProblem`, sửa câu INSERT — thêm 2 cột vào danh sách, thêm `$13, $14`, và thêm 2 giá trị vào cuối mảng:
      ```javascript
        await db.execute(
          `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, timesUsed, type, shortAnswer, options, metadata, figStatement, figSolution) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            newProblem.id, 
            newProblem.statement || '', 
            newProblem.solution || '', 
            newProblem.topic || 'Chưa phân loại', 
            parseInt(newProblem.level) || 1, 
            newProblem.tags || '', 
            newProblem.dateAdded || new Date().toISOString(), 
            newProblem.timesUsed || 0,
            newProblem.type || 'Tự luận', 
            newProblem.shortAnswer || '', 
            optionsStr,
            "{}", // metadata dự phòng
            newProblem.figStatement || '',
            newProblem.figSolution || ''
          ]
        );
      ```

- [ ] Step 2: Trong cùng file, hàm `updateProblem`, sửa câu UPDATE — thêm `figStatement = $9, figSolution = $10`, dời `id` thành `$11`, và thêm 2 giá trị tương ứng:
      ```javascript
        await db.execute(
          `UPDATE problems SET statement = $1, solution = $2, topic = $3, level = $4, tags = $5, type = $6, shortAnswer = $7, options = $8, figStatement = $9, figSolution = $10 WHERE id = $11`,
          [
            updatedProblem.statement, updatedProblem.solution || '', updatedProblem.topic,
            updatedProblem.level, updatedProblem.tags || '', updatedProblem.type || 'Tự luận',
            updatedProblem.shortAnswer || '', optionsStr,
            updatedProblem.figStatement || '', updatedProblem.figSolution || '',
            updatedProblem.id
          ]
        );
      ```
      (LƯU Ý: KHÔNG đụng câu INSERT trong `saveImportedProblems` — bài import không có hình, 2 cột tự nhận NULL, an toàn.)

- [ ] Step 3: Check it works
      Chạy: `npm run build`
      Bạn sẽ thấy: `Compiled successfully.` 0 warning.

### Task 3: Thêm 2 ô nhập hình vào form Thêm & Sửa

**What you'll have when this is done:** Form Thêm mới và Sửa đều có 2 ô "Hình đề bài" / "Hình lời giải".

- [ ] Step 1: Mở `src/components/Modals/AddProblemModal.jsx`.
      Trong `getInitialFormData()`, thêm 2 trường:
      ```javascript
      const getInitialFormData = () => ({
        rawLatex: '',
        type: 'Tự luận',
        notes: '',
        figStatement: '',
        figSolution: ''
      });
      ```
      Trong object `newProblem` (chỗ `const newProblem = { ... }`), thêm 2 dòng (ví dụ ngay sau `solution: solution,`):
      ```javascript
        figStatement: formData.figStatement,
        figSolution: formData.figSolution,
      ```

- [ ] Step 2: Vẫn trong `AddProblemModal.jsx`, NGAY SAU khối `<div>` chứa textarea "Mã LaTeX" (kết thúc bằng `</div>` trước phần "Loại câu"), dán 2 khối ô nhập sau:
      ```jsx
          {/* Hình vẽ (tuỳ chọn) — mã LaTeX thuần, app tự bọc \begin{center} khi xuất */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9rem' }}>Hình đề bài (mã LaTeX — tuỳ chọn)</label>
            <textarea
              value={formData.figStatement}
              onChange={(e) => setFormData({ ...formData, figStatement: e.target.value })}
              placeholder="Dán mã TikZ hoặc \includegraphics{ten-file} cho hình của ĐỀ BÀI…"
              rows="4"
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace', fontSize: '14px', resize: 'vertical' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9rem' }}>Hình lời giải (mã LaTeX — tuỳ chọn)</label>
            <textarea
              value={formData.figSolution}
              onChange={(e) => setFormData({ ...formData, figSolution: e.target.value })}
              placeholder="Dán mã TikZ hoặc \includegraphics{ten-file} cho hình trong LỜI GIẢI…"
              rows="4"
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace', fontSize: '14px', resize: 'vertical' }}
            />
          </div>
      ```

- [ ] Step 3: Mở `src/components/Modals/EditProblemModal.jsx`.
      Trong `useState({ rawLatex: '', type: 'Tự luận', notes: '' })`, thêm `figStatement: '', figSolution: ''`.
      Trong `useEffect` (chỗ `setFormData({ rawLatex: latex, ... })`), thêm 2 dòng để nạp giá trị cũ:
      ```javascript
            figStatement: problem.figStatement || '',
            figSolution: problem.figSolution || ''
      ```
      Trong object `updatedProblem` (chỗ `{ ...problem, statement, ... }`), thêm:
      ```javascript
        figStatement: formData.figStatement,
        figSolution: formData.figSolution,
      ```

- [ ] Step 4: Vẫn trong `EditProblemModal.jsx`, dán **đúng 2 khối ô nhập như Step 2** vào cùng vị trí (ngay sau `</div>` của textarea "Mã LaTeX", trước "Loại câu").

- [ ] Step 5: Check it works
      Chạy: `npx tauri dev`. Mở **Thêm bài** và **Sửa bài** → phải thấy 2 ô "Hình đề bài" / "Hình lời giải". Sửa 1 bài chưa có hình → 2 ô trống; lưu lại → không lỗi.

### Task 4: Đổi hàm xuất (thụt lề + chèn hình) + khoá bằng golden test  ⚠️ SACRED

**What you'll have when this is done:** Khối `.tex` xuất ra thụt lề đẹp và chèn hình đúng chỗ; test khoá định dạng.

- [ ] Step 1: Mở `src/utils/buildProblemTex.js` và THAY TOÀN BỘ bằng:
      ```javascript
      // Dựng khối .tex của MỘT bài. Thụt lề nhất quán bằng TAB (LaTeX bỏ qua khoảng
      // trắng đầu dòng -> PDF KHÔNG đổi). Hình (figStatement/figSolution) bọc \begin{center};
      // ô trống -> không sinh dòng nào. Dùng chung: Xuất đề + "Mã LaTeX" + "Xem đầy đủ".

      // Thụt mỗi dòng KHÔNG rỗng của `text` bằng `depth` tab; dòng rỗng để nguyên.
      const indent = (text, depth) => {
        const pad = '\t'.repeat(depth);
        return text.split('\n').map((line) => (line.trim() === '' ? '' : pad + line)).join('\n');
      };

      // Bọc mã hình trong \begin{center} ở cấp `depth` (nội dung hình +1 cấp).
      const centerFig = (fig, depth) => {
        const pad = '\t'.repeat(depth);
        return `${pad}\\begin{center}\n${indent(fig.trim(), depth + 1)}\n${pad}\\end{center}\n`;
      };

      export const buildProblemTex = (item, { includeSolution = true } = {}) => {
        let tex = `\\begin{bt}\n${indent(item.statement.trim(), 1)}\n`;

        if (item.figStatement && item.figStatement.trim()) {
          tex += centerFig(item.figStatement, 1);
        }

        if (item.options && item.options.length > 0) {
          tex += `\t\\choice\n`;
          item.options.forEach((opt) => { tex += `\t\t{${opt.isTrue ? '\\True ' : ''}${opt.text}}\n`; });
        }

        if (includeSolution && item.solution) {
          tex += `\t\\loigiai{\n`;
          if (item.figSolution && item.figSolution.trim()) {
            tex += centerFig(item.figSolution, 2);
          }
          tex += `${indent(item.solution.trim(), 2)}\n\t}\n`;
        }

        tex += `\\end{bt}`;
        return tex;
      };
      ```

- [ ] Step 2: Mở `src/utils/buildContentFile.test.js`. Thêm import ở đầu file (dưới dòng import sẵn có):
      ```javascript
      import { buildProblemTex } from './buildProblemTex';
      ```

- [ ] Step 3: Trong test `buildContentFile khớp golden byte-for-byte`, thay khối `golden` (đoạn từ `'\\begin{bt}',` đầu tiên tới hết) cho khớp khuôn THỤT LỀ MỚI. Cụ thể, 14 dòng mô tả 2 khối bài đổi thành:
      ```javascript
          '\\begin{bt}',
          '\tChứng minh $x^2+y^2=z^2$ có vô số nghiệm nguyên.',
          '\t\\loigiai{',
          '\t\tBộ ba Pythagore.',
          '\t}',
          '\\end{bt}',
          '',
          '\\begin{bt}',
          '\tChọn đáp án đúng:',
          '\t\\choice',
          '\t\t{$1$}',
          '\t\t{\\True $2$}',
          '\\end{bt}',
          '',
      ```
      (Phần header `\begin{name}…\end{name}` GIỮ NGUYÊN, không đổi.)

- [ ] Step 4: Thêm 1 test MỚI vào cuối file (khoá định dạng bài CÓ hình):
      ```javascript
      test('buildProblemTex chèn hình đề + lời giải, bọc center, thụt lề đúng', () => {
        const p = {
          statement: 'Cho tam giác $ABC$.',
          figStatement: '\\begin{tikzpicture}\n\\draw (0,0)--(1,0);\n\\end{tikzpicture}',
          solution: 'Dựng đường cao.',
          figSolution: '\\includegraphics{hinh1}',
          options: [],
        };
        const expected = [
          '\\begin{bt}',
          '\tCho tam giác $ABC$.',
          '\t\\begin{center}',
          '\t\t\\begin{tikzpicture}',
          '\t\t\\draw (0,0)--(1,0);',
          '\t\t\\end{tikzpicture}',
          '\t\\end{center}',
          '\t\\loigiai{',
          '\t\t\\begin{center}',
          '\t\t\t\\includegraphics{hinh1}',
          '\t\t\\end{center}',
          '\t\tDựng đường cao.',
          '\t}',
          '\\end{bt}',
        ].join('\n');
        expect(buildProblemTex(p)).toBe(expected);
      });
      ```

- [ ] Step 5: Check it works
      Chạy: `npx react-scripts test --watchAll=false`
      Bạn sẽ thấy: `Tests: 3 passed, 3 total`. (Nếu test golden cũ báo lệch — đối chiếu lại dấu TAB ở Step 3, phải là ký tự tab `\t`, không phải dấu cách.)

### Task 5: Kiểm tra an toàn LaTeX + nghiệm thu + lưu

**What you'll have when this is done:** Chắc chắn xuất `.tex` đúng (hình + thụt lề), PDF không đổi, code đã commit.

- [ ] Step 1: Build sạch
      Chạy: `npm run build` → `Compiled successfully.` 0 warning.

- [ ] Step 2: Kiểm tra an toàn công thức + thụt lề (bài KHÔNG hình)
      Mở app, tạo 1 bài có công thức `$x^2 + y^2 = z^2$` và 1 lời giải. Thêm vào giỏ → **Xuất file nội dung** ra `D:\check-canle.tex`.
      Mở file: công thức `$x^2 + y^2 = z^2$` **nguyên vẹn**; khối `\begin{bt}` có **thụt lề tab** (đề bài và lời giải thụt vào trong).

- [ ] Step 3: Kiểm tra hình
      Sửa bài đó: ô **Hình đề bài** dán `\begin{tikzpicture}\n\draw (0,0)--(2,0)--(1,2)--cycle;\n\end{tikzpicture}`; ô **Hình lời giải** dán `\includegraphics{tamgiac}`. Lưu → Xuất lại ra `D:\check-hinh.tex`.
      Mở file: hình đề nằm **sau đề bài** trong `\begin{center}…\end{center}`; hình lời giải nằm **đầu `\loigiai`, trước lời giải**, cũng trong `\begin{center}`.

- [ ] Step 4: Thầy nghiệm thu PDF (quan trọng nhất)
      `\input` cả 2 file trên vào `main.tex` rồi biên dịch:
      - `check-canle.tex` → PDF phải **y hệt** như trước khi đổi (thụt lề không ảnh hưởng PDF).
      - `check-hinh.tex` → PDF phải **ra hình** đúng (tam giác TikZ + ảnh `tamgiac`).

- [ ] Step 5: Lưu tiến độ
      (Spec + plan đã commit sẵn; chỉ commit code.)
      Run: `git add src/utils/buildProblemTex.js src/utils/buildContentFile.test.js src/utils/db.js src/hooks/useProblems.js src/components/Modals/AddProblemModal.jsx src/components/Modals/EditProblemModal.jsx`
      Run: `git commit -m "feat(export): chen hinh (TikZ/anh) + tu can le khi xuat .tex"`
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

## Ghi chú cho bước Claude check lại (sau khi Antigravity build)
- `git status` chỉ thấy 6 file trên (+ docs). KHÔNG sửa Rust, KHÔNG đụng `buildContentFile.js`, KHÔNG sửa câu INSERT của `saveImportedProblems`.
- `npm run build` 0 warning; `npx react-scripts test --watchAll=false` → **3 passed**.
- Đọc `buildProblemTex.js`: ô hình trống (`''`/NULL) → KHÔNG sinh `\begin{center}` (điều kiện `&& .trim()`); bài không hình → khối `.tex` đúng khuôn thụt lề mới (so với golden đã cập nhật).
- `EditProblemModal` nạp `figStatement`/`figSolution` cũ (sửa bài có hình không bị mất); `{...problem}` cũng giữ sẵn nếu form không đụng.
- Migration `figStatement`/`figSolution` idempotent (chạy lại không lỗi); cột mặc định NULL cho bài cũ.
