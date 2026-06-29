# Cải thiện cảnh báo trùng lặp — Build Plan

**What we're building:** Cảnh báo trùng khi Thêm/Sửa/Import giờ (1) hiện **danh sách nhiều bài** giống, (2) so **cả lời giải** (không chỉ đề), (3) có **ngưỡng chỉnh được** trong Cài đặt, (4) **kiểm trùng ngay khi Import**.

**Why:** Tránh nhập trùng tốt hơn — thấy hết các bài giống (không chỉ 1), bắt được cả trùng lời giải, tự đặt độ "khó tính", và Smart Import cũng cảnh báo trước khi lưu.

**Approach:** Tách logic so trùng ra util thuần `findDuplicates.js` (để viết test khoá), đổi `checkDuplicate` trả về **mảng** + đọc ngưỡng từ `localStorage`, viết lại `DuplicateWarningModal` thành danh sách, thêm thanh kéo ngưỡng ở Cài đặt, và gắn kiểm trùng vào bước rà soát của Smart Import. **KHÔNG đụng đường xuất, schema, hay DB.**

**Files we'll create or change:**
- `src/utils/findDuplicates.js` — [MỚI] `calculateSimilarity` (chuyển từ useProblems sang) + `findDuplicates`
- `src/utils/findDuplicates.test.js` — [MỚI] unit test (OR đề/lời giải, ngưỡng, danh sách, bỏ qua chính nó)
- `src/hooks/useProblems.js` — bỏ `calculateSimilarity` cục bộ; viết lại `checkDuplicate` (chữ ký mới + đọc ngưỡng + trả mảng)
- `src/components/Modals/DuplicateWarningModal.jsx` — viết lại theo danh sách + "Đề %· Lời giải %"
- `src/App.jsx` — 2 call site `checkDuplicate`; đổi `duplicateInfo`→`duplicates`; truyền `checkDuplicate` cho SmartImportModal
- `src/components/SettingsPage.jsx` — Row "Ngưỡng cảnh báo trùng" (thanh kéo 70–95%)
- `src/components/Modals/SmartImportModal.jsx` — nhận prop `checkDuplicate`; gắn cờ trùng ở bước rà soát + chip cảnh báo

**Spec:** `.docs/specs/2026-06-29-canh-bao-trung-design.md` (đọc trước khi build).

> ✅ **An toàn:** `buildProblemTex.js`, `db.js`, schema **KHÔNG đổi** (chỉ ĐỌC đề/lời giải + 1 thiết lập localStorage). Golden test xuất giữ nguyên 3/3.

> ⚠️ **Thứ tự bắt buộc:** `checkDuplicate` **đổi chữ ký** ở Task 2 → App phải cập nhật ở Task 4 thì app mới chạy lại đúng. Vì vậy **chỉ chạy `npx tauri dev` để nghiệm thu SAU Task 4** (Task 2 & 3 chỉ lưu file, chưa chạy được giữa chừng).

---

### Task 1: Tạo util so trùng + viết test (làm & kiểm trước, độc lập giao diện)

**What you'll have when this is done:** Một hàm `findDuplicates` thuần, có test khoá (OR đề/lời giải, đọc ngưỡng qua tham số, trả danh sách xếp giảm dần).

- [ ] Step 1: Tạo file mới `src/utils/findDuplicates.js` với nội dung:
      ```javascript
      // So trùng bài tập (Sorensen-Dice trên bigram ký tự) — tách riêng để test được.
      // KHÔNG đụng đường xuất. useProblems sẽ import lại từ đây.

      // Tính độ tương đồng Sorensen-Dice dựa trên character bigrams (tần suất cặp ký tự)
      export const calculateSimilarity = (str1, str2) => {
        if (!str1 || !str2) return 0.0;

        // Chuẩn hóa văn bản: Chuyển thường, loại bỏ khoảng trắng và xuống dòng
        const clean1 = str1.toLowerCase().replace(/\s+/g, '');
        const clean2 = str2.toLowerCase().replace(/\s+/g, '');

        if (clean1 === clean2) return 1.0;
        if (clean1.length < 2 || clean2.length < 2) return 0.0;

        const bigrams1 = new Set();
        for (let i = 0; i < clean1.length - 1; i++) {
          bigrams1.add(clean1.substring(i, i + 2));
        }
        const bigrams2 = new Set();
        for (let i = 0; i < clean2.length - 1; i++) {
          bigrams2.add(clean2.substring(i, i + 2));
        }

        let intersection = 0;
        for (const val of bigrams1) {
          if (bigrams2.has(val)) intersection++;
        }

        // Sorensen-Dice: 2 * |A ∩ B| / (|A| + |B|)
        return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
      };

      // Tìm bài trùng trong kho: gắn cờ nếu ĐỀ hoặc LỜI GIẢI vượt ngưỡng (OR).
      // Trả MẢNG { problem, statementSimilarity, solutionSimilarity } xếp % giảm dần.
      export const findDuplicates = (problems, newStatement, newSolution, threshold = 0.85, currentId = null) => {
        const matches = [];
        for (const prob of problems) {
          if (currentId && prob.id === currentId) continue; // bỏ qua chính nó khi Sửa
          const statementSimilarity = calculateSimilarity(newStatement, prob.statement);
          const solutionSimilarity = calculateSimilarity(newSolution, prob.solution);
          if (statementSimilarity >= threshold || solutionSimilarity >= threshold) {
            matches.push({ problem: prob, statementSimilarity, solutionSimilarity });
          }
        }
        matches.sort(
          (a, b) =>
            Math.max(b.statementSimilarity, b.solutionSimilarity) -
            Math.max(a.statementSimilarity, a.solutionSimilarity)
        );
        return matches;
      };
      ```

- [ ] Step 2: Tạo file mới `src/utils/findDuplicates.test.js`:
      ```javascript
      import { calculateSimilarity, findDuplicates } from './findDuplicates';

      const bank = [
        { id: 1, statement: 'Tính đạo hàm của hàm số y = x^2.', solution: 'Đạo hàm bằng 2x.' },
        { id: 2, statement: 'Giải phương trình bậc hai x^2 - 5x + 6 = 0.', solution: 'Nghiệm là 2 và 3.' },
        { id: 3, statement: 'Cho tam giác ABC vuông tại A.', solution: 'Áp dụng định lý Pytago.' },
      ];

      test('calculateSimilarity: chuỗi giống hệt -> 1.0', () => {
        expect(calculateSimilarity('Cho tam giác ABC.', 'Cho tam giác ABC.')).toBe(1.0);
      });

      test('findDuplicates: chỉ ĐỀ giống vẫn gắn cờ (OR)', () => {
        const r = findDuplicates(bank, 'Tính đạo hàm của hàm số y = x^2.', 'Một lời giải khác hẳn không liên quan.', 0.85);
        expect(r.length).toBe(1);
        expect(r[0].problem.id).toBe(1);
        expect(r[0].statementSimilarity).toBe(1.0);
        expect(r[0].solutionSimilarity).toBeLessThan(0.85);
      });

      test('findDuplicates: chỉ LỜI GIẢI giống vẫn gắn cờ (OR)', () => {
        const r = findDuplicates(bank, 'Một đề bài hoàn toàn mới về xác suất thống kê.', 'Đạo hàm bằng 2x.', 0.85);
        expect(r.length).toBe(1);
        expect(r[0].problem.id).toBe(1);
        expect(r[0].solutionSimilarity).toBe(1.0);
        expect(r[0].statementSimilarity).toBeLessThan(0.85);
      });

      test('findDuplicates: không gì vượt ngưỡng -> mảng rỗng', () => {
        const r = findDuplicates(bank, 'Đề bài mới lạ không giống ai cả.', 'Lời giải mới toanh khác biệt.', 0.85);
        expect(r).toEqual([]);
      });

      test('findDuplicates: trả danh sách xếp % giảm dần', () => {
        const dupBank = [
          { id: 1, statement: 'Cho tam giác ABC.', solution: 'x' },
          { id: 2, statement: 'Cho tam giác ABC đều cạnh a.', solution: 'y' },
        ];
        const r = findDuplicates(dupBank, 'Cho tam giác ABC.', '', 0.5);
        expect(r.length).toBe(2);
        expect(r[0].problem.id).toBe(1); // giống nhất (1.0) đứng đầu
        expect(r[0].statementSimilarity).toBeGreaterThanOrEqual(r[1].statementSimilarity);
      });

      test('findDuplicates: bỏ qua chính nó khi Sửa (currentId)', () => {
        const r = findDuplicates(bank, bank[0].statement, bank[0].solution, 0.85, 1);
        expect(r).toEqual([]);
      });
      ```

- [ ] Step 3: Check it works
      Run: `npx react-scripts test --watchAll=false`
      You should see: tất cả **pass** — **14 passed** (6 mới của findDuplicates + 5 extractFigures + 3 golden buildContentFile). Nếu 1 test lệch, KHÔNG sửa test cho khớp; xem lại logic `findDuplicates`.

### Task 2: Đấu `checkDuplicate` sang dùng util mới (chữ ký mới + đọc ngưỡng)

**What you'll have when this is done:** `useProblems` dùng chung `findDuplicates`, đọc ngưỡng từ Cài đặt, trả về mảng.

- [ ] Step 1: Mở `src/hooks/useProblems.js`. Ngay dưới dòng `import { getDb } from '../utils/db';` (dòng 2), THÊM:
      ```javascript
      import { findDuplicates } from '../utils/findDuplicates';
      ```
- [ ] Step 2: XOÁ toàn bộ khối `calculateSimilarity` cục bộ (từ dòng comment `// Tính độ tương đồng Sorensen-Dice...` tới dấu `};` đóng hàm — khoảng dòng 33–66). Hàm này đã chuyển sang util ở Task 1; không nơi nào khác trong file dùng nó.
- [ ] Step 3: THAY toàn bộ hàm `checkDuplicate` (khối `const checkDuplicate = useCallback(...)`, khoảng dòng 291–323) bằng:
      ```javascript
      // 7. KIỂM TRA TRÙNG LẶP (Duplicate Detection)
      // Trả MẢNG bài trùng (đề HOẶC lời giải vượt ngưỡng), xếp % giảm dần. Rỗng nếu không trùng.
      const checkDuplicate = useCallback((newStatement, newSolution, currentId = null) => {
        if (!newStatement && !newSolution) return [];

        // Nếu đang chỉnh sửa và đề bài mới giống hệt đề bài cũ trong DB, tự động bỏ qua check trùng
        if (currentId) {
          const originalProblem = problems.find(p => p.id === currentId);
          if (originalProblem && (originalProblem.statement || '').trim() === (newStatement || '').trim()) {
            return [];
          }
        }

        // Đọc ngưỡng Thầy đặt trong Cài đặt (mặc định 85%).
        const pct = parseInt(localStorage.getItem('pb-dup-threshold') ?? '85', 10);
        const threshold = (Number.isNaN(pct) ? 85 : pct) / 100;

        return findDuplicates(problems, newStatement, newSolution, threshold, currentId);
      }, [problems]);
      ```
- [ ] Step 4: Check it works
      Lưu file. **Chưa chạy `tauri dev` lúc này** — App.jsx vẫn gọi `checkDuplicate` kiểu cũ nên app sẽ sai cho tới khi xong Task 4. (Có thể chạy `npm run build` để xác nhận **không lỗi cú pháp**; cảnh báo về cách dùng sẽ hết sau Task 4.)

### Task 3: Viết lại `DuplicateWarningModal` thành danh sách + 2 %

**What you'll have when this is done:** Modal cảnh báo hiện nhiều bài giống, mỗi bài kèm "Đề: x% · Lời giải: y%".

- [ ] Step 1: Mở `src/components/Modals/DuplicateWarningModal.jsx` và THAY **toàn bộ** nội dung file bằng:
      ```jsx
      import React from 'react';
      import { AlertTriangle, X, Save } from 'lucide-react';
      import MathText from '../MathText';

      const pct = (v) => (v * 100).toFixed(0);

      const DuplicateWarningModal = ({ pendingSave, onConfirm, onCancel }) => {
        if (!pendingSave) return null;
        const { problem, duplicates } = pendingSave;
        if (!duplicates || duplicates.length === 0) return null;
        const shown = duplicates.slice(0, 5);
        const extra = duplicates.length - shown.length;

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, backdropFilter: 'blur(4px)', padding: '1rem'
          }}>
            <div style={{
              backgroundColor: 'var(--color-surface)', borderRadius: '16px', width: '100%', maxWidth: '680px',
              boxShadow: '0 25px 50px -12px var(--shadow)', display: 'flex', flexDirection: 'column',
              overflow: 'hidden', border: '1px solid var(--color-border)', animation: 'scaleUp 0.15s ease-out'
            }}>

              {/* Header - cảnh báo (amber) */}
              <div style={{
                padding: '1.25rem 1.5rem', backgroundColor: 'var(--color-amber-bg)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-amber-text)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700 }}>
                  <AlertTriangle size={22} />
                  Cảnh báo: Tìm thấy {duplicates.length} bài tương tự
                </h2>
                <button onClick={onCancel} className="card-btn" style={{ border: 'none', background: 'transparent', color: 'var(--color-amber-text)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Nội dung đối sánh */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '60vh', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.92rem', lineHeight: '1.5' }}>
                  Câu hỏi Thầy đang soạn tương đồng với {duplicates.length} câu đã lưu. Vui lòng rà soát trước khi lưu:
                </p>

                {/* Khối: Đang nhập */}
                <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1rem', backgroundColor: 'var(--color-surface-muted)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-cobalt)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📝 Câu hỏi Thầy đang soạn
                  </div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)', maxHeight: '150px', overflowY: 'auto' }}>
                    <MathText text={problem.statement} />
                  </div>
                </div>

                {/* Danh sách bài trùng */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {shown.map(({ problem: ex, statementSimilarity, solutionSimilarity }) => (
                    <div key={ex.id} style={{ border: '1px solid var(--color-diff-border)', borderRadius: '10px', padding: '1rem', backgroundColor: 'var(--color-amber-bg)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-amber-text)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🔍 {ex.topic || 'Đã lưu'}{ex.level ? ` • Lvl ${ex.level}` : ''}</span>
                        <span style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-amber-text)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                          Đề: {pct(statementSimilarity)}% · Lời giải: {pct(solutionSimilarity)}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-diff-border)', maxHeight: '120px', overflowY: 'auto' }}>
                        <MathText text={ex.statement} />
                      </div>
                    </div>
                  ))}
                  {extra > 0 && (
                    <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      +{extra} bài nữa
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--color-surface-muted)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button onClick={onCancel} className="card-btn" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
                  Quay lại chỉnh sửa
                </button>
                <button onClick={onConfirm} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-amber)', color: 'var(--color-on-amber)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Save size={16} /> Vẫn tiếp tục lưu
                </button>
              </div>

            </div>
          </div>
        );
      };

      export default DuplicateWarningModal;
      ```
- [ ] Step 2: Check it works
      Lưu file. (Vẫn chưa chạy `tauri dev` — chờ Task 4 nối App.)

### Task 4: Nối App.jsx (2 call site + đổi `duplicates` + truyền prop) → nghiệm thu #1+#2

**What you'll have when this is done:** Thêm/Sửa một bài gần giống nhiều bài → modal hiện danh sách kèm 2 %.

- [ ] Step 1: Mở `src/App.jsx`. Tìm dòng khai báo state (≈ dòng 45):
      ```javascript
      const [pendingSave, setPendingSave] = useState(null); // { type: 'add' | 'edit', problem, duplicateInfo }
      ```
      Đổi phần chú thích cuối dòng thành `// { type: 'add' | 'edit', problem, duplicates }`.
- [ ] Step 2: Trong `<AddProblemModal ... onSave={(prob) => {...}}>` (≈ dòng 247–256), THAY 3 dòng đầu:
      ```javascript
      const dup = checkDuplicate(prob.statement);
      if (dup) {
        setPendingSave({ type: 'add', problem: prob, duplicateInfo: dup });
      } else {
      ```
      bằng:
      ```javascript
      const dups = checkDuplicate(prob.statement, prob.solution);
      if (dups.length) {
        setPendingSave({ type: 'add', problem: prob, duplicates: dups });
      } else {
      ```
- [ ] Step 3: Trong `<EditProblemModal ... onSave={(prob) => {...}}>` (≈ dòng 266–269), THAY tương tự:
      ```javascript
      const dup = checkDuplicate(prob.statement, prob.id);
      if (dup) {
        setPendingSave({ type: 'edit', problem: prob, duplicateInfo: dup });
      } else {
      ```
      bằng:
      ```javascript
      const dups = checkDuplicate(prob.statement, prob.solution, prob.id);
      if (dups.length) {
        setPendingSave({ type: 'edit', problem: prob, duplicates: dups });
      } else {
      ```
- [ ] Step 4: Trong `<SmartImportModal ... />` (≈ dòng 280), THÊM prop `checkDuplicate` (chuẩn bị cho Task 6):
      ```jsx
      <SmartImportModal
        onClose={() => ui.setShowImportModal(false)}
        checkDuplicate={checkDuplicate}
        onSave={(newProbs) => {
      ```
      (`handleConfirmDuplicateSave`/`handleCancelDuplicateSave` GIỮ NGUYÊN — chỉ dùng `type`, `problem`.)
- [ ] Step 5: Check it works
      Run: `npm run build` → `Compiled successfully.` **0 warning**.
      Run: `npx tauri dev`. Thêm một bài có đề gần giống ≥1 bài đã có (vd copy đề một bài cũ rồi sửa nhẹ vài chữ) → bấm Lưu → modal **"Tìm thấy N bài tương tự"** hiện danh sách, mỗi bài có "Đề: x% · Lời giải: y%". Bấm "Quay lại" rồi "Vẫn tiếp tục lưu" đều hoạt động.

### Task 5: Thêm ngưỡng cảnh báo trùng trong Cài đặt

**What you'll have when this is done:** Thanh kéo 70–95% trong Cài đặt; đổi xong là lần cảnh báo sau dùng ngưỡng mới (không cần khởi động lại).

- [ ] Step 1: Mở `src/components/SettingsPage.jsx`. Ở dòng import lucide (dòng 2), thêm `AlertTriangle`:
      ```javascript
      import { FolderTree, Moon, Type, FileDown, KeyRound, Database, AlertTriangle } from 'lucide-react';
      ```
- [ ] Step 2: Ngay sau dòng `const saveKey = () => {...};` (≈ dòng 49), THÊM state + hàm lưu ngưỡng:
      ```javascript
      const [dupThreshold, setDupThreshold] = useState(parseInt(localStorage.getItem('pb-dup-threshold') ?? '85', 10) || 85);
      const changeDupThreshold = (val) => {
        setDupThreshold(val);
        localStorage.setItem('pb-dup-threshold', String(val));
      };
      ```
- [ ] Step 3: Trong phần JSX, ngay sau `<Row ... title="Thư mục template xuất" .../>` (kết thúc ≈ dòng 174), THÊM khối:
      ```jsx
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ color: 'var(--color-cobalt)', display: 'flex' }}><AlertTriangle size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Ngưỡng cảnh báo trùng</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Khi Thêm/Sửa/Import, cảnh báo nếu đề hoặc lời giải giống ≥ mức này.</div>
          </div>
          <span style={{ fontWeight: 700, color: 'var(--color-cobalt)', fontSize: '1.1rem', minWidth: 48, textAlign: 'right' }}>{dupThreshold}%</span>
        </div>
        <input
          type="range" min={70} max={95} step={1} value={dupThreshold}
          onChange={(e) => changeDupThreshold(parseInt(e.target.value, 10))}
          style={{ width: '100%', accentColor: 'var(--color-cobalt)' }}
        />
      </div>
      ```
- [ ] Step 4: Check it works
      Run: `npm run build` → 0 warning.
      Run: `npx tauri dev` → vào **Cài đặt**: thấy "Ngưỡng cảnh báo trùng" với thanh kéo, kéo thấy số % đổi theo. Hạ ngưỡng xuống 70% rồi Thêm một bài hơi giống → cảnh báo dễ nổ hơn; nâng lên 95% → ít cảnh báo hơn. (Xác nhận ngưỡng có tác dụng ngay, không cần restart.)

### Task 6: Kiểm trùng khi Import (Smart Import)

**What you'll have when this is done:** Bước rà soát của Smart Import hiện chip cảnh báo cho mỗi bài có thể trùng với kho đã lưu.

- [ ] Step 1: Mở `src/components/Modals/SmartImportModal.jsx`. Ở dòng import lucide (dòng 2), thêm `AlertTriangle`:
      ```javascript
      import { X, Upload, FileText, CheckCircle, Trash2, Loader, AlertTriangle } from 'lucide-react';
      ```
- [ ] Step 2: Ở khai báo component (dòng 11), thêm prop `checkDuplicate`:
      ```javascript
      const SmartImportModal = ({ onClose, onSave, checkDuplicate }) => {
      ```
- [ ] Step 3: Trong `handleProcess`, tìm khối (≈ dòng 130–132):
      ```javascript
      if (tempResults.length > 0) {
        setResults(tempResults);
        setStep('review');
      ```
      THAY 1 dòng `setResults(tempResults);` bằng đoạn kiểm trùng rồi mới set:
      ```javascript
      if (tempResults.length > 0) {
        // Kiểm trùng với kho đã lưu (đối chiếu từng bài vừa bóc tách).
        const checked = tempResults.map(item => {
          const { statement, solution } = parseProblemLatex(item.rawLatex);
          const dups = checkDuplicate(statement, solution);
          return dups.length ? { ...item, dup: dups[0] } : item;
        });
        setResults(checked);
        setStep('review');
      ```
      (Giữ nguyên các dòng `toast.*` và phần `else` phía sau.)
- [ ] Step 4: Trong phần render thẻ rà soát, tìm chỗ kết thúc hàng nút trên cùng (sau `</div>` đóng khối `display: 'flex', justifyContent: 'space-between'` chứa `<select>` + nút xoá, ngay TRƯỚC `<textarea`, ≈ dòng 273). THÊM chip cảnh báo:
      ```jsx
      {res.dup && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--color-amber-bg)', color: 'var(--color-amber-text)', fontSize: '0.85rem', fontWeight: 600 }}>
          <AlertTriangle size={16} />
          <span>Có thể trùng với một bài đã lưu — Đề: {(res.dup.statementSimilarity * 100).toFixed(0)}% · Lời giải: {(res.dup.solutionSimilarity * 100).toFixed(0)}%</span>
        </div>
      )}
      ```
- [ ] Step 5: Check it works
      Run: `npm run build` → 0 warning.
      Run: `npx tauri dev`. Trước tiên đảm bảo trong kho có sẵn 1 bài. Mở **Smart Import**, tải 1 file `.tex` chứa đúng bài đó (hoặc gần giống) → ở bước **rà soát**, thẻ của bài đó hiện chip amber "Có thể trùng… — Đề x% · Lời giải y%". Bài mới hoàn toàn thì không có chip.

### Task 7: Nghiệm thu an toàn xuất + test + lưu

**What you'll have when this is done:** Chắc chắn đường xuất `.tex` KHÔNG đổi (golden 3/3), test xanh, đã commit code.

- [ ] Step 1: Chạy toàn bộ test: `npx react-scripts test --watchAll=false` → **14 passed** (6 findDuplicates + 5 extractFigures + **3 golden buildContentFile KHÔNG đổi**). Golden không đổi = đường xuất nguyên vẹn.
- [ ] Step 2: `npm run build` → `Compiled successfully.` **0 warning**.
- [ ] Step 3: Kiểm tra an toàn LaTeX (dù tính năng này không đụng xuất): tạo 1 bài có công thức `$x^2 + y^2 = z^2$`, thêm vào giỏ, **Xuất file nội dung** ra `D:\check-trung.tex`. Mở file: công thức `$x^2 + y^2 = z^2$` còn nguyên vẹn (chứng tỏ cảnh báo trùng không làm hỏng nội dung lưu/xuất).
- [ ] Step 4: Lưu tiến độ (spec+plan đã commit sẵn; chỉ commit code):
      Run: `git add src/utils/findDuplicates.js src/utils/findDuplicates.test.js src/hooks/useProblems.js src/components/Modals/DuplicateWarningModal.jsx src/App.jsx src/components/SettingsPage.jsx src/components/Modals/SmartImportModal.jsx`
      Run: `git commit -m "feat(dup): canh bao trung nang cao - danh sach + so loi giai + nguong + kiem khi import"`
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
- `git status`: chỉ 7 file trên (+ docs spec/plan). KHÔNG đụng `buildProblemTex.js`, `db.js`, schema, capabilities Rust.
- Test: **14 passed**, trong đó **golden 3/3 KHÔNG đổi** (đường xuất nguyên vẹn) + 6 test findDuplicates (OR đề/lời giải, ngưỡng, danh sách giảm dần, bỏ qua chính nó).
- `checkDuplicate` đổi chữ ký `(newStatement, newSolution, currentId)` → grep xác nhận **đúng 2 call site** trong `App.jsx` đã đổi sang `(prob.statement, prob.solution[, prob.id])` và dùng `dups.length` / `duplicates`. Không còn chỗ nào gọi kiểu cũ (`duplicateInfo`, tham số `threshold`).
- `calculateSimilarity` đã rời `useProblems.js` (chỉ còn trong `findDuplicates.js`); useProblems chỉ import `findDuplicates`.
- Ngưỡng đọc từ `localStorage['pb-dup-threshold']` (mặc định 85) — không thêm bảng/cột.
- Smart Import: prop `checkDuplicate` được truyền; kiểm trùng chạy 1 lần trong `handleProcess` (không mỗi phím → không cảnh báo eslint exhaustive-deps); chip chỉ hiện khi `res.dup`.
- DuplicateWarningModal nhận `duplicates` (mảng); thủ phòng `duplicates.length === 0 → return null`.
