# GIAI ĐOẠN 2 — Danh Sách Kiểu Thẻ — Build Plan

**What we're building:** Đổi danh sách bài tập từ bảng sang **feed thẻ full-width, cuộn vô tận**; mỗi thẻ render đề + phân loại nhóm theo hệ; **bấm thẻ để chọn**; **Xem đầy đủ** thành hộp thoại giữa màn; **Giỏ** thành **trang riêng** có công tắc chuyển trang + badge; nút **Mã LaTeX** chép trọn khối bài.

**Why:** Đọc đề trong một liếc, lướt nhanh, gom giỏ/xuất ít bước — hợp việc soạn đề nhiều hệ.

**Approach:** Tái dùng tối đa nền GĐ1 (`LatexBlockRenderer`, tokens, `PreviewPanel`, `CartPanel`, `ExportModal`). Đổi `react-virtuoso` từ `TableVirtuoso` → `Virtuoso`. Tách một **helper dựng khối `.tex`** dùng chung cho Xuất đề + nút Mã LaTeX, canh **byte-identical**. Thêm state `currentView` (feed/cart) làm mầm nav rail GĐ3.

**Spec gốc (đã duyệt):** [.docs/specs/2026-06-22-ux-gd2-card-feed-design.md](../specs/2026-06-22-ux-gd2-card-feed-design.md)

**Files we'll create or change:**
- `src/index.css` — THÊM token màu GĐ2 (khay/footer/badge/lời giải)
- `src/utils/buildProblemTex.js` — MỚI: helper dựng khối `\begin{bt}…\end{bt}` (tách từ `App.handleFinalExport`)
- `src/utils/classification.js` — MỚI: helper nhóm phân loại theo hệ + dựng đường cây
- `src/components/ProblemCard.jsx` — MỚI: một thẻ bài (3 vùng, chọn, lời giải, Mã LaTeX)
- `src/components/DataGrid.jsx` — đổi `TableVirtuoso`→`Virtuoso`, render `ProblemCard`, thêm thanh hàng loạt
- `src/components/PreviewModal.jsx` — MỚI: bọc `PreviewPanel` thành hộp thoại giữa màn
- `src/components/CartPanel.jsx` — chỉnh thành **trang** (bỏ `height:40%`)
- `src/hooks/useUIState.js` — thêm `currentView` (thay vai trò `isCartOpen`)
- `src/components/Toolbar.jsx` — bỏ cụm nút hàng loạt (chuyển xuống thanh dưới feed)
- `src/App.jsx` — ráp công tắc trang + badge, feed full-width, modal Xem đầy đủ, trang Giỏ
- `src/components/PreviewPanel.jsx` — thêm nút Chép Mã LaTeX + bật/tắt lời giải (dùng trong modal)

**Quy ước kiểm tra (dùng suốt plan):**
- **Biên dịch:** `$env:CI="false"; npm run build` → mong đợi `Compiled successfully`, **0 warning**.
- **Chạy app:** `npx tauri dev` (BẮT BUỘC — app chỉ chạy với DB qua Tauri, không phải `npm start`). DB ở `%APPDATA%\com.tauri.dev\problem_bank.db`.
- **KHÔNG đụng:** nội dung đề/lời giải LaTeX, logic bóc tách, định dạng xuất `.tex`, schema, `useTaxonomy`/`useProblems`/`useCart` (trừ đọc), và **không** sửa `useCart.exportCart` (đường cũ, không nối nút Xuất).

---

### Task 0: Sao lưu an toàn trước khi bắt đầu

**What you'll have when this is done:** Một nhánh git sạch + bản `.tex` mẫu làm "gốc so sánh" cho kiểm thử byte-identical.

- [ ] Bước 1: Đảm bảo cây làm việc sạch và tạo nhánh mới
      Run: `git status`
      You should see: chỉ có file spec mới (chưa commit) — không có thay đổi code lạ.
      Run: `git add -A && git commit -m "docs: spec + plan GĐ2 card feed"`
      Run: `git checkout -b ux-gd2-card-feed`

- [ ] Bước 2: Lấy bản `.tex` mẫu GỐC để so sánh sau này
      Chạy `npx tauri dev`. Cho **3 bài vào giỏ** (gồm ít nhất 1 bài Trắc nghiệm có 4 đáp án + 1 bài có lời giải có công thức, vd `$x^2+y^2=z^2$`). Bấm **Xuất Đề (.tex)**, lưu file là `_goc_truoc_gd2.tex` ở thư mục dự án (cạnh `package.json`).
      You should see: file `.tex` có `\documentclass[12pt,a4paper,oneside]{article}`, `\usepackage{ex_test}`, các khối `\begin{bt}…\end{bt}`, `\choice`, `\loigiai{…}`.

- [ ] Bước 3: Cất file gốc khỏi tầm git (để không commit nhầm)
      File `_goc_truoc_gd2.tex` chỉ dùng để so sánh tay — **đừng** `git add` nó.

> ⚠️ **Vì sao có bước này:** Sau khi tách helper xuất `.tex`, ta phải chứng minh đầu ra **không đổi một byte**. Không có bản gốc thì không so được.

---

### Task 1: Thêm bảng màu GĐ2 vào tokens

**What you'll have when this is done:** Các biến màu mới (khay, footer, badge độ khó, khung lời giải) sẵn sàng cho thẻ — chưa dùng nhưng build vẫn sạch.

- [ ] Bước 1: Mở `src/index.css`, trong khối `:root { … }` thêm vào cuối (trước dấu `}`):
      ```css
      /* === GĐ2: bề mặt phụ & badge thẻ === */
      --color-surface-sunken: #F8FAFC;   /* slate-50  — "khay" thẻ + nền vùng phân loại */
      --color-surface-muted:  #F1F5F9;   /* slate-100 — footer nút */
      --color-text-subtle:    #475569;   /* slate-600 — nhánh con trong đường cây */
      --color-text-faint:     #94A3B8;   /* slate-400 — dấu › phân cách */
      --color-diff-bg:        #FEF3C7;   /* amber-100 — badge độ khó */
      --color-diff-text:      #92400E;   /* amber-800 */
      --color-diff-border:    #FDE68A;   /* amber-200 */
      --color-solution-bg:    #F0FDF4;   /* green-50  — khung lời giải bung */
      --color-solution-border:#BBF7D0;   /* green-200 */
      --color-solution-text:  #15803D;   /* green-700 */
      ```

- [ ] Bước 2: Kiểm tra biên dịch
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully`, 0 warning.

- [ ] Bước 3: Lưu tiến độ
      Run: `git add . && git commit -m "feat(ux): them token mau GD2 (khay/footer/badge/loi giai)"`

---

### Task 2: Tách helper `buildProblemTex` (xuất `.tex` byte-identical)

**What you'll have when this is done:** Một hàm dựng khối `\begin{bt}…\end{bt}` của MỘT bài, dùng chung cho Xuất đề và nút Mã LaTeX; file xuất ra **giống hệt** bản gốc.

- [ ] Bước 1: Tạo file `src/utils/buildProblemTex.js`:
      ```js
      // Dựng khối .tex của MỘT bài, RÚT NGUYÊN VĂN từ App.handleFinalExport.
      // KHÔNG đổi định dạng: thứ tự, khoảng trắng, xuống dòng phải y hệt bản gốc.
      export const buildProblemTex = (item, { includeSolution = true } = {}) => {
        let tex = `\\begin{bt}\n${item.statement.trim()}\n`;
        if (item.options && item.options.length > 0) {
          tex += `\\choice\n`;
          item.options.forEach(opt => { tex += `  {${opt.isTrue ? '\\True ' : ''}${opt.text}}\n`; });
        }
        if (includeSolution && item.solution) tex += `\\loigiai{\n${item.solution.trim()}\n}\n`;
        tex += `\\end{bt}`;
        return tex;
      };
      ```

- [ ] Bước 2: Sửa `src/App.jsx` — trong `handleFinalExport`, thay vòng lặp dựng khối bằng lời gọi helper. Import ở đầu file:
      ```js
      import { buildProblemTex } from './utils/buildProblemTex';
      ```
      Thay đoạn `exportItems.forEach(...)` hiện tại bằng:
      ```js
      exportItems.forEach((item, index) => {
        tex += `% Câu ${index + 1}\n${buildProblemTex(item, { includeSolution: config.includeSolutions })}\n\n`;
      });
      ```
      (Giữ NGUYÊN phần preamble `\documentclass…\begin{document}`, phần `\begin{center}…`, và `tex += `\\end{document}`;` ở cuối.)

- [ ] Bước 3: Kiểm tra biên dịch
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully`, 0 warning.

- [ ] Bước 4: **Kiểm thử byte-identical (BẮT BUỘC)**
      Chạy `npx tauri dev`. Cho **đúng 3 bài như Task 0** vào giỏ theo **cùng thứ tự**, xuất `.tex` với **cùng cấu hình**, lưu là `_sau_task2.tex`.
      So sánh với bản gốc:
      Run: `git --no-pager diff --no-index -- _goc_truoc_gd2.tex _sau_task2.tex`
      You should see: **không có dòng khác nhau nào** (lệnh không in gì = giống hệt). Nếu có khác → dừng lại, đối chiếu từng ký tự, sửa helper cho khớp tuyệt đối.

- [ ] Bước 5: Lưu tiến độ
      Run: `git add src/ && git commit -m "refactor(export): tach buildProblemTex dung chung, output byte-identical"`

> ⚠️ **Đây là task rủi ro nhất cho LaTeX.** Không qua được Bước 4 thì không đi tiếp.

---

### Task 3: Helper nhóm phân loại theo hệ + đường cây

**What you'll have when this is done:** Một hàm nhận một bài → trả về danh sách "mỗi hệ một dòng" gồm trọn đường cây `Hệ › … › nhánh` và tên độ khó của hệ — để thẻ hiển thị.

- [ ] Bước 1: Tạo file `src/utils/classification.js`:
      ```js
      import { getRootHeId } from '../hooks/useTaxonomy';

      // Trả về: [{ heId, paths: [[ten,...], ...], difficultyName }] — mỗi hệ một mục.
      // catById: {id->{id,name,parent_id}}; parentMap: {id->parent_id}; diffById: {id->{name}}
      export const groupClassificationByHe = (problem, catById, parentMap, diffById) => {
        const buildPath = (catId) => {
          const names = [];
          let cur = catId;
          while (cur && catById[cur]) { names.unshift(catById[cur].name); cur = parentMap[cur]; }
          return names; // [Tên hệ, …, tên nhánh lá]
        };
        const byHe = {};
        for (const cid of (problem.categoryIds || [])) {
          if (!catById[cid]) continue;            // bỏ id mồ côi
          const heId = getRootHeId(cid, parentMap);
          (byHe[heId] = byHe[heId] || { heId, paths: [] }).paths.push(buildPath(cid));
        }
        return Object.values(byHe).map(g => ({
          ...g,
          difficultyName: diffById[(problem.difficultyByHe || {})[g.heId]]?.name || ''
        }));
      };
      ```

- [ ] Bước 2: Kiểm tra biên dịch
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully`, 0 warning.

- [ ] Bước 3: Lưu tiến độ
      Run: `git add src/ && git commit -m "feat(ux): helper nhom phan loai theo he + duong cay"`

---

### Task 4: Component `ProblemCard` (một thẻ — 3 vùng, chọn, lời giải, Mã LaTeX)

**What you'll have when this is done:** Một component thẻ hoàn chỉnh (chưa nối vào danh sách) — biên dịch sạch.

- [ ] Bước 1: Tạo file `src/components/ProblemCard.jsx` với cấu trúc sau (3 vùng theo Phương án C):
      ```jsx
      import React, { useState } from 'react';
      import { Eye, Lightbulb, Code, ShoppingCart, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
      import LatexBlockRenderer from './LatexBlockRenderer';
      import { buildProblemTex } from '../utils/buildProblemTex';

      const ProblemCard = ({ problem, classification, selected, onToggleSelect, onPreview, onAddToCart, onEdit, onDelete, onCopied }) => {
        const [showSol, setShowSol] = useState(false);

        const copyTex = (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(buildProblemTex(problem, { includeSolution: true }));
          onCopied && onCopied();
        };
        const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

        return (
          <div onClick={onToggleSelect}
            style={{ cursor: 'pointer', margin: '0 0 12px', borderRadius: 'var(--radius-md)', overflow: 'hidden',
                     background: 'var(--color-surface-sunken)', position: 'relative',
                     border: selected ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                     boxShadow: selected ? '0 0 0 1px var(--color-accent)' : 'none' }}>

            {selected && <CheckCircle2 size={20} color="var(--color-accent)" style={{ position: 'absolute', top: 10, right: 12 }} />}

            {/* VÙNG 1 — ĐỀ (khung trắng nổi trên khay) */}
            <div style={{ margin: 14, marginRight: 40, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)', padding: '12px 14px', maxHeight: '7.8em', overflowY: 'auto',
                          color: 'var(--color-text)', lineHeight: 1.55 }}>
              <LatexBlockRenderer text={problem.statement} />
            </div>

            {/* VÙNG 2 — LỜI GIẢI bung tại chỗ (tùy chọn) */}
            {showSol && problem.solution && (
              <div style={{ margin: '0 14px 12px', background: 'var(--color-solution-bg)', border: '1px solid var(--color-solution-border)',
                            borderRadius: 'var(--radius-md)', padding: '11px 14px', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--color-solution-text)', fontWeight: 500 }}>Lời giải. </span>
                <LatexBlockRenderer text={problem.solution} />
              </div>
            )}

            {/* VÙNG 3a — PHÂN LOẠI + TAG (trên khay) */}
            <div style={{ padding: '6px 16px 10px' }}>
              {classification.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Chưa phân loại</div>
              )}
              {classification.map((g) => (
                <div key={g.heId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '2px 0', fontSize: '0.85rem' }}>
                  <span>
                    {g.paths.map((path, i) => (
                      <span key={i} style={{ marginRight: i < g.paths.length - 1 ? 10 : 0 }}>
                        {path.map((name, j) => (
                          <React.Fragment key={j}>
                            {j > 0 && <span style={{ color: 'var(--color-text-faint)' }}> › </span>}
                            <span style={{ color: j === 0 ? 'var(--color-text)' : 'var(--color-text-subtle)', fontWeight: j === 0 ? 500 : 400 }}>{name}</span>
                          </React.Fragment>
                        ))}
                      </span>
                    ))}
                  </span>
                  {g.difficultyName && (
                    <span style={{ flexShrink: 0, background: 'var(--color-diff-bg)', color: 'var(--color-diff-text)', border: '1px solid var(--color-diff-border)',
                                   borderRadius: 'var(--radius-pill)', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 500 }}>{g.difficultyName}</span>
                  )}
                </div>
              ))}
              <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {problem.type || 'Tự luận'}
                {(problem.gradeNames && problem.gradeNames.length) ? ` · Lớp ${problem.gradeNames.join(', ')}` : ''}
                {problem.tags ? <span style={{ color: 'var(--color-tag-text)' }}>{' · ' + problem.tags.split(',').map(t => '#' + t.trim()).join(' ')}</span> : ''}
              </div>
            </div>

            {/* VÙNG 3b — NÚT (footer) */}
            <div style={{ padding: '9px 16px', background: 'var(--color-surface-muted)', borderTop: '1px solid var(--color-border)',
                          display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={stop(() => onPreview())} className="card-btn"><Eye size={16} /> Xem đầy đủ</button>
                <button onClick={stop(() => setShowSol(s => !s))} className="card-btn"><Lightbulb size={16} /> Lời giải</button>
                <button onClick={copyTex} className="card-btn"><Code size={16} /> Mã LaTeX</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={stop(() => onAddToCart())} className="card-btn card-btn-primary"><ShoppingCart size={16} /> Thêm giỏ</button>
                <button onClick={stop(() => onEdit())} className="card-btn"><Edit3 size={16} /> Sửa</button>
                <button onClick={stop(() => onDelete())} className="card-btn card-btn-danger"><Trash2 size={16} /> Xoá</button>
              </div>
            </div>
          </div>
        );
      };

      export default ProblemCard;
      ```

- [ ] Bước 2: Thêm style nút thẻ vào `src/index.css` (cuối file) để hover/focus nhất quán:
      ```css
      .card-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; font-size: 0.8rem;
        border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text-subtle);
        border-radius: var(--radius-md); }
      .card-btn:hover { background: var(--color-surface-muted); }
      .card-btn-primary { color: var(--color-accent); border-color: #BFDBFE; background: var(--color-tag-bg); }
      .card-btn-danger { color: var(--color-danger); }
      .card-btn-danger:hover { background: #FEF2F2; }
      ```

- [ ] Bước 3: Kiểm tra biên dịch
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully`, 0 warning (component chưa dùng vẫn biên dịch được).

- [ ] Bước 4: Lưu tiến độ
      Run: `git add src/ && git commit -m "feat(ux): component ProblemCard 3 vung (Phuong an C)"`

---

### Task 5: Đổi `DataGrid` sang `Virtuoso` + render thẻ

**What you'll have when this is done:** Danh sách chính là **feed thẻ cuộn vô tận**; bấm thẻ để chọn (viền xanh + tích); Lời giải bung; Mã LaTeX chép được — nhìn thấy tận mắt.

- [ ] Bước 1: Trong `src/components/DataGrid.jsx`:
      Đổi import: `import { TableVirtuoso } from 'react-virtuoso';` → `import { Virtuoso } from 'react-virtuoso';`
      Thêm: `import ProblemCard from './ProblemCard';`, `import { groupClassificationByHe } from '../utils/classification';`, `import { useToast } from '../hooks/useToast';`
      Thêm tra cứu: `grades` từ `useTaxonomy()`, và `parentMap`/`gradeById`:
      ```js
      const { categories, difficulties, grades } = useTaxonomy();
      const parentMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c.parent_id])), [categories]);
      const gradeById = useMemo(() => Object.fromEntries(grades.map(g => [g.id, g])), [grades]);
      const { success } = useToast();
      ```

- [ ] Bước 2: Thay TOÀN BỘ phần `return ( … <TableVirtuoso …/> … )` bằng `Virtuoso` render thẻ:
      ```jsx
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' }}>
          {/* (Thanh hàng loạt sẽ thêm ở Task 6, ngay đây) */}
          <Virtuoso
            style={{ flex: 1 }}
            data={filteredAndSorted}
            components={{
              EmptyPlaceholder: () => (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                  {problems.length === 0
                    ? 'Chưa có bài nào. Bấm "+ Thêm bài tập" để bắt đầu.'
                    : 'Không có bài nào khớp bộ lọc'}
                </div>
              )
            }}
            itemContent={(index, problem) => {
              const classification = groupClassificationByHe(problem, catById, parentMap, diffById);
              const gradeNames = (problem.gradeIds || []).map(id => gradeById[id]?.name).filter(Boolean);
              return (
                <div style={{ padding: '0 16px' }}>
                  <ProblemCard
                    problem={{ ...problem, gradeNames }}
                    classification={classification}
                    selected={selectedIds.includes(problem.id)}
                    onToggleSelect={() => onSelectChange(problem.id)}
                    onPreview={() => onPreviewClick(problem)}
                    onAddToCart={() => onAddToCart(problem)}
                    onEdit={() => onEdit(problem)}
                    onDelete={() => onDelete(problem.id)}
                    onCopied={() => success('Đã chép mã LaTeX')}
                  />
                </div>
              );
            }}
          />
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Tổng cộng <strong style={{ color: 'var(--color-text)' }}>{filteredAndSorted.length}</strong> bài thỏa điều kiện.
          </div>
        </div>
      );
      ```
      Xoá `isAllSelected` và prop `onSelectAll` không còn dùng (sẽ làm "Chọn tất cả" ở thanh hàng loạt Task 6 nếu cần).

- [ ] Bước 3: Kiểm tra biên dịch
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully`, 0 warning.

- [ ] Bước 4: Kiểm tra trực quan
      Run: `npx tauri dev`
      You should see: danh sách hiện **các thẻ** (đề render công thức, phân loại theo hệ + badge độ khó, footer nút). **Bấm vào thân thẻ** → viền xanh + dấu tích. Bấm **Lời giải** → bung khung xanh lá. Bấm **Mã LaTeX** → toast "Đã chép mã LaTeX" (dán thử ra Notepad thấy khối `\begin{bt}…\end{bt}`). Đề dài → cuộn được trong khung đề.

- [ ] Bước 5: Lưu tiến độ
      Run: `git add src/ && git commit -m "feat(ux): DataGrid -> Virtuoso card feed (render ProblemCard)"`

---

### Task 6: Thanh hành động hàng loạt (chọn bằng bấm thẻ)

**What you'll have when this is done:** Một thanh trên feed: khi chưa chọn thì mờ + gợi ý; khi đã chọn ≥1 bài thì **sáng lên** với Thêm/Xoá loạt + Bỏ chọn.

- [ ] Bước 1: Trong `src/components/DataGrid.jsx`, nhận thêm prop bulk từ App:
      Thêm vào danh sách props: `onBulkAddToCart, onBulkDelete, onClearSelection`.

- [ ] Bước 2: Ngay trên `<Virtuoso …/>` (chỗ ghi chú ở Task 5), chèn thanh hàng loạt:
      ```jsx
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, margin: '12px 16px',
                    padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          {selectedIds.length > 0 ? `Đã chọn ${selectedIds.length} bài` : 'Bấm vào thẻ để chọn — nút hàng loạt sẽ sáng lên'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="card-btn card-btn-primary" disabled={selectedIds.length === 0} onClick={onBulkAddToCart}>
            <ShoppingCart size={16} /> Thêm {selectedIds.length || ''} vào giỏ
          </button>
          <button className="card-btn card-btn-danger" disabled={selectedIds.length === 0} onClick={onBulkDelete}>
            <Trash2 size={16} /> Xoá {selectedIds.length || ''}
          </button>
          <button className="card-btn" disabled={selectedIds.length === 0} onClick={onClearSelection}>Bỏ chọn</button>
        </div>
      </div>
      ```
      Thêm `import { ShoppingCart, Trash2 } from 'lucide-react';` (nếu chưa có) ở đầu `DataGrid.jsx`. Thêm style mờ cho nút disabled vào `index.css`:
      ```css
      .card-btn:disabled { opacity: .4; cursor: default; }
      .card-btn:disabled:hover { background: var(--color-surface); }
      ```

- [ ] Bước 3: Trong `src/App.jsx`, truyền prop xuống `DataGrid` và **gỡ** cụm bulk khỏi `Toolbar`:
      Thêm vào `<DataGrid … />`: `onBulkAddToCart={handleBulkAddToCart} onBulkDelete={handleBulkDelete} onClearSelection={() => ui.setSelectedIds([])}`.
      Trong `src/components/Toolbar.jsx`: xoá khối `{selectedCount > 0 && ( … )}` và bỏ các prop `selectedCount, onBulkDelete, onBulkAddToCart` khỏi chữ ký + lời gọi trong App.

- [ ] Bước 4: Kiểm tra biên dịch + trực quan
      Run: `$env:CI="false"; npm run build` → `Compiled successfully`, 0 warning.
      Run: `npx tauri dev` → chưa chọn: thanh mờ + câu gợi ý. Bấm 2 thẻ → "Đã chọn 2 bài", nút sáng. Bấm **Thêm 2 vào giỏ** → toast + (sau Task 7) badge tăng. Chọn lại rồi **Xoá 2** → xác nhận → 2 bài biến mất. **Bỏ chọn** → thanh về mờ.

- [ ] Bước 5: Lưu tiến độ
      Run: `git add src/ && git commit -m "feat(ux): thanh hanh dong hang loat + chon bang bam the"`

---

### Task 7: Công tắc trang + badge giỏ + Giỏ thành trang riêng

**What you'll have when this is done:** Đầu màn có 2 tab `Danh sách bài | Giỏ đề (badge)`; bấm Giỏ → **trang Giỏ chiếm trọn màn**; Thêm giỏ chỉ toast + tăng badge (không nhảy trang).

- [ ] Bước 1: Trong `src/hooks/useUIState.js`: thêm `currentView`, bỏ `isCartOpen`:
      Thêm: `const [currentView, setCurrentView] = useState('feed');` và trả về `currentView, setCurrentView`.
      Xoá `isCartOpen, setIsCartOpen` (và mọi nơi dùng — sẽ sửa ở App).

- [ ] Bước 2: Trong `src/components/CartPanel.jsx`: đổi container ngoài cùng từ `height: '40%'` → `height: '100%'` (giỏ giờ là cả trang). Giữ nguyên mọi thứ khác (nút Làm sạch/Xuất/đóng). Đổi nút đóng `onClose` để **quay lại feed** (App sẽ truyền `() => ui.setCurrentView('feed')`), đổi `title` thành "Quay lại danh sách".

- [ ] Bước 3: Trong `src/App.jsx` — thêm **công tắc** ngay đầu cột nội dung (trên `Toolbar`), và rẽ nhánh theo `currentView`:
      ```jsx
      {/* Công tắc trang (mầm nav rail GĐ3) */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 2rem 0', backgroundColor: '#fff' }}>
        <button className={`view-tab ${ui.currentView === 'feed' ? 'on' : ''}`} onClick={() => ui.setCurrentView('feed')}>
          <List size={16} /> Danh sách bài
        </button>
        <button className={`view-tab ${ui.currentView === 'cart' ? 'on' : ''}`} onClick={() => ui.setCurrentView('cart')}>
          <ShoppingCart size={16} /> Giỏ đề
          {cartCount > 0 && <span className="view-badge">{cartCount}</span>}
        </button>
      </div>
      ```
      Thêm `import { List, ShoppingCart } from 'lucide-react';`. Bọc `Toolbar + ControlsRow + DataGrid` trong `{ui.currentView === 'feed' && ( … )}`, và thêm nhánh:
      ```jsx
      {ui.currentView === 'cart' && (
        <CartPanel items={cartItems} onRemove={removeFromCart} onClear={clearCart}
                   onExport={() => ui.setShowExportModal(true)} onClose={() => ui.setCurrentView('feed')} />
      )}
      ```

- [ ] Bước 4: Bỏ panel phải cũ của Giỏ + sửa "Thêm giỏ" để không nhảy trang:
      Trong `App.jsx`, ở `onAddToCart` của DataGrid: bỏ dòng `ui.setIsCartOpen(true);`, giữ `addToCart(prob)` + `success('Đã thêm vào giỏ!')`. (Badge tự cập nhật theo `cartCount`.)
      Tạm thời để khối panel phải `{(ui.selectedPreview || ui.isCartOpen) && (…)}` lại cho Preview — sẽ dọn ở Task 8. Trước mắt đổi điều kiện thành `{ui.selectedPreview && (…)}` và **xoá** phần render `CartPanel` bên trong nó (giỏ đã thành trang).

- [ ] Bước 5: Thêm style công tắc vào `index.css`:
      ```css
      .view-tab { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.9rem;
        border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted); border-radius: var(--radius-md); }
      .view-tab.on { background: var(--color-tag-bg); color: var(--color-accent); border-color: #BFDBFE; }
      .view-badge { background: var(--color-danger); color: #fff; font-size: 0.7rem; min-width: 18px; height: 18px;
        border-radius: var(--radius-pill); display: inline-flex; align-items: center; justify-content: center; padding: 0 5px; }
      ```

- [ ] Bước 6: Kiểm tra biên dịch + trực quan
      Run: `$env:CI="false"; npm run build` → 0 warning.
      Run: `npx tauri dev` → 2 tab hiện ở đầu. Thêm 1 bài vào giỏ → **badge "1"** hiện trên tab Giỏ, KHÔNG nhảy trang. Bấm tab **Giỏ đề** → trang Giỏ chiếm trọn màn; **Xuất Đề (.tex)** vẫn mở bảng cấu hình. Bấm **Danh sách bài** → về feed.

- [ ] Bước 7: Lưu tiến độ
      Run: `git add src/ && git commit -m "feat(ux): cong tac trang + badge gio + Gio thanh trang rieng"`

---

### Task 8: "Xem đầy đủ" thành hộp thoại giữa màn

**What you'll have when this is done:** Bấm "Xem đầy đủ" trên thẻ → hộp thoại giữa màn (đề/đáp án/lời giải), có nút Chép Mã LaTeX + bật/tắt lời giải; đóng bằng Esc/nền.

- [ ] Bước 1: Thêm 2 affordance vào `src/components/PreviewPanel.jsx` (đầu khu nội dung, trên "Đề bài:"):
      ```jsx
      import { buildProblemTex } from '../utils/buildProblemTex';
      // … trong component, trước return: dùng useState cho ẩn/hiện lời giải nếu muốn,
      // và hàm: const copyTex = () => navigator.clipboard.writeText(buildProblemTex(problem, { includeSolution: true }));
      ```
      Thêm một hàng nút nhỏ: `[Chép Mã LaTeX]` (gọi `copyTex` + toast qua prop `onCopied`) và `[Ẩn/Hiện lời giải]` (toggle một state `hideSolution`, bọc khối `{parsed.solution && !hideSolution && (…)}`).

- [ ] Bước 2: Tạo `src/components/PreviewModal.jsx` — bọc `PreviewPanel` vào lớp phủ giữa màn:
      ```jsx
      import React, { useEffect } from 'react';
      import PreviewPanel from './PreviewPanel';

      const PreviewModal = ({ problem, onClose, onCopied }) => {
        useEffect(() => {
          const onKey = (e) => { if (e.key === 'Escape') onClose(); };
          window.addEventListener('keydown', onKey);
          return () => window.removeEventListener('keydown', onKey);
        }, [onClose]);
        if (!problem) return null;
        return (
          <div onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex',
                     alignItems: 'flex-start', justifyContent: 'center', padding: '3vh 2rem', zIndex: 50 }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ width: 'min(760px, 100%)', maxHeight: '94vh', background: 'var(--color-surface)',
                       borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <PreviewPanel problem={problem} onClose={onClose} onCopied={onCopied} />
            </div>
          </div>
        );
      };
      export default PreviewModal;
      ```
      (PreviewPanel hiện có viền/`borderLeft` của panel phải — bỏ `borderLeft` đó cho hợp modal.)

- [ ] Bước 3: Trong `src/App.jsx`: thay khối panel phải `{ui.selectedPreview && (…)}` (và div bọc nửa phải) bằng modal đặt cạnh các modal khác:
      ```jsx
      {ui.selectedPreview && (
        <PreviewModal problem={ui.selectedPreview} onClose={() => ui.setSelectedPreview(null)} onCopied={() => success('Đã chép mã LaTeX')} />
      )}
      ```
      Thêm `import PreviewModal from './components/PreviewModal';`. Xoá div "NỬA PHẢI" nay đã trống, để feed/Giỏ chiếm full-width. (Bố cục ngoài cùng giờ là: Header → công tắc → nội dung 1 cột.)

- [ ] Bước 4: Kiểm tra biên dịch + trực quan
      Run: `$env:CI="false"; npm run build` → 0 warning.
      Run: `npx tauri dev` → bấm **Xem đầy đủ** trên thẻ → hộp thoại giữa màn, nền mờ. Bài Trắc nghiệm hiện 4 đáp án (đáp án đúng tô xanh). **Chép Mã LaTeX** → toast. **Ẩn/Hiện lời giải** đổi trạng thái. Bấm nền hoặc nhấn **Esc** → đóng. Feed phía sau đã **full-width**.

- [ ] Bước 5: Lưu tiến độ
      Run: `git add src/ && git commit -m "feat(ux): Xem day du thanh modal giua man + chep Ma LaTeX/toggle loi giai"`

---

### Task 9: Dọn dẹp + kiểm thử hồi quy toàn diện

**What you'll have when this is done:** App GĐ2 chạy gọn, biên dịch sạch, và **chứng minh xuất `.tex` vẫn byte-identical**.

- [ ] Bước 1: Dọn code chết
      Trong `useUIState.js` chắc chắn đã bỏ `isCartOpen`. Tìm các tham chiếu còn sót:
      Run: `git --no-pager grep -n "isCartOpen\|TableVirtuoso\|onSelectAll"` — mong đợi **không còn** kết quả trong `src/` (trừ tài liệu).

- [ ] Bước 2: Biên dịch sạch
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully`, **0 warning**.

- [ ] Bước 3: **Kiểm thử byte-identical lần cuối (BẮT BUỘC)**
      Run: `npx tauri dev`. Cho **đúng 3 bài như Task 0** vào giỏ (cùng thứ tự, cùng cấu hình xuất), lưu `_sau_gd2.tex`.
      Run: `git --no-pager diff --no-index -- _goc_truoc_gd2.tex _sau_gd2.tex`
      You should see: **không in gì** (giống hệt bản gốc trước GĐ2). Nếu khác → dừng, soi `buildProblemTex`/`handleFinalExport`.

- [ ] Bước 4: Bảng kiểm trực quan cuối (đi qua từng mục)
      - [ ] Feed thẻ render công thức; cuộn vô tận mượt với danh sách dài.
      - [ ] Bấm thẻ = chọn (viền xanh + tích); thanh hàng loạt sáng; Thêm/Xoá loạt chạy.
      - [ ] Đề dài cuộn trong vùng đề; chuột ra ngoài cuộn cả trang.
      - [ ] Lời giải bung tại chỗ (khung xanh lá) đúng màu.
      - [ ] 3 vùng thẻ tách màu rõ (đề trắng / khay / footer).
      - [ ] Xem đầy đủ = modal giữa; Chép Mã LaTeX; Esc đóng.
      - [ ] Công tắc Danh sách/Giỏ; badge số bài hiện khi >0; Thêm giỏ không nhảy trang.
      - [ ] Trang Giỏ: gỡ bài, Làm sạch, Xuất Đề (.tex) mở cấu hình.
      - [ ] Trạng thái rỗng: lọc không khớp → "Không có bài nào khớp bộ lọc".

- [ ] Bước 5: Dọn file tạm + lưu tiến độ
      Xoá các file `.tex` tạm (`_goc_truoc_gd2.tex`, `_sau_task2.tex`, `_sau_gd2.tex`) — đừng commit chúng.
      Run: `git add src/ && git commit -m "chore(ux): don code chet GD2 + kiem thu hoi quy"`

- [ ] Bước 6: Gộp nhánh (sau khi Thầy nghiệm thu)
      Run: `git checkout master && git merge --no-ff ux-gd2-card-feed`
      (Chỉ làm khi Thầy đã xem `npx tauri dev` và đồng ý.)

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Đọc hết plan một lượt trước khi bắt đầu.
2. Làm theo task **đúng thứ tự** — đừng nhảy cóc (Task 2 là chốt an toàn LaTeX, phải qua trước).
3. Hoàn tất bước "Kiểm tra / Check it works" của mỗi task rồi mới sang task kế.
4. Nếu có gì không như mong đợi, **dừng lại và mô tả Thầy thấy gì** — đừng thử sửa lung tung.

Nói **"let's start building"** (hoặc "bắt đầu Task 1") khi Thầy sẵn sàng.
