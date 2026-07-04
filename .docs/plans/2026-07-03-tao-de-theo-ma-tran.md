# Tạo Đề Theo Ma Trận — Build Plan

**What we're building:** Một màn mới "Tạo đề" cho phép Thầy khai báo một *ma trận* (mỗi chủ đề cần bao nhiêu câu ở mỗi mức độ, trong 1 hệ, lọc lớp tuỳ chọn); app tự bốc đủ câu khớp từng ô (ngẫu nhiên, né câu đã dùng ≤30 ngày, không lặp), cho Thầy xem lại/đổi/bỏ, rồi đổ vào **Giỏ đề** để Xuất như thường.

**Why:** Ra đề nhanh và cân đối theo ma trận, tự tránh lặp câu học sinh vừa gặp — thay cho việc bốc tay từng câu.

**Approach:** Tách 2 phần. Phần 1 là **động cơ chọn bài** = một hàm *thuần* (chỉ tính toán từ dữ liệu đưa vào, không đụng CSDL/React) nên viết bài kiểm (test) dễ và chắc. Phần 2 là **trang giao diện** `MatrixPage` dùng động cơ đó + tái dùng cây phân loại, renderer LaTeX, và Giỏ có sẵn. **Không đụng một dòng nào** ở đường xuất `.tex`: trang chỉ *rót câu vào Giỏ* y như thao tác "Thêm giỏ" tay.

**Spec:** [.docs/specs/2026-07-03-tao-de-theo-ma-tran-design.md](../specs/2026-07-03-tao-de-theo-ma-tran-design.md) (đọc trước khi build).

**Files we'll create or change:**
- `src/utils/examMatrix.js` — [MỚI] động cơ chọn bài (thuần): bốc theo ma trận, đếm câu khả dụng, đổi 1 câu
- `src/utils/examMatrix.test.js` — [MỚI] bài kiểm cho động cơ (tất định)
- `src/components/MatrixPage.jsx` — [MỚI] trang "Tạo đề": dựng ma trận → xem lại → đưa vào Giỏ
- `src/components/NavRail.jsx` — thêm mục "Tạo đề" (giữa "Bài" và "Giỏ")
- `src/hooks/useUIState.js` — thêm `'matrix'` vào chú thích các màn của `currentView` (không thêm state mới)
- `src/App.jsx` — nối trang vào điều hướng; tải lịch sử xuất khi vào màn "Tạo đề"; hàm đổ nhiều câu vào Giỏ

**Giải nghĩa vài từ:** *hàm thuần* = hàm chỉ tính từ dữ liệu đưa vào, không đọc/ghi CSDL hay React → test dễ; *prop* = mẩu dữ liệu/hàm mà component cha truyền xuống con; *memo hoá* (`useMemo`) = React chỉ tính lại khi đầu vào đổi; *rng* = bộ sinh số ngẫu nhiên (ta cho tiêm vào để test tất định); *shortfall* = phần thiếu (xin N câu mà kho chỉ có k < N).

> ✅ **An toàn:** Tính năng này **không đổi cấu trúc CSDL** (không bảng/cột mới) và **không đụng** `buildProblemTex.js` / `buildContentFile.js` / `ExportModal.jsx` / `db.js` / Rust. Nó chỉ ĐỌC dữ liệu có sẵn (`problems`, cây phân loại, lịch sử xuất) và gọi `addToCart` như thao tác Thêm giỏ tay. **Golden export phải giữ nguyên 3/3 suốt toàn bộ plan.**

> ⚠️ **Thứ tự bắt buộc:** Làm đúng Task 1→5. Sau Task 1 đã có động cơ + test xanh (điểm dừng tự nhiên nếu cần nghỉ). Tính năng chỉ chạy được trong app từ sau Task 3.

---

### Task 1: Động cơ chọn bài `examMatrix.js` + bài kiểm

**What you'll have when this is done:** Một hàm thuần bốc câu theo ma trận (né câu vừa dùng, không lặp), có bài kiểm khoá hành vi — CHƯA nối vào giao diện.

- [ ] Bước 1: Tạo file mới `src/utils/examMatrix.js` với nội dung:
      ```javascript
      // ĐỘNG CƠ CHỌN BÀI THEO MA TRẬN — hàm THUẦN (không import DB/React) để test được.
      // Khớp ứng viên cho một ô (chủ đề × mức độ) trong 1 hệ + lọc lớp tuỳ chọn; ưu tiên câu
      // "lâu chưa dùng" (không nằm trong recentUsageIds) trước câu vừa dùng; không lặp câu
      // giữa các ô của cùng một lần tạo. Tự nội tuyến việc leo cây con (KHÔNG import từ
      // useTaxonomy để tránh kéo theo @tauri-apps/plugin-sql vào môi trường test).

      // Lấy chính nhánh + mọi nhánh con bên dưới. childrenMap: { [parentId]: [childId, ...] }
      const collectDescendantIds = (rootId, childrenMap) => {
        const out = [rootId];
        const stack = [rootId];
        while (stack.length) {
          const cur = stack.pop();
          for (const c of (childrenMap[cur] || [])) { out.push(c); stack.push(c); }
        }
        return out;
      };

      // Trộn mảng bằng Fisher–Yates, dùng rng tiêm vào (mặc định Math.random) để test tất định.
      const shuffle = (arr, rng) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };

      // Các bài khớp một ô (chủ đề = categoryId gồm cả nhánh con, mức độ = difficultyId trong hệ heId),
      // đúng lớp nếu có gradeId, và chưa bị dùng ở ô khác (excludeIds).
      const candidatesForCell = (problems, childrenMap, heId, gradeId, categoryId, difficultyId, excludeIds) => {
        const inBranch = new Set(collectDescendantIds(categoryId, childrenMap));
        return (problems || []).filter((p) =>
          !excludeIds.has(p.id) &&
          (p.difficultyByHe || {})[heId] === difficultyId &&
          (p.categoryIds || []).some((cid) => inBranch.has(cid)) &&
          (!gradeId || (p.gradeIds || []).includes(gradeId))
        );
      };

      // Xếp câu chưa-dùng lên trước, mỗi nhóm trộn ngẫu nhiên, rồi lấy `count` câu đầu.
      const rankAndPick = (candidates, count, recentUsageIds, rng) => {
        const fresh = candidates.filter((p) => !recentUsageIds.has(p.id));
        const recent = candidates.filter((p) => recentUsageIds.has(p.id));
        const ordered = [...shuffle(fresh, rng), ...shuffle(recent, rng)];
        return ordered.slice(0, count);
      };

      // Bốc cả ma trận. rows: [{ rowId, categoryId, counts: { [difficultyId]: number } }]
      export const generateExamMatrix = ({ problems, childrenMap, heId, gradeId, rows, recentUsageIds, rng = Math.random }) => {
        const usedIds = new Set();
        const cells = [];
        for (const row of (rows || [])) {
          for (const [difficultyId, rawCount] of Object.entries(row.counts || {})) {
            const n = parseInt(rawCount, 10) || 0;
            if (n <= 0) continue;
            const cands = candidatesForCell(problems, childrenMap, heId, gradeId, row.categoryId, difficultyId, usedIds);
            const picked = rankAndPick(cands, n, recentUsageIds, rng);
            picked.forEach((p) => usedIds.add(p.id));
            cells.push({ rowId: row.rowId, categoryId: row.categoryId, difficultyId, requested: n, picked, shortfall: n - picked.length });
          }
        }
        const pickedProblems = [];
        const seen = new Set();
        for (const c of cells) for (const p of c.picked) if (!seen.has(p.id)) { seen.add(p.id); pickedProblems.push(p); }
        const totalRequested = cells.reduce((s, c) => s + c.requested, 0);
        return { cells, pickedProblems, totalRequested, totalPicked: pickedProblems.length };
      };

      // Đếm "còn X khả dụng" cho nhãn dưới ô (độc lập từng ô — chưa trừ ô khác).
      export const countAvailableForCell = ({ problems, childrenMap, heId, gradeId, categoryId, difficultyId }) =>
        candidatesForCell(problems, childrenMap, heId, gradeId, categoryId, difficultyId, new Set()).length;

      // Đổi 1 câu khác trong một ô: loại mọi id đang hiển thị (excludeIds), trả 1 câu hoặc null nếu hết.
      export const pickReplacementProblem = ({ problems, childrenMap, heId, gradeId, categoryId, difficultyId, excludeIds, recentUsageIds, rng = Math.random }) => {
        const cands = candidatesForCell(problems, childrenMap, heId, gradeId, categoryId, difficultyId, excludeIds);
        const picked = rankAndPick(cands, 1, recentUsageIds, rng);
        return picked[0] || null;
      };
      ```

- [ ] Bước 2: Tạo file mới `src/utils/examMatrix.test.js` với nội dung:
      ```javascript
      import { generateExamMatrix, countAvailableForCell, pickReplacementProblem } from './examMatrix';

      // Cây: Hệ 'H' -> A -> A1 ; Hệ 'H' -> B
      const childrenMap = { H: ['A', 'B'], A: ['A1'] };

      // Bộ bài mẫu (mức 'd1' trừ p5 ở 'd2')
      const P = {
        p1: { id: 'p1', categoryIds: ['A'],      difficultyByHe: { H: 'd1' }, gradeIds: ['g9'] },
        p2: { id: 'p2', categoryIds: ['A1'],     difficultyByHe: { H: 'd1' }, gradeIds: ['g9'] }, // con của A
        p3: { id: 'p3', categoryIds: ['B'],      difficultyByHe: { H: 'd1' }, gradeIds: ['g8'] },
        p4: { id: 'p4', categoryIds: ['A', 'B'], difficultyByHe: { H: 'd1' }, gradeIds: [] },      // vừa A vừa B
        p5: { id: 'p5', categoryIds: ['A'],      difficultyByHe: { H: 'd2' }, gradeIds: ['g9'] },  // khác mức
      };
      const problems = Object.values(P);
      const noRecent = new Set();

      const gen = (rows, opts = {}) => generateExamMatrix({
        problems, childrenMap, heId: 'H', gradeId: null, rows, recentUsageIds: noRecent, ...opts,
      });

      test('bốc đúng số câu khi kho đủ', () => {
        const { cells } = gen([{ rowId: 'r', categoryId: 'A', counts: { d1: 2 } }]);
        expect(cells).toHaveLength(1);
        expect(cells[0].picked).toHaveLength(2);
        expect(cells[0].shortfall).toBe(0);
      });

      test('kho thiếu -> lấy hết + báo shortfall', () => {
        const { cells } = gen([{ rowId: 'r', categoryId: 'A', counts: { d1: 5 } }]); // A-subtree d1 = p1,p2,p4
        expect(cells[0].picked).toHaveLength(3);
        expect(cells[0].shortfall).toBe(2);
      });

      test('ưu tiên câu chưa dùng: p1 vừa dùng -> không bị bốc khi còn câu fresh', () => {
        const { cells } = gen([{ rowId: 'r', categoryId: 'A', counts: { d1: 2 } }], { recentUsageIds: new Set(['p1']) });
        const ids = cells[0].picked.map((p) => p.id);
        expect(ids).toHaveLength(2);
        expect(new Set(ids)).toEqual(new Set(['p2', 'p4'])); // p1 (recent) bị đẩy xuống dự bị
      });

      test('không lặp câu giữa các ô trong cùng một đề', () => {
        const { cells, pickedProblems } = gen([
          { rowId: 'rA', categoryId: 'A', counts: { d1: 3 } },
          { rowId: 'rB', categoryId: 'B', counts: { d1: 2 } },
        ]);
        const allIds = cells.flatMap((c) => c.picked.map((p) => p.id));
        expect(new Set(allIds).size).toBe(allIds.length);                 // không id nào lặp
        expect(pickedProblems.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
      });

      test('lọc theo lớp: đúng lớp mới lấy; bỏ lớp thì lấy mọi lớp', () => {
        const g9 = gen([{ rowId: 'r', categoryId: 'A', counts: { d1: 9 } }], { gradeId: 'g9' });
        expect(new Set(g9.cells[0].picked.map((p) => p.id))).toEqual(new Set(['p1', 'p2'])); // p4 lớp rỗng -> loại
        const all = gen([{ rowId: 'r', categoryId: 'A', counts: { d1: 9 } }], { gradeId: null });
        expect(all.cells[0].picked).toHaveLength(3);
      });

      test('nhánh con được tính vào dòng cha', () => {
        const n = countAvailableForCell({ problems, childrenMap, heId: 'H', gradeId: null, categoryId: 'A', difficultyId: 'd1' });
        expect(n).toBe(3); // p1(A) + p2(A1) + p4(A)
      });

      test('countAvailableForCell đếm đúng nhánh khác', () => {
        const n = countAvailableForCell({ problems, childrenMap, heId: 'H', gradeId: null, categoryId: 'B', difficultyId: 'd1' });
        expect(n).toBe(2); // p3, p4
      });

      test('pickReplacementProblem loại excludeIds; hết câu -> null', () => {
        const rep = pickReplacementProblem({
          problems, childrenMap, heId: 'H', gradeId: null, categoryId: 'A', difficultyId: 'd1',
          excludeIds: new Set(['p1', 'p2']), recentUsageIds: noRecent,
        });
        expect(rep.id).toBe('p4');
        const none = pickReplacementProblem({
          problems, childrenMap, heId: 'H', gradeId: null, categoryId: 'A', difficultyId: 'd1',
          excludeIds: new Set(['p1', 'p2', 'p4']), recentUsageIds: noRecent,
        });
        expect(none).toBeNull();
      });
      ```

- [ ] Bước 3: Check it works
      Run: `npm test -- --watchAll=false`
      You should see: dòng tổng kết `Tests: <tổng cũ + 8> passed` — không có bài đỏ; gồm 8 test mới trong `examMatrix.test.js`. Nếu đỏ, đọc tên test đỏ và so lại đúng đoạn code ở Bước 1.

- [ ] Bước 4: Lưu tiến độ
      Run: `git add src/utils/examMatrix.js src/utils/examMatrix.test.js && git commit -m "feat(matrix): dong co chon bai theo ma tran + test"`

---

### Task 2: Tạo trang `MatrixPage.jsx` (chưa nối vào app)

**What you'll have when this is done:** File trang "Tạo đề" đầy đủ (dựng ma trận → xem lại → đưa vào Giỏ) — CHƯA hiện trong app (nối ở Task 3).

- [ ] Bước 1: Tạo file mới `src/components/MatrixPage.jsx` với nội dung:
      ```jsx
      import React, { useMemo, useState } from 'react';
      import { LayoutGrid, Plus, X, RefreshCw, Pencil, ShoppingCart } from 'lucide-react';
      import { useTaxonomy } from '../hooks/useTaxonomy';
      import { useToast } from '../hooks/useToast';
      import LatexBlockRenderer from './LatexBlockRenderer';
      import { generateExamMatrix, countAvailableForCell, pickReplacementProblem } from '../utils/examMatrix';

      // ==========================================
      // TRANG "TẠO ĐỀ THEO MA TRẬN"
      // Dựng ma trận Chủ đề × Mức độ trong 1 hệ (+ lọc lớp tuỳ chọn) -> app bốc câu ngẫu nhiên,
      // né câu đã dùng <=30 ngày, không lặp trong 1 đề -> xem lại/đổi/bỏ -> "Đưa vào Giỏ đề".
      // KHÔNG đụng đường xuất .tex: chỉ rót câu vào Giỏ (App lo phần thêm giỏ qua onAddManyToCart).
      // ==========================================
      const MatrixPage = ({ problems, recentUsageByProblemId, defaultHeId, onAddManyToCart }) => {
        const { categories, difficulties, grades } = useTaxonomy();
        const { info } = useToast();

        const roots = useMemo(
          () => categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position),
          [categories]
        );
        const [heId, setHeId] = useState(defaultHeId || null);
        const effectiveHeId = heId && roots.some((r) => r.id === heId) ? heId : (roots[0]?.id || null);

        const [gradeId, setGradeId] = useState('');          // '' = mọi lớp
        const [rows, setRows] = useState([]);                 // [{ rowId, categoryId, counts: { [diffId]: number } }]
        const [mode, setMode] = useState('build');            // 'build' | 'review'
        const [reviewCells, setReviewCells] = useState([]);   // [{ rowId, categoryId, difficultyId, requested, picked: [] }]
        const [addPick, setAddPick] = useState('');           // dropdown "Thêm chủ đề"

        // Bản đồ cây (dựng 1 lần)
        const parentMap = useMemo(() => {
          const m = {}; for (const c of categories) m[c.id] = c.parent_id; return m;
        }, [categories]);
        const childrenMap = useMemo(() => {
          const m = {}; for (const c of categories) { if (c.parent_id) (m[c.parent_id] = m[c.parent_id] || []).push(c.id); } return m;
        }, [categories]);
        const nameById = useMemo(() => {
          const m = {}; for (const c of categories) m[c.id] = c.name; return m;
        }, [categories]);
        const diffNameById = useMemo(() => {
          const m = {}; for (const d of difficulties) m[d.id] = d.name; return m;
        }, [difficulties]);

        const rootOf = (id) => { let cur = id; while (parentMap[cur]) cur = parentMap[cur]; return cur; };
        const pathWithinHe = (id) => {
          const names = []; let cur = id;
          while (cur && parentMap[cur]) { names.unshift(nameById[cur]); cur = parentMap[cur]; } // dừng ngay dưới nút hệ
          return names.join(' › ');
        };

        const heDifficulties = useMemo(
          () => difficulties.filter((d) => d.he_id === effectiveHeId).sort((a, b) => a.position - b.position),
          [difficulties, effectiveHeId]
        );
        const branchOptions = useMemo(() => {
          if (!effectiveHeId) return [];
          return categories
            .filter((c) => c.id !== effectiveHeId && rootOf(c.id) === effectiveHeId)
            .map((c) => ({ id: c.id, label: pathWithinHe(c.id) }))
            .filter((o) => o.label)
            .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [categories, effectiveHeId, parentMap, nameById]);

        const recentUsageIds = useMemo(
          () => new Set(Object.keys(recentUsageByProblemId || {})),
          [recentUsageByProblemId]
        );

        // Đổi hệ: xoá dòng cũ (thuộc hệ cũ) + reset
        const changeHe = (newHeId) => { setHeId(newHeId); setRows([]); setReviewCells([]); setMode('build'); setAddPick(''); };

        // Thêm/bớt dòng chủ đề
        const addRow = (categoryId) => {
          if (!categoryId || rows.some((r) => r.categoryId === categoryId)) return;
          setRows((prev) => [...prev, { rowId: crypto.randomUUID(), categoryId, counts: {} }]);
        };
        const addAllLevel1 = () => {
          const level1 = childrenMap[effectiveHeId] || [];
          setRows((prev) => {
            const have = new Set(prev.map((r) => r.categoryId));
            const add = level1.filter((id) => !have.has(id)).map((id) => ({ rowId: crypto.randomUUID(), categoryId: id, counts: {} }));
            return [...prev, ...add];
          });
        };
        const removeRow = (rowId) => setRows((prev) => prev.filter((r) => r.rowId !== rowId));
        const setCount = (rowId, diffId, value) => {
          const n = Math.max(0, parseInt(value, 10) || 0);
          setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, counts: { ...r.counts, [diffId]: n } } : r)));
        };

        const totalRequested = rows.reduce((s, r) => s + Object.values(r.counts).reduce((a, b) => a + (b || 0), 0), 0);

        // Tạo đề
        const runGenerate = () => {
          const res = generateExamMatrix({ problems, childrenMap, heId: effectiveHeId, gradeId: gradeId || null, rows, recentUsageIds });
          setReviewCells(res.cells.map((c) => ({ ...c })));
          setMode('review');
        };

        // Nút trong xem lại
        const excludeAll = () => new Set(reviewCells.flatMap((c) => c.picked.map((p) => p.id)));
        const swapOne = (cellIdx, problemId) => {
          const cell = reviewCells[cellIdx];
          const rep = pickReplacementProblem({
            problems, childrenMap, heId: effectiveHeId, gradeId: gradeId || null,
            categoryId: cell.categoryId, difficultyId: cell.difficultyId, excludeIds: excludeAll(), recentUsageIds,
          });
          if (!rep) { info('Không còn câu khác để đổi.'); return; }
          setReviewCells((prev) => prev.map((c, i) => (i === cellIdx ? { ...c, picked: c.picked.map((p) => (p.id === problemId ? rep : p)) } : c)));
        };
        const removeOne = (cellIdx, problemId) =>
          setReviewCells((prev) => prev.map((c, i) => (i === cellIdx ? { ...c, picked: c.picked.filter((p) => p.id !== problemId) } : c)));

        const pickedAll = () => {
          const seen = new Set(); const out = [];
          for (const c of reviewCells) for (const p of c.picked) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
          return out;
        };
        const handleAddToCart = () => {
          const all = pickedAll();
          if (all.length === 0) { info('Chưa có câu nào để đưa vào Giỏ.'); return; }
          onAddManyToCart(all);
        };

        // Styles nhỏ (dùng token màu chung)
        const wrap = { flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' };
        const th = { textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--color-border)' };
        const td = { padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--color-border-subtle)', verticalAlign: 'top' };
        const numInput = { width: 56, padding: '0.35rem', textAlign: 'center', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text)' };
        const btn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.45rem 0.9rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 600 };
        const ctaBtn = { ...btn, background: 'var(--color-amber)', color: 'var(--color-on-amber)', border: 'none' };
        const selBox = { padding: '0.4rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text)' };

        if (!effectiveHeId) {
          return <div style={wrap}><p style={{ color: 'var(--color-text-muted)' }}>Chưa có hệ nào. Hãy tạo hệ trong Cài đặt › Quản lý phân loại.</p></div>;
        }

        return (
          <div style={wrap}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <LayoutGrid size={22} color="var(--color-cobalt)" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text)' }}>Tạo đề theo ma trận</h2>
            </div>

            {/* Chọn hệ (dải tab) + lớp (tuỳ chọn) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {roots.map((r) => {
                  const on = r.id === effectiveHeId;
                  return (
                    <button key={r.id} onClick={() => changeHe(r.id)}
                      style={{ ...btn, padding: '0.35rem 0.8rem',
                        background: on ? 'var(--color-cobalt)' : 'var(--color-surface)',
                        color: on ? '#fff' : 'var(--color-text)', border: on ? 'none' : '1px solid var(--color-border)' }}>
                      {r.name}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Lớp:</span>
                <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} style={selBox}>
                  <option value="">Tất cả lớp</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            {mode === 'build' ? (
              heDifficulties.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  Hệ này chưa có mức độ khó — hãy thêm trong Cài đặt › Quản lý phân loại.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                    <select value={addPick} onChange={(e) => setAddPick(e.target.value)} style={{ ...selBox, minWidth: 220 }}>
                      <option value="">— Chọn chủ đề —</option>
                      {branchOptions.filter((o) => !rows.some((r) => r.categoryId === o.id)).map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                    <button style={btn} onClick={() => { addRow(addPick); setAddPick(''); }}><Plus size={16} /> Thêm chủ đề</button>
                    <button style={btn} onClick={addAllLevel1}>Thêm tất cả nhánh cấp 1</button>
                  </div>

                  {rows.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Chưa có chủ đề nào. Bấm “Thêm chủ đề” để bắt đầu.</p>
                  ) : (
                    <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 900 }}>
                      <thead>
                        <tr>
                          <th style={th}>Chủ đề</th>
                          {heDifficulties.map((d) => <th key={d.id} style={{ ...th, textAlign: 'center' }}>{d.name}</th>)}
                          <th style={th}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.rowId}>
                            <td style={{ ...td, fontWeight: 600, color: 'var(--color-text)' }}>{pathWithinHe(r.categoryId)}</td>
                            {heDifficulties.map((d) => {
                              const avail = countAvailableForCell({ problems, childrenMap, heId: effectiveHeId, gradeId: gradeId || null, categoryId: r.categoryId, difficultyId: d.id });
                              return (
                                <td key={d.id} style={{ ...td, textAlign: 'center' }}>
                                  <input type="number" min="0" style={numInput} value={r.counts[d.id] || ''} onChange={(e) => setCount(r.rowId, d.id, e.target.value)} />
                                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>còn {avail}</div>
                                </td>
                              );
                            })}
                            <td style={{ ...td, textAlign: 'center' }}>
                              <button title="Bỏ dòng" onClick={() => removeRow(r.rowId)} style={{ ...btn, padding: 6 }}><X size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>Tổng: {totalRequested} câu</span>
                    <button disabled={totalRequested === 0} onClick={runGenerate}
                      style={{ ...ctaBtn, opacity: totalRequested === 0 ? 0.5 : 1, cursor: totalRequested === 0 ? 'not-allowed' : 'pointer' }}>
                      Tạo đề
                    </button>
                  </div>
                </>
              )
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
                  {reviewCells.map((c, idx) => {
                    const short = c.requested - c.picked.length;
                    return (
                      <div key={`${c.rowId}:${c.difficultyId}`} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.9rem 1.1rem', background: 'var(--color-surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{pathWithinHe(c.categoryId)} — {diffNameById[c.difficultyId] || ''}</span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>(đã lấy {c.picked.length}/{c.requested})</span>
                          {short > 0 && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-on-amber)', background: 'var(--color-amber-bg)', border: '1px solid var(--color-amber)', borderRadius: 999, padding: '2px 10px' }}>
                              cần {c.requested}, chỉ có {c.picked.length}
                            </span>
                          )}
                        </div>

                        {c.picked.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Kho không có câu nào khớp ô này.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {c.picked.map((p) => (
                              <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 8 }}>
                                <div style={{ flex: 1, minWidth: 0, maxHeight: 90, overflow: 'hidden', fontSize: '0.9rem', color: 'var(--color-text)' }}>
                                  <LatexBlockRenderer text={p.statement} />
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                  <button style={{ ...btn, padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => swapOne(idx, p.id)}>Đổi câu khác</button>
                                  <button style={{ ...btn, padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => removeOne(idx, p.id)}>Bỏ</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                  <button style={btn} onClick={runGenerate}><RefreshCw size={16} /> Bốc lại toàn bộ</button>
                  <button style={btn} onClick={() => setMode('build')}><Pencil size={16} /> Sửa ma trận</button>
                  <button style={ctaBtn} onClick={handleAddToCart}><ShoppingCart size={16} /> Đưa vào Giỏ đề ({pickedAll().length} câu)</button>
                </div>
              </>
            )}
          </div>
        );
      };

      export default MatrixPage;
      ```

- [ ] Bước 2: Check it works
      File mới chưa được import ở đâu nên chưa chạy/kiểm được ngay — bình thường (nối ở Task 3). Chỉ cần lưu file không lỗi cú pháp (trình soạn thảo không gạch đỏ đỏ cả file).

- [ ] Bước 3: Lưu tiến độ
      Run: `git add src/components/MatrixPage.jsx && git commit -m "feat(matrix): trang tao de theo ma tran (chua noi vao app)"`

---

### Task 3: Nối trang "Tạo đề" vào app

**What you'll have when this is done:** Nav rail có mục "Tạo đề" (giữa "Bài" và "Giỏ"); bấm vào mở được trang; "Đưa vào Giỏ" đổ câu sang Giỏ và nhảy sang màn Giỏ.

- [ ] Bước 1: Mở `src/hooks/useUIState.js`. Tìm dòng:
      ```js
      const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'feed' | 'cart' | 'settings' | 'trash'
      ```
      Thay bằng (thêm `'matrix'` vào chú thích):
      ```js
      const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'feed' | 'matrix' | 'cart' | 'settings' | 'trash'
      ```

- [ ] Bước 2: Mở `src/components/NavRail.jsx`. Tìm dòng import đầu file:
      ```jsx
      import { PlusSquare, Upload, List, ShoppingCart, Settings, Trash2, ChevronsLeft, ChevronsRight, BarChart3 } from 'lucide-react';
      ```
      Thay bằng (thêm `LayoutGrid`):
      ```jsx
      import { PlusSquare, Upload, List, ShoppingCart, Settings, Trash2, ChevronsLeft, ChevronsRight, BarChart3, LayoutGrid } from 'lucide-react';
      ```
      Rồi tìm khối nút "Bài" và nút "Giỏ" liền nhau:
      ```jsx
      <button className={`rail-item ${currentView === 'feed' ? 'on' : ''}`} onClick={() => onNavigate('feed')}
        style={{ justifyContent: align }}>
        <List size={18} /> {lbl('Bài')}
      </button>
      <button className={`rail-item ${currentView === 'cart' ? 'on' : ''}`} onClick={() => onNavigate('cart')}
        style={{ justifyContent: align }}>
        <ShoppingCart size={18} /> {lbl('Giỏ')}
        {cartCount > 0 && <span className="view-badge" style={{ marginLeft: 'auto' }}>{cartCount}</span>}
      </button>
      ```
      Thay bằng (chèn nút "Tạo đề" GIỮA "Bài" và "Giỏ"):
      ```jsx
      <button className={`rail-item ${currentView === 'feed' ? 'on' : ''}`} onClick={() => onNavigate('feed')}
        style={{ justifyContent: align }}>
        <List size={18} /> {lbl('Bài')}
      </button>
      <button className={`rail-item ${currentView === 'matrix' ? 'on' : ''}`} onClick={() => onNavigate('matrix')}
        style={{ justifyContent: align }}>
        <LayoutGrid size={18} /> {lbl('Tạo đề')}
      </button>
      <button className={`rail-item ${currentView === 'cart' ? 'on' : ''}`} onClick={() => onNavigate('cart')}
        style={{ justifyContent: align }}>
        <ShoppingCart size={18} /> {lbl('Giỏ')}
        {cartCount > 0 && <span className="view-badge" style={{ marginLeft: 'auto' }}>{cartCount}</span>}
      </button>
      ```

- [ ] Bước 3: Mở `src/App.jsx`. Tìm dòng:
      ```jsx
      import DashboardPage from './components/DashboardPage';
      ```
      Ngay SAU dòng đó, thêm:
      ```jsx
      import MatrixPage from './components/MatrixPage';
      ```

- [ ] Bước 4: Vẫn trong `App.jsx`, tìm khối tải lịch sử xuất đề:
      ```jsx
      useEffect(() => {
        if (ui.currentView === 'feed' || ui.currentView === 'dashboard') loadHistory();
      }, [ui.currentView, loadHistory]);
      ```
      Thay bằng (thêm màn `'matrix'` để "né câu vừa dùng" luôn mới khi mở trang Tạo đề):
      ```jsx
      useEffect(() => {
        if (ui.currentView === 'feed' || ui.currentView === 'dashboard' || ui.currentView === 'matrix') loadHistory();
      }, [ui.currentView, loadHistory]);
      ```

- [ ] Bước 5: Tìm khối màn Thống kê + dòng mở màn feed (ngay dưới nó):
      ```jsx
          {ui.currentView === 'dashboard' && (
            <DashboardPage
              problems={problems}
              onNavigateToHe={(heId) => { ui.selectHe(heId); ui.setCurrentView('feed'); }}
              onNavigateToBranch={(heId, branchId) => { ui.selectHe(heId); ui.setFilterTopic(branchId); ui.setCurrentView('feed'); }}
              onNavigateToUnclassified={goToUnclassified}
            />
          )}

          {ui.currentView === 'feed' && (
      ```
      Thay bằng (chèn khối màn "Tạo đề" giữa Thống kê và feed):
      ```jsx
          {ui.currentView === 'dashboard' && (
            <DashboardPage
              problems={problems}
              onNavigateToHe={(heId) => { ui.selectHe(heId); ui.setCurrentView('feed'); }}
              onNavigateToBranch={(heId, branchId) => { ui.selectHe(heId); ui.setFilterTopic(branchId); ui.setCurrentView('feed'); }}
              onNavigateToUnclassified={goToUnclassified}
            />
          )}

          {ui.currentView === 'matrix' && (
            <MatrixPage
              problems={problems}
              recentUsageByProblemId={recentUsageByProblemId}
              defaultHeId={ui.selectedHe}
              onAddManyToCart={(picked) => {
                let added = 0;
                picked.forEach((p) => {
                  if (!cartItems.some((item) => item.id === p.id)) { addToCart(p); added++; }
                });
                if (added > 0) { success(`Đã thêm ${added} bài vào giỏ đề thi!`); ui.setCurrentView('cart'); }
                else info('Các bài này đều đã có sẵn trong giỏ rồi ạ.');
              }}
            />
          )}

          {ui.currentView === 'feed' && (
      ```

- [ ] Bước 6: Check it works
      Run: `npm run build`
      You should see: `Compiled successfully`, **0 warning**. Nếu báo lỗi, so lại đúng từng dấu ngoặc ở Bước 3–5 và tên biến (`recentUsageByProblemId`, `cartItems`, `addToCart`, `success`, `info` đều đã có sẵn trong `App.jsx`).

- [ ] Bước 7: Lưu tiến độ
      Run: `git add src/hooks/useUIState.js src/components/NavRail.jsx src/App.jsx && git commit -m "feat(matrix): noi trang tao de vao nav rail va dieu huong"`

---

### Task 4: Kiểm bằng mắt trong app (Thầy nghiệm thu)

**What you'll have when this is done:** Bằng chứng tận mắt: dựng ma trận → bốc câu → đổi/bỏ → đưa vào Giỏ đều đúng.

- [ ] Bước 1: Chạy app
      Run: `npx tauri dev`
      You should see: nav rail có mục **"Tạo đề"** (icon lưới) nằm giữa "Bài" và "Giỏ". Bấm vào → mở trang "Tạo đề theo ma trận".

- [ ] Bước 2: Chọn phạm vi. Bấm chọn một **Hệ** đang có bài (vd "Toán Chuyên"); để **Lớp** = "Tất cả lớp".
      You should see: các cột mức độ hiện đúng theo thang độ khó của hệ đó. Nếu hệ chưa có mức độ → hiện dòng nhắc thêm mức độ (đúng như thiết kế).

- [ ] Bước 3: Dựng ma trận. Bấm **"Thêm tất cả nhánh cấp 1"** (hoặc chọn từng chủ đề rồi "Thêm chủ đề"). Gõ vài số vào các ô.
      You should see: mỗi ô có nhãn nhỏ **"còn X"** hợp lý (số câu thật trong kho khớp ô đó); góc dưới hiện **"Tổng: N câu"**; nút "Tạo đề" sáng lên khi N > 0.

- [ ] Bước 4: Bốc đề. Bấm **"Tạo đề"**.
      You should see: chuyển sang phần **Xem lại**; mỗi ô hiện các câu đã bốc (đề có công thức LaTeX render đẹp); ô nào kho không đủ → badge vàng **"cần N, chỉ có k"**. Bấm **"Bốc lại toàn bộ"** vài lần → bộ câu đổi khác; câu vừa xuất gần đây (nếu có) hiếm khi xuất hiện.

- [ ] Bước 5: Sửa từng câu. Ở một câu bất kỳ bấm **"Đổi câu khác"** → câu đó được thay bằng câu khác cùng ô (không trùng câu đang có). Bấm **"Bỏ"** ở một câu → câu đó biến mất, số "đã lấy k/N" giảm.

- [ ] Bước 6: Đưa vào Giỏ. Bấm **"Đưa vào Giỏ đề (M câu)"**.
      You should see: toast "Đã thêm M bài vào giỏ đề thi!" và app tự nhảy sang màn **"Giỏ"** với đúng M câu vừa chọn.

- [ ] Bước 7: (nếu muốn) Đổi Hệ giữa chừng ở bước dựng → các dòng chủ đề cũ tự xoá, cột mức độ đổi theo hệ mới (đúng thiết kế: không trộn hệ).

---

### Task 5: Kiểm tự động + an toàn LaTeX + xác nhận phạm vi + lưu

**What you'll have when this is done:** Bằng chứng cả kho vẫn xanh, đường xuất LaTeX hoàn toàn không đổi, phạm vi sửa đúng plan.

- [ ] Bước 1: Chạy toàn bộ bài kiểm
      Run: `npm test -- --watchAll=false`
      You should see: `Tests: <tất cả> passed` — không bài đỏ, gồm **golden export KHÔNG đổi** (đường xuất không bị chạm) và 8 test mới của `examMatrix`.

- [ ] Bước 2: An toàn LaTeX đầu-cuối (dù tính năng không đụng đường xuất). Trong app (`npx tauri dev`): tạo tạm 1 bài có công thức `$x^2 + y^2 = z^2$`, phân loại vào 1 hệ/nhánh/mức. Vào **Tạo đề** → dựng 1 ô lấy đúng bài đó → **Tạo đề** → **Đưa vào Giỏ** → vào Giỏ → **Xuất file nội dung** ra `D:\check-matrix.tex`.
      Mở `D:\check-matrix.tex`: công thức `$x^2 + y^2 = z^2$` còn **nguyên vẹn** trong khối `\begin{bt}...\end{bt}` — chứng tỏ đường bốc-câu → Giỏ → Xuất không làm hỏng nội dung. Xoá bài tạm + file `.tex` sau khi xong.

- [ ] Bước 3: Xác nhận phạm vi sửa đúng như plan
      Run: `git log --oneline -4`
      You should see: đúng 3 commit code (Task 1, 2, 3) + (tuỳ) commit docs — KHÔNG commit nào đụng `buildProblemTex.js`, `buildContentFile.js`, `db.js`, `ExportModal.jsx`, hay file Rust.
      Run: `git status --short`
      You should see: không còn gì chưa commit ngoài file đã biết (`src-tauri/Cargo.toml` do CRLF).

- [ ] Bước 4: Build bản phát hành sạch
      Run: `npm run build`
      You should see: `Compiled successfully`, **0 warning**.

> **Lưu ý bàn giao:** Nếu người build KHÔNG phải Claude, sau khi xong 5 Task **Claude sẽ check lại** (đối chiếu plan từng dòng, chạy test, soi golden export, xác nhận đúng phạm vi file) rồi mới `git push` — đúng nhịp các phiên trước. Thầy đã nghiệm thu GUI ở Task 4 nên không lặp lại.

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
- `git log`/`git status`: đúng 3 commit code (Task 1 util+test, Task 2 MatrixPage, Task 3 wiring) + docs spec/plan. KHÔNG đụng `buildProblemTex.js`, `buildContentFile.js`, `buildContentFile.test.js`, `db.js` (schema), `ExportModal.jsx`, Rust, `package.json` (không thêm thư viện).
- Test: tổng cũ + 8 mới của `examMatrix.test.js`; golden export trong đó **không đổi** (3/3).
- `examMatrix.js` là hàm THUẦN, **không import gì** (tự nội tuyến `collectDescendantIds`) — nên test không kéo theo `@tauri-apps/plugin-sql`. `rng` tiêm vào để tất định.
- Động cơ: né câu vừa dùng (fresh trước recent), **không lặp câu toàn đề** (`usedIds`), shortfall = requested − picked.length. `pickReplacementProblem` loại mọi id đang hiển thị.
- `MatrixPage` chỉ ĐỌC `problems` + taxonomy + `recentUsageByProblemId`; đổ câu vào Giỏ qua `onAddManyToCart` (App gọi `addToCart` từng câu — dedupe sẵn theo id). KHÔNG tự đụng CSDL/xuất.
- Nhãn "còn X" = `countAvailableForCell` (độc lập từng ô, lạc quan); chống-lặp thật ở lúc bốc → thiếu báo ở Xem lại.
- Nav rail: mục "Tạo đề" (`LayoutGrid`) giữa "Bài" và "Giỏ"; dùng `currentView === 'matrix'`. `useUIState` chỉ đổi chú thích union (không thêm state).
- `App.jsx`: khối view `'matrix'`; effect `loadHistory` thêm điều kiện `'matrix'`; `onAddManyToCart` mirror `handleBulkAddToCart` (đếm added, toast, nhảy sang Giỏ; nếu tất cả đã có trong giỏ thì info, không nhảy).
- Đổi Hệ ở bước dựng: xoá `rows` cũ + reset (không trộn hệ vì mức độ theo hệ).
