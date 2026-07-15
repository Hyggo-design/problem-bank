# Quét Trùng Toàn Kho — Build Plan

**What we're building:** Một màn mới (mở từ Cài đặt) rà **tất cả bài đang có**, tìm các bài giống nhau, gom thành **nhóm**, cho Thầy **Xem đầy đủ** và **Xoá** (vào Thùng rác, có Hoàn tác) ngay tại chỗ.

**Why:** App hiện chỉ cảnh báo trùng *lúc thêm một bài*. Kho thật đã có sẵn **1 cặp bài trùng 100%** (lỡ nhập 2 lần) mà chưa có công cụ nào tìm ra để dọn.

**Approach:** Toàn bộ so-trùng gom vào một **hàm thuần mới** `scanDuplicates.js` (viết test trước) — precompute bigram từng bài rồi so từng cặp (đề HOẶC lời giải ≥ ngưỡng), gom **cụm liên thông**. Màn kết quả `DuplicateScanPage.jsx` tái dùng đúng đường **Xem đầy đủ** (PreviewModal) và **xoá mềm + Hoàn tác** đã có trong `App.jsx`. **KHÔNG** sửa `findDuplicates.js` (cảnh báo lúc thêm giữ nguyên), **KHÔNG** đụng đường xuất `.tex`, DB-schema, hay Rust.

**Files we'll create or change:**
- `src/utils/scanDuplicates.js` *(mới)* — hàm thuần: chuẩn hoá + bigram + Dice + union-find + `scanDuplicates`.
- `src/utils/scanDuplicates.test.js` *(mới)* — test cho scanDuplicates.
- `src/components/DuplicateScanPage.jsx` *(mới)* — màn kết quả quét (tự quét khi mở, Quét lại, Xem đầy đủ, Xoá tại chỗ).
- `src/hooks/useUIState.js` — chỉ cập nhật chú thích danh sách `currentView` thêm `'duplicates'` (không thêm state).
- `src/components/SettingsPage.jsx` — thêm Row "Quét trùng toàn kho" (nhận prop `onScanDuplicates`).
- `src/App.jsx` — tách hàm `handleDeleteWithUndo` (dùng chung), thêm khối render `currentView==='duplicates'`, truyền `onScanDuplicates` cho SettingsPage.

**Spec:** `.docs/specs/2026-07-15-quet-trung-toan-kho-design.md`

> Ghi chú thuật ngữ: **hàm thuần** = chỉ nhận vào → trả ra, không đụng màn hình/CSDL, nên dễ viết test. **TDD** = viết test trước (đỏ) rồi mới viết code cho xanh. **bigram** = cặp 2 ký tự liền nhau; đếm bao nhiêu cặp chung để đo độ giống. **cụm liên thông (union-find)** = nếu A giống B, B giống C thì gom chung một nhóm {A,B,C}. **xoá mềm** = chuyển vào Thùng rác, khôi phục được (không xoá hẳn).

---

### Task 1: Chuẩn bị an toàn (nhánh mới + sao lưu + mốc "trước")

**What you'll have when this is done:** Nhánh git riêng, một bản sao DB phòng hờ, và số liệu "trước khi sửa" (test/build) để so.

- [ ] Bước 1: Tạo nhánh làm việc riêng
      Chạy: `git checkout -b feat-quet-trung-toan-kho`
      Sẽ thấy: `Switched to a new branch 'feat-quet-trung-toan-kho'`

- [ ] Bước 2: Sao lưu DB phòng hờ (tính năng KHÔNG đổi cấu trúc DB — vẫn phòng hờ vì màn quét có nút Xoá)
      Chạy (PowerShell): `Copy-Item "D:\0. Problems Bank\app-data\problem_bank.db" "D:\0. Problems Bank\app-data\problem_bank.backup-dup-2026-07-15.db"`
      Sẽ thấy: file backup xuất hiện trong `app-data`.

- [ ] Bước 3: Ghi mốc "trước" — chạy toàn bộ test
      Chạy: `CI=true npm test`
      Sẽ thấy: tất cả XANH (ghi lại tổng, kỳ vọng **104 passed** như NK32). Gồm golden-file `buildContentFile` (khoá định dạng xuất `.tex`).

- [ ] Bước 4: Ghi mốc "trước" — build sạch
      Chạy: `CI=true npm run build`
      Sẽ thấy: `Compiled successfully` (0 warning). Mọi task sau phải giữ 0 warning.

*(Task này không đổi code nên chưa commit.)*

---

### Task 2: Bộ não quét — `scanDuplicates.js` (viết test trước)

**What you'll have when this is done:** Một file hàm thuần lo hết việc so-trùng cả kho, có test chứng minh: gộp khi đề y hệt, gộp qua lời giải (OR), bắc cầu A~B~C, an toàn khi rỗng, và **cho cùng kết quả** với công thức cũ `calculateSimilarity`.

- [ ] Bước 1: Viết test TRƯỚC (sẽ đỏ) — tạo `src/utils/scanDuplicates.test.js`
      ```js
      import { scanDuplicates, diceOfSets, normalizeForSim, bigramSet } from './scanDuplicates';
      import { calculateSimilarity } from './findDuplicates';

      const P = (id, statement, solution = '', dateAdded = '2026-01-01') => ({ id, statement, solution, dateAdded });

      test('hai đề y hệt → 1 nhóm 2 bài, stmtSim = 1', () => {
        const g = scanDuplicates([P('a', 'Cho $x>0$ tìm min'), P('b', 'Cho $x>0$ tìm min')], 0.85);
        expect(g).toHaveLength(1);
        expect(g[0].members.map((m) => m.id).sort()).toEqual(['a', 'b']);
        expect(g[0].maxStmtSim).toBe(1);
      });

      test('đề khác nhưng lời giải y hệt ≥ ngưỡng → vẫn gộp (OR)', () => {
        const g = scanDuplicates([
          P('a', 'Đề một hoàn toàn khác biệt số một', 'Lời giải trùng khớp y hệt nhau nhé'),
          P('b', 'Đề hai khác hẳn nội dung thứ hai', 'Lời giải trùng khớp y hệt nhau nhé'),
        ], 0.85);
        expect(g).toHaveLength(1);
        expect(g[0].maxSolSim).toBe(1);
      });

      test('dưới ngưỡng → 0 nhóm', () => {
        const g = scanDuplicates([P('a', 'Tam giác ABC vuông tại A'), P('b', 'Số nguyên tố lớn hơn một trăm')], 0.85);
        expect(g).toHaveLength(0);
      });

      test('bắc cầu: A~B qua đề, B~C qua lời giải → một nhóm {A,B,C}', () => {
        const shared = 'Nội dung dùng chung đủ dài để vượt ngưỡng tương đồng nhé';
        const soln = 'Cùng lời giải chung đủ dài để nối B với C lại';
        const g = scanDuplicates([
          P('a', shared, 'Lời giải riêng của A hoàn toàn khác biệt hẳn'),
          P('b', shared, soln),
          P('c', 'Đề riêng của C khác hẳn không liên quan gì', soln),
        ], 0.85);
        expect(g).toHaveLength(1);
        expect(g[0].members.map((m) => m.id).sort()).toEqual(['a', 'b', 'c']);
      });

      test('members xếp theo dateAdded tăng dần (cũ trước)', () => {
        const g = scanDuplicates([
          P('new', 'Bài trùng khít hoàn toàn nhau đây', '', '2026-06-28'),
          P('old', 'Bài trùng khít hoàn toàn nhau đây', '', '2026-06-25'),
        ], 0.85);
        expect(g[0].members.map((m) => m.id)).toEqual(['old', 'new']);
      });

      test('an toàn rỗng: statement/solution rỗng không lỗi, không tự gộp', () => {
        const g = scanDuplicates([P('a', '', ''), P('b', '', '')], 0.85);
        expect(g).toHaveLength(0);
      });

      test('diceOfSets khớp calculateSimilarity trên mẫu', () => {
        const pairs = [['Cho a,b,c>0', 'Cho a,b,c>0'], ['Tam giác ABC', 'Tam giác XYZ'], ['x^2+y^2', 'x^2 + y^2'], ['', 'abc']];
        for (const [s1, s2] of pairs) {
          const c1 = normalizeForSim(s1), c2 = normalizeForSim(s2);
          expect(diceOfSets(c1, bigramSet(c1), c2, bigramSet(c2))).toBeCloseTo(calculateSimilarity(s1, s2), 10);
        }
      });
      ```
      Chạy: `CI=true npm test` → thấy các test scanDuplicates ĐỎ (chưa có file code) là đúng.

- [ ] Bước 2: Viết code cho xanh — tạo `src/utils/scanDuplicates.js`
      ```js
      // Quét trùng TOÀN KHO — tìm mọi cặp bài giống nhau (đề HOẶC lời giải >= ngưỡng),
      // gom thành nhóm cụm-liên-thông. Hàm THUẦN, tách riêng để test.
      // KHÔNG đụng đường xuất .tex. KHÔNG sửa findDuplicates.js (cảnh báo lúc thêm giữ nguyên).

      // Chuẩn hoá giống calculateSimilarity: chữ thường + bỏ mọi khoảng trắng.
      export const normalizeForSim = (str) => String(str ?? '').toLowerCase().replace(/\s+/g, '');

      // Tập bigram ký tự (rỗng nếu < 2 ký tự).
      export const bigramSet = (clean) => {
        const set = new Set();
        for (let i = 0; i < clean.length - 1; i++) set.add(clean.substring(i, i + 2));
        return set;
      };

      // Sørensen-Dice từ chuỗi-đã-chuẩn-hoá + tập bigram dựng sẵn. Khớp calculateSimilarity từng nhánh.
      export const diceOfSets = (cleanA, setA, cleanB, setB) => {
        if (!cleanA || !cleanB) return 0;                 // một chuỗi rỗng
        if (cleanA === cleanB) return 1;                  // y hệt
        if (cleanA.length < 2 || cleanB.length < 2) return 0;
        let inter = 0;
        for (const g of setA) if (setB.has(g)) inter++;
        return (2 * inter) / (setA.size + setB.size);
      };

      // Union-Find nhỏ để gom cụm liên thông.
      const makeUF = (n) => {
        const parent = Array.from({ length: n }, (_, i) => i);
        const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
        const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
        return { find, union };
      };

      // Quét cả kho. problems = mảng bài SỐNG. threshold = 0..1.
      // Trả: [{ members:[bài…], pairs:[{aId,bId,stmtSim,solSim}], maxStmtSim, maxSolSim }] xếp sim giảm dần.
      export const scanDuplicates = (problems = [], threshold = 0.85) => {
        const n = problems.length;
        // 1) tiền xử lý 1 lần/bài (chuẩn hoá + bigram cho đề và lời giải)
        const pre = problems.map((p) => {
          const stmtClean = normalizeForSim(p.statement);
          const solClean = normalizeForSim(p.solution);
          return { stmtClean, stmtBg: bigramSet(stmtClean), solClean, solBg: bigramSet(solClean) };
        });
        // 2) so mọi cặp i<j; cạnh nếu đề HOẶC lời giải >= ngưỡng
        const uf = makeUF(n);
        const edges = [];
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const stmtSim = diceOfSets(pre[i].stmtClean, pre[i].stmtBg, pre[j].stmtClean, pre[j].stmtBg);
            const solSim = diceOfSets(pre[i].solClean, pre[i].solBg, pre[j].solClean, pre[j].solBg);
            if (stmtSim >= threshold || solSim >= threshold) {
              edges.push({ i, j, stmtSim, solSim });
              uf.union(i, j);
            }
          }
        }
        // 3) gom cạnh theo gốc union-find
        const byRoot = new Map();
        for (const e of edges) {
          const root = uf.find(e.i);
          if (!byRoot.has(root)) byRoot.set(root, { idx: new Set(), pairs: [] });
          const grp = byRoot.get(root);
          grp.idx.add(e.i); grp.idx.add(e.j);
          grp.pairs.push({ aId: problems[e.i].id, bId: problems[e.j].id, stmtSim: e.stmtSim, solSim: e.solSim });
        }
        // 4) dựng nhóm: members xếp theo dateAdded tăng dần (bài cũ trước)
        const groups = [];
        for (const grp of byRoot.values()) {
          const members = [...grp.idx]
            .map((k) => problems[k])
            .sort((a, b) => String(a.dateAdded || '').localeCompare(String(b.dateAdded || '')));
          const maxStmtSim = Math.max(...grp.pairs.map((p) => p.stmtSim));
          const maxSolSim = Math.max(...grp.pairs.map((p) => p.solSim));
          groups.push({ members, pairs: grp.pairs, maxStmtSim, maxSolSim });
        }
        // 5) xếp nhóm theo độ giống cao nhất, giảm dần
        groups.sort((a, b) => Math.max(b.maxStmtSim, b.maxSolSim) - Math.max(a.maxStmtSim, a.maxSolSim));
        return groups;
      };
      ```

- [ ] Bước 3: Chạy test cho xanh
      Chạy: `CI=true npm test`
      Sẽ thấy: mọi test scanDuplicates XANH; **tổng test = 104 + 7 = 111**; golden `buildContentFile` KHÔNG đổi.

- [ ] Bước 4: Build sạch
      Chạy: `CI=true npm run build` → `Compiled successfully`, 0 warning.

- [ ] Bước 5: Lưu tiến độ
      Chạy: `git add -A && git commit -m "feat(dup): scanDuplicates thuan + test (dice/union-find/gom nhom)"`

---

### Task 3: Màn kết quả — `DuplicateScanPage.jsx`

**What you'll have when this is done:** Một màn tự quét khi mở, hiện các nhóm nghi trùng; mỗi bài có **Xem đầy đủ** + **Xoá**; có nút **Quét lại** và nút ← về Cài đặt. (Chưa nối vào app — Task 4 nối.)

- [ ] Bước 1: Tạo `src/components/DuplicateScanPage.jsx`
      ```jsx
      import React, { useState, useEffect } from 'react';
      import { ArrowLeft, RefreshCw, Eye, Trash2, CopyCheck } from 'lucide-react';
      import MathText from './MathText';
      import { scanDuplicates } from '../utils/scanDuplicates';

      const pct = (v) => `${Math.round(v * 100)}%`;
      const readThreshold = () => {
        const p = parseInt(localStorage.getItem('pb-dup-threshold') ?? '85', 10);
        return (Number.isNaN(p) ? 85 : p) / 100;
      };
      const fmtDate = (s) => {
        const d = new Date(s);
        return s && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('vi-VN') : '';
      };

      // Màn "Quét trùng toàn kho" (currentView === 'duplicates'). Mở từ Cài đặt.
      const DuplicateScanPage = ({ problems = [], onPreview, onDelete, onBack }) => {
        const [groups, setGroups] = useState([]);
        const [scanning, setScanning] = useState(true);
        const [threshold, setThreshold] = useState(readThreshold);
        const [removedIds, setRemovedIds] = useState(() => new Set());

        // Quét: đọc ngưỡng mới nhất từ Cài đặt, hiện "Đang quét…" rồi tính (nhường 1 nhịp cho giao diện vẽ).
        const runScan = () => {
          const thr = readThreshold();
          setThreshold(thr);
          setScanning(true);
          setRemovedIds(new Set());
          setTimeout(() => {
            setGroups(scanDuplicates(problems, thr));
            setScanning(false);
          }, 0);
        };

        // Tự quét MỘT LẦN khi mở màn. KHÔNG tự quét lại khi 'problems' đổi do xoá (quyết định 4b) — muốn rà mới thì bấm "Quét lại".
        useEffect(() => {
          runScan();
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        const handleDelete = async (id) => {
          await onDelete(id);
          setRemovedIds((prev) => new Set(prev).add(id));
        };

        // Bỏ bài đã xoá khỏi nhóm; nhóm còn < 2 bài thì bỏ luôn.
        const visibleGroups = groups
          .map((g) => ({ ...g, members: g.members.filter((m) => !removedIds.has(m.id)) }))
          .filter((g) => g.members.length >= 2);
        const totalProblems = visibleGroups.reduce((s, g) => s + g.members.length, 0);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* thanh đầu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <button className="card-btn" onClick={onBack}><ArrowLeft size={16} /> Cài đặt</button>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CopyCheck size={20} /> Quét trùng toàn kho
              </h2>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Ngưỡng: {pct(threshold)}</span>
              <button className="card-btn" style={{ marginLeft: 'auto' }} onClick={runScan} disabled={scanning}>
                <RefreshCw size={15} /> Quét lại
              </button>
            </div>

            {/* nội dung */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              {scanning ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>Đang quét…</div>
              ) : visibleGroups.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem', lineHeight: 1.6 }}>
                  <div style={{ fontSize: '1.05rem', marginBottom: 6 }}>Không tìm thấy bài nào nghi trùng ở ngưỡng {pct(threshold)}.</div>
                  <div style={{ fontSize: '0.88rem' }}>Muốn bắt cả bài gần giống, hạ ngưỡng trong Cài đặt rồi bấm “Quét lại”.</div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 14, color: 'var(--color-text)', fontWeight: 600 }}>
                    Tìm thấy {visibleGroups.length} nhóm nghi trùng ({totalProblems} bài)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {visibleGroups.map((g, gi) => (
                      <div key={gi} style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ padding: '0.6rem 0.9rem', background: 'var(--color-amber-bg)', color: 'var(--color-amber-text)', fontWeight: 700, fontSize: '0.85rem' }}>
                          Nhóm {gi + 1} · Đề {pct(g.maxStmtSim)} · Lời giải {pct(g.maxSolSim)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {g.members.map((m) => (
                            <div key={m.id} style={{ display: 'flex', gap: 12, padding: '0.9rem', borderTop: '1px solid var(--color-border-subtle)' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ maxHeight: 120, overflowY: 'auto', color: 'var(--color-text)', fontSize: '0.92rem' }}>
                                  <MathText text={m.statement} />
                                </div>
                                <div style={{ marginTop: 6, color: 'var(--color-text-subtle)', fontSize: '0.78rem' }}>
                                  Thêm {fmtDate(m.dateAdded)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                                <button className="card-btn" onClick={() => onPreview(m)}><Eye size={15} /> Xem đầy đủ</button>
                                <button className="card-btn card-btn-danger" onClick={() => handleDelete(m.id)}><Trash2 size={15} /> Xoá</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      };

      export default DuplicateScanPage;
      ```
      *(Nếu tên class nút của dự án khác, canh theo nút có sẵn — `card-btn`, `card-btn-danger` đang dùng ở DataGrid/TrashPage.)*

- [ ] Bước 2: Build sạch (chưa nối vào app, chỉ chắc component biên dịch được)
      Chạy: `CI=true npm run build` → `Compiled successfully`, 0 warning.
      *(Nếu báo "DuplicateScanPage is defined but never used" ở bước build này thì bỏ qua — Task 4 sẽ nối. Nhưng vì file mới chưa import ở đâu nên thường KHÔNG cảnh báo; nếu có, làm luôn Task 4 rồi build.)*

- [ ] Bước 3: Lưu tiến độ
      Chạy: `git add -A && git commit -m "feat(dup): man ket qua DuplicateScanPage (tu quet, xem day du, xoa tai cho)"`

---

### Task 4: Nối vào App + mở từ Cài đặt

**What you'll have when this is done:** Trong Cài đặt có Row "Quét trùng toàn kho"; bấm Mở → hiện màn quét; Xoá đưa vào Thùng rác + toast Hoàn tác (dùng chung đúng đường với màn Bài).

- [ ] Bước 1: Tách hàm xoá-mềm dùng chung — `src/App.jsx`
      - Thêm hàm này ngay dưới `handleCancelDuplicateSave` (khoảng dòng 154), TRƯỚC `return (`:
        ```jsx
        // Xoá mềm 1 bài + toast Hoàn tác. Dùng chung cho feed (DataGrid) và màn Quét trùng.
        const handleDeleteWithUndo = async (id) => {
          if (await deleteProblem(id)) {
            removeFromCart(id);
            if (ui.selectedPreview?.id === id) ui.setSelectedPreview(null);
            undoToast('Đã chuyển vào thùng rác', async () => {
              if (!(await restoreProblem(id))) error('Chưa khôi phục được — thử lại nhé.');
            });
          } else {
            error('Chưa xoá được — thử lại nhé.');
          }
        };
        ```

- [ ] Bước 2: Cho `DataGrid` dùng hàm chung (thay khối `onDelete` inline)
      - Trong `<DataGrid ...>` (khoảng dòng 245), thay CẢ khối:
        ```jsx
        onDelete={async (id) => {
          if (await deleteProblem(id)) {
            removeFromCart(id);
            if (ui.selectedPreview?.id === id) ui.setSelectedPreview(null);
            undoToast('Đã chuyển vào thùng rác', async () => {
              if (!(await restoreProblem(id))) error('Chưa khôi phục được — thử lại nhé.');
            });
          } else {
            error('Chưa xoá được — thử lại nhé.');
          }
        }}
        ```
        bằng đúng một dòng:
        ```jsx
        onDelete={handleDeleteWithUndo}
        ```
      *(Hành vi feed KHÔNG đổi — cùng mã, chỉ chuyển chỗ để dùng lại.)*

- [ ] Bước 3: Thêm import + khối render màn mới — `src/App.jsx`
      - Thêm import (cạnh các import component khác): `import DuplicateScanPage from './components/DuplicateScanPage';`
      - Truyền prop mở màn cho SettingsPage — sửa dòng render `settings` (dòng 283-285) thành:
        ```jsx
        {ui.currentView === 'settings' && (
          <SettingsPage
            onManageCategories={() => ui.setShowCategoryManager(true)}
            onManageTags={() => ui.setShowTagManager(true)}
            onScanDuplicates={() => ui.setCurrentView('duplicates')}
          />
        )}
        ```
      - Ngay dưới khối `settings` đó, thêm khối màn mới:
        ```jsx
        {ui.currentView === 'duplicates' && (
          <DuplicateScanPage
            problems={problems}
            onPreview={(prob) => ui.setSelectedPreview(prob)}
            onDelete={handleDeleteWithUndo}
            onBack={() => ui.setCurrentView('settings')}
          />
        )}
        ```

- [ ] Bước 4: Thêm Row trong Cài đặt — `src/components/SettingsPage.jsx`
      - Đổi chữ ký: `const SettingsPage = ({ onManageCategories, onManageTags, onScanDuplicates }) => {`
      - Thêm icon vào dòng import lucide (dòng 2): thêm `CopyCheck` →
        `import { FolderTree, Moon, Tag, FileDown, KeyRound, Database, AlertTriangle, CopyCheck } from 'lucide-react';`
      - Ngay DƯỚI Row "Quản lý tag" (kết thúc ở dòng 190), thêm:
        ```jsx
        <Row
          icon={<CopyCheck size={20} />}
          title="Quét trùng toàn kho"
          desc="Rà tất cả bài đang có, tìm các bài giống nhau để xem và dọn."
          action={<button className="card-btn card-btn-primary" onClick={onScanDuplicates}>Mở</button>}
        />
        ```

- [ ] Bước 5: Cập nhật chú thích `currentView` — `src/hooks/useUIState.js`
      - Sửa dòng chú thích (dòng 27) thêm `duplicates`:
        `const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'feed' | 'matrix' | 'cart' | 'settings' | 'trash' | 'duplicates'`
      *(Chỉ đổi chú thích — không thêm state; màn mới dùng chung `currentView`/`setCurrentView`.)*

- [ ] Bước 6: Build + kiểm GUI (Thầy chạy `npx tauri dev`)
      Chạy: `CI=true npm run build` → `Compiled successfully`, 0 warning.
      Checklist GUI:
      1. Cài đặt → **Quét trùng toàn kho** → Mở → màn tự quét, hiện **1 nhóm** "Đề 100% · Lời giải 100%" gồm **2 bài** (bài số-nguyên-tố $p_1^2+\ldots+p_{12}^2=p_{13}^2$, ngày 25/06 và 28/06).
      2. Bấm **Xem đầy đủ** một bài → mở cửa sổ xem như thường.
      3. Bấm **Xoá** bài nhập-sau (28/06) → có toast **Hoàn tác**; nhóm biến mất (còn 1 bài) → màn báo "Không tìm thấy…".
      4. Bấm **Hoàn tác** trên toast → sang màn **Bài** (hoặc bấm Quét lại) thấy bài trở lại.
      5. Nút ← **Cài đặt** quay về đúng trang Cài đặt.

- [ ] Bước 7: Lưu tiến độ
      Chạy: `git add -A && git commit -m "feat(dup): mo tu Cai dat + noi App (dung chung duong xoa mem)"`

---

### Task 5: Nghiệm thu tổng + an toàn LaTeX + tài liệu + merge

**What you'll have when this is done:** Bằng chứng cả kho vẫn nguyên, xuất `.tex` không hỏng, tài liệu cập nhật, nhánh gộp về `master`.

- [ ] Bước 1: Test toàn bộ + build
      Chạy: `CI=true npm test` → tất cả XANH (**111** = 104 cũ + 7 ca scanDuplicates); **golden `buildContentFile` KHÔNG đổi**.
      Chạy: `CI=true npm run build` → 0 warning.

- [ ] Bước 2: **An toàn LaTeX (bắt buộc)** — chứng minh đường xoá từ màn quét KHÔNG hỏng nội dung/xuất (Thầy làm trong `npx tauri dev`)
      1. Thêm 2 bài y hệt nhau, đề chứa `$x^2 + y^2 = z^2$` (để tạo một cặp trùng thử).
      2. Cài đặt → Quét trùng toàn kho → thấy cặp thử đó (Đề 100%).
      3. **Xoá** một bản trong cặp thử (bản kia giữ lại).
      4. Đưa bản giữ lại vào Giỏ → **Xuất `.tex`** → mở file, xác nhận `$x^2 + y^2 = z^2$` còn **nguyên vẹn**.
      5. Dọn: có thể xoá hẳn 2 bài thử trong Thùng rác (không ảnh hưởng 73 bài thật).

- [ ] Bước 3: Rà đúng phạm vi (không chạm đường xuất/DB-schema/Rust/findDuplicates)
      Chạy: `git diff --name-only master`
      Sẽ thấy đúng: `scanDuplicates.js`, `scanDuplicates.test.js`, `DuplicateScanPage.jsx`, `useUIState.js`, `SettingsPage.jsx`, `App.jsx` (+ tài liệu ở bước 4). **KHÔNG** có `findDuplicates.js` / `buildProblemTex.js` / `buildContentFile.js` / `db.js` / thư mục `src-tauri/`.

- [ ] Bước 4: Cập nhật tài liệu
      - `.docs/ROADMAP.md` — đánh dấu mục "🧩 Quét trùng toàn kho" là **XONG (15/07/2026, NK33)**, ghi ngắn: màn mở từ Cài đặt, gom nhóm, xoá mềm tại chỗ, dùng ngưỡng Cài đặt.
      - Viết nhật ký mới `.docs/33_2026_07_15.md` theo nếp NK: bối cảnh (món Đợt B cuối), 4 câu chốt brainstorm, kiểm dữ liệu thật (1 cặp trùng 100% thật), các commit, kết quả test/build (111 xanh, golden không đổi), checklist nghiệm thu, guardrail.

- [ ] Bước 5: Gộp về master (chỉ SAU khi Thầy đã nghiệm thu GUI ở Task 4 bước 6 + Task 5 bước 2)
      Chạy: `git add -A && git commit -m "docs: roadmap + nhat ky 33 (quet trung toan kho, Dot B)"`
      Chạy: `git checkout master && git merge --no-ff feat-quet-trung-toan-kho -m "Merge: quet trung toan kho (Dot B, NK33)"`

---

## Ready to Build

Kế hoạch đã lưu. Cách làm tiếp:

1. Đọc hết plan một lượt trước khi bắt đầu.
2. Làm theo thứ tự task — không nhảy cóc (Task 2 là nền cho Task 3–4).
3. Làm xong bước "kiểm/Build" của mỗi task rồi mới sang task kế.
4. Chỗ nào cần chạy `npx tauri dev` để xem GUI là phần Thầy nghiệm thu (Claude không tự mở được Tauri + SQL).
5. Nếu có gì lệch kỳ vọng, dừng và mô tả cái thấy — đừng sửa mò.

Nói **"bắt đầu build"** khi Thầy sẵn sàng làm Task 1.
