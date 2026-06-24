# GĐ3 (đợt con) — Thùng rác (xoá mềm) — Build Plan

**What we're building:** Xoá bài giờ là **xoá mềm** (rơi vào Thùng rác) thay vì mất hẳn; thêm **trang Thùng rác** trên nav rail để **Khôi phục** hoặc **Xoá hẳn**.

**Why:** Lỡ tay xoá thì không mất ngay — có lưới an toàn để lấy lại nguyên trạng (kể cả phân loại). Quan trọng khi app đã chứa dữ liệu thật.

**Approach:** Thêm 1 cột `deletedAt` (mốc thời gian) vào bảng `problems` qua migration an toàn; đổi 2 hàm xoá thành đánh dấu `deletedAt`; tách danh sách bài đã xoá; dựng trang Thùng rác; cuối cùng tinh chỉnh trải nghiệm xoá (toast Hoàn tác, gỡ khỏi giỏ). **Không đụng** xuất `.tex` → output byte-identical.

**Files we'll create or change:**
- `src/utils/db.js` — sửa: thêm cột `deletedAt` + index (migration idempotent)
- `src/hooks/useProblems.js` — sửa: xoá mềm + danh sách `trashedProblems` + `restoreProblem`/`purgeProblem`/`emptyTrash`
- `src/components/TrashPage.jsx` — **mới**: trang Thùng rác (danh sách + Khôi phục/Xoá hẳn/Xoá sạch)
- `src/components/NavRail.jsx` — sửa: thêm mục **Thùng rác** + badge
- `src/hooks/useToast.js` — sửa: thêm `undoToast` (toast có nút Hoàn tác)
- `src/App.jsx` — sửa: render trang Thùng rác + tinh chỉnh luồng xoá (bỏ confirm khi xoá 1 bài, gỡ bài khỏi giỏ)

> **Quy ước chung khi làm:**
> - **Kiểm biên dịch:** trong PowerShell chạy `$env:CI="false"; npm run build` → mong đợi `Compiled successfully.` và **0 warning**.
> - **Chạy thật để nhìn:** `npx tauri dev` (app chỉ chạy với DB qua lệnh này, KHÔNG phải `npm start`).
> - **Lưu tiến độ:** mỗi task xong chạy lệnh commit ở cuối task (kèm dòng đồng tác giả).
> - **Đợt này CÓ đổi cấu trúc CSDL** (thêm 1 cột) → **bắt buộc backup DB** ở Task 1 trước khi chạy.
> - **Nhánh làm việc:** làm trên nhánh riêng `ux-gd3-thung-rac` (tách từ `master`), merge sau khi Thầy nghiệm thu — giống đợt khung.

---

### Task 1: Tạo nhánh, sao lưu DB, và thêm cột `deletedAt`

**What you'll have when this is done:** Bảng `problems` có thêm cột `deletedAt` (đang để trống cho mọi bài cũ); app chạy y như cũ, dữ liệu nguyên vẹn. Đây là nền cho xoá mềm.

- [ ] Bước 1: Tạo nhánh làm việc.
      Run: `git checkout -b ux-gd3-thung-rac`
      You should see: `Switched to a new branch 'ux-gd3-thung-rac'`

- [ ] Bước 2: **Sao lưu CSDL** (phòng hờ — dù migration chỉ THÊM cột).
      Run: `Copy-Item "$env:APPDATA\com.tauri.dev\problem_bank.db" "$env:APPDATA\com.tauri.dev\problem_bank.backup-2026-06-24.db"`
      Kiểm tra đã có file backup: `Get-ChildItem "$env:APPDATA\com.tauri.dev\" -Filter *.db`
      You should see: liệt kê cả `problem_bank.db` lẫn `problem_bank.backup-2026-06-24.db`.
      *(Nếu đường dẫn không tồn tại: app chưa từng chạy lần nào — chạy `npx tauri dev` một lần rồi tắt, sau đó backup.)*

- [ ] Bước 3: Mở `src/utils/db.js`. Ngay **sau** khối migration `metadata` (đoạn `try { await db.execute(\`ALTER TABLE problems ADD COLUMN metadata TEXT DEFAULT '{}'\`); } catch (e) { ... }`), thêm:
      ```js
      // 🛠️ MIGRATION: cột xoá mềm. NULL = đang dùng; có mốc thời gian ISO = đang trong Thùng rác.
      try {
        await db.execute(`ALTER TABLE problems ADD COLUMN deletedAt TEXT DEFAULT NULL`);
      } catch (e) {
        // Cột đã có sẵn -> SQLite ném lỗi -> bỏ qua an toàn (idempotent)
      }
      ```

- [ ] Bước 4: Trong cùng file, ở cụm `CREATE INDEX` cho bảng `problems` (gần `idx_date`), thêm một dòng:
      ```js
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_deleted ON problems(deletedAt);`);
      ```

- [ ] Bước 5: Kiểm biên dịch + chạy thử + lưu.
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully.` — **0 warning**.
      Rồi `npx tauri dev`: app mở bình thường, **tất cả bài cũ vẫn hiện đủ** (cột mới chưa ảnh hưởng gì). Nếu mở được và đủ bài → migration OK.
      Run: `git add . ; git commit -m "feat(db): them cot deletedAt cho xoa mem (migration idempotent)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 2: Tầng dữ liệu — xoá mềm + danh sách Thùng rác + khôi phục/xoá hẳn

**What you'll have when this is done:** Xoá một bài (bằng các nút hiện có) sẽ **ẩn nó khỏi feed nhưng giữ trong DB** (đánh dấu đã xoá); có sẵn các hàm khôi phục/xoá hẳn cho trang Thùng rác ở task sau. *(Lưu ý: chưa có trang Thùng rác để lấy lại — đừng xoá dữ liệu quý cho tới Task 4; dữ liệu hiện là dữ liệu test nên an toàn.)*

- [ ] Bước 1: Mở `src/hooks/useProblems.js`. Thêm state cho danh sách đã xoá (ngay dưới `const [problems, setProblems] = useState([]);`):
      ```js
      const [trashedProblems, setTrashedProblems] = useState([]);
      ```

- [ ] Bước 2: Trong `loadProblems`, tìm dòng cuối `setProblems(parsedProblems);` và **thay** bằng đoạn tách 2 danh sách (bài đang dùng vs bài đã xoá):
      ```js
      // Tách: deletedAt rỗng = đang dùng (feed); có giá trị = trong Thùng rác (sắp theo lúc xoá mới nhất).
      setProblems(parsedProblems.filter((p) => !p.deletedAt));
      setTrashedProblems(
        parsedProblems
          .filter((p) => p.deletedAt)
          .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
      );
      ```

- [ ] Bước 3: **Thay** hàm `deleteProblem` (mục 4) và `bulkDeleteProblems` (mục 5) bằng bản xoá MỀM (đánh dấu rồi nạp lại để 2 danh sách luôn khớp DB):
      ```js
      // 4. XÓA MỀM 1 BÀI -> chuyển vào Thùng rác
      const deleteProblem = async (id) => {
        try {
          const db = await getDb();
          await db.execute('UPDATE problems SET deletedAt = $1 WHERE id = $2', [new Date().toISOString(), id]);
          await loadProblems();
        } catch (error) { console.error("Lỗi xoá mềm:", error); }
      };

      // 5. XÓA MỀM HÀNG LOẠT -> chuyển nhiều bài vào Thùng rác
      const bulkDeleteProblems = async (idsToDelete) => {
        if (!idsToDelete || idsToDelete.length === 0) return;
        try {
          const db = await getDb();
          const now = new Date().toISOString();
          // $1 = thời điểm xoá; các id bắt đầu từ $2
          const placeholders = idsToDelete.map((_, i) => `$${i + 2}`).join(', ');
          await db.execute(`UPDATE problems SET deletedAt = $1 WHERE id IN (${placeholders})`, [now, ...idsToDelete]);
          await loadProblems();
        } catch (error) { console.error("Lỗi xoá mềm hàng loạt:", error); }
      };
      ```

- [ ] Bước 4: Thêm 3 hàm mới cho Thùng rác (đặt ngay dưới `bulkDeleteProblems`):
      ```js
      // KHÔI PHỤC: bỏ dấu xoá -> bài về lại feed nguyên phân loại
      const restoreProblem = async (id) => {
        try {
          const db = await getDb();
          await db.execute('UPDATE problems SET deletedAt = NULL WHERE id = $1', [id]);
          await loadProblems();
        } catch (error) { console.error("Lỗi khôi phục:", error); }
      };

      // XÓA HẲN 1 BÀI: xoá bản ghi + dọn 3 bảng nối phân loại (vá luôn rác mồ côi)
      const purgeProblem = async (id) => {
        try {
          const db = await getDb();
          await db.execute('DELETE FROM problems WHERE id = $1', [id]);
          await db.execute('DELETE FROM problem_categories WHERE problem_id = $1', [id]);
          await db.execute('DELETE FROM problem_difficulties WHERE problem_id = $1', [id]);
          await db.execute('DELETE FROM problem_grades WHERE problem_id = $1', [id]);
          await loadProblems();
        } catch (error) { console.error("Lỗi xoá hẳn:", error); }
      };

      // XÓA SẠCH THÙNG RÁC: xoá hẳn mọi bài đã đánh dấu xoá + dọn bảng nối của chúng
      const emptyTrash = async () => {
        try {
          const db = await getDb();
          const rows = await db.select('SELECT id FROM problems WHERE deletedAt IS NOT NULL');
          const ids = rows.map((r) => r.id);
          if (ids.length === 0) return;
          const ph = ids.map((_, i) => `$${i + 1}`).join(', ');
          await db.execute(`DELETE FROM problem_categories WHERE problem_id IN (${ph})`, ids);
          await db.execute(`DELETE FROM problem_difficulties WHERE problem_id IN (${ph})`, ids);
          await db.execute(`DELETE FROM problem_grades WHERE problem_id IN (${ph})`, ids);
          await db.execute('DELETE FROM problems WHERE deletedAt IS NOT NULL');
          await loadProblems();
        } catch (error) { console.error("Lỗi dọn thùng rác:", error); }
      };
      ```

- [ ] Bước 5: Cập nhật khối `return { ... }` cuối hook — thêm các tên mới:
      ```js
      return {
        problems,
        trashedProblems,
        trashCount: trashedProblems.length,
        addProblem,
        updateProblem,
        deleteProblem,
        bulkDeleteProblems,
        restoreProblem,
        purgeProblem,
        emptyTrash,
        saveImportedProblems,
        checkDuplicate
      };
      ```
      Kiểm + lưu:
      Run: `$env:CI="false"; npm run build` → `Compiled successfully.` 0 warning.
      `npx tauri dev`: bấm **Xoá** một bài (vẫn còn hộp xác nhận cũ) → bài biến khỏi feed. Tắt app, mở lại → bài đó **vẫn không** ở feed (đã vào thùng rác trong DB). Số tổng ở Header giảm đúng 1.
      *Nếu bài xoá xong vẫn còn hiện:* kiểm tra Bước 2 đã lọc `!p.deletedAt`, và `deleteProblem` đã `await loadProblems()`.
      Run: `git add . ; git commit -m "feat(data): xoa mem + danh sach thung rac + khoi phuc/xoa han" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 3: Dựng trang Thùng rác (`TrashPage.jsx`)

**What you'll have when this is done:** Có sẵn một trang hiển thị danh sách bài đã xoá (đề + phân loại + ngày xoá) với nút **Khôi phục** / **Xoá hẳn** mỗi bài và **Xoá sạch thùng rác** ở đầu trang. (Chưa gắn vào nav rail — Task 4.)

- [ ] Bước 1: Tạo file `src/components/TrashPage.jsx`:
      ```jsx
      import React, { useMemo } from 'react';
      import { Virtuoso } from 'react-virtuoso';
      import { RotateCcw, Trash2, Trash } from 'lucide-react';
      import { useTaxonomy } from '../hooks/useTaxonomy';
      import { groupClassificationByHe } from '../utils/classification';
      import LatexBlockRenderer from './LatexBlockRenderer';

      const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('vi-VN'); } catch { return ''; } };

      // Trang Thùng rác: bài đã xoá mềm. Khôi phục để dùng lại, hoặc xoá hẳn (không hoàn tác).
      const TrashPage = ({ items, onRestore, onPurge, onEmptyAll }) => {
        const { categories, difficulties } = useTaxonomy();
        const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
        const diffById = useMemo(() => Object.fromEntries(difficulties.map((d) => [d.id, d])), [difficulties]);
        const parentMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.parent_id])), [categories]);

        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 style={{ margin: 0, color: 'var(--color-text)' }}>Thùng rác</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Bài đã xoá. Khôi phục để dùng lại, hoặc xoá hẳn để giải phóng.</div>
              </div>
              <button className="card-btn card-btn-danger" disabled={items.length === 0}
                onClick={() => { if (window.confirm(`Xoá hẳn toàn bộ ${items.length} bài trong thùng rác? Không thể hoàn tác.`)) onEmptyAll(); }}>
                <Trash size={16} /> Xoá sạch thùng rác
              </button>
            </div>

            <Virtuoso
              style={{ flex: 1 }}
              data={items}
              components={{
                EmptyPlaceholder: () => (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>Thùng rác trống.</div>
                ),
              }}
              itemContent={(index, p) => {
                const classification = groupClassificationByHe(p, catById, parentMap, diffById);
                const clsText = classification.length === 0
                  ? 'Chưa phân loại'
                  : classification.map((g) => g.paths.map((path) => path.join(' › ')).join('  |  ')).join('  ·  ');
                return (
                  <div style={{ padding: '0 16px' }}>
                    <div style={{ margin: '12px 0 0', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', maxHeight: '6em', overflowY: 'auto', color: 'var(--color-text)', lineHeight: 1.55 }}>
                        <LatexBlockRenderer text={p.statement} />
                      </div>
                      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border-subtle)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        {clsText}<span> · Đã xoá {fmtDate(p.deletedAt)}</span>
                      </div>
                      <div style={{ padding: '9px 16px', background: 'var(--color-surface-muted)', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 8 }}>
                        <button className="card-btn card-btn-primary" onClick={() => onRestore(p.id)}><RotateCcw size={16} /> Khôi phục</button>
                        <button className="card-btn card-btn-danger" onClick={() => { if (window.confirm('Xoá hẳn bài này? Không thể hoàn tác.')) onPurge(p.id); }}><Trash2 size={16} /> Xoá hẳn</button>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Thùng rác có <strong style={{ color: 'var(--color-text)' }}>{items.length}</strong> bài.
            </div>
          </div>
        );
      };

      export default TrashPage;
      ```

- [ ] Bước 2: Kiểm biên dịch (component mới chưa ai dùng, nhưng phải biên dịch sạch).
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully.` — 0 warning. Giao diện app chưa đổi.
      *Nếu báo lỗi thiếu icon:* chắc chắn `RotateCcw`, `Trash2`, `Trash` đều có trong `lucide-react` (đúng tên, viết hoa chữ cái đầu).

- [ ] Bước 3: Lưu tiến độ.
      Run: `git add . ; git commit -m "feat(ux): trang Thung rac (khoi phuc/xoa han/xoa sach)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 4: Gắn Thùng rác vào nav rail + App (mở được & dùng được)

**What you'll have when this is done:** Nav rail có mục **Thùng rác** kèm badge số bài; bấm vào mở trang Thùng rác; Khôi phục / Xoá hẳn / Xoá sạch chạy thật.

- [ ] Bước 1: Sửa `src/components/NavRail.jsx`. Thêm `Trash2` vào dòng import:
      ```jsx
      import { PlusSquare, Upload, List, ShoppingCart, Settings, Trash2, ChevronsLeft, ChevronsRight } from 'lucide-react';
      ```
      Thêm `trashCount` vào tham số component:
      ```jsx
      const NavRail = ({ currentView, onNavigate, onAdd, onImport, cartCount, trashCount, collapsed, onToggleCollapse }) => {
      ```
      Ngay **sau** `<div style={{ flex: 1 }} />` và **trước** nút Cài đặt, chèn mục Thùng rác:
      ```jsx
      <button className={`rail-item ${currentView === 'trash' ? 'on' : ''}`} onClick={() => onNavigate('trash')}
        style={{ justifyContent: align }}>
        <Trash2 size={18} /> {lbl('Thùng rác')}
        {trashCount > 0 && <span className="view-badge" style={{ marginLeft: 'auto' }}>{trashCount}</span>}
      </button>
      ```

- [ ] Bước 2: Trong `src/App.jsx`: thêm import `import TrashPage from './components/TrashPage';` (cạnh các import component). Mở rộng phần lấy dữ liệu từ `useProblems` để có thêm các hàm/danh sách mới:
      ```jsx
      const {
        problems,
        trashedProblems,
        trashCount,
        addProblem,
        updateProblem,
        deleteProblem,
        bulkDeleteProblems,
        restoreProblem,
        purgeProblem,
        emptyTrash,
        saveImportedProblems,
        checkDuplicate
      } = useProblems();
      ```

- [ ] Bước 3: Truyền `trashCount` cho `NavRail` (thêm 1 dòng prop):
      ```jsx
      <NavRail
        currentView={ui.currentView}
        onNavigate={ui.setCurrentView}
        onAdd={() => ui.setShowAddModal(true)}
        onImport={() => ui.setShowImportModal(true)}
        cartCount={cartCount}
        trashCount={trashCount}
        collapsed={ui.railCollapsed}
        onToggleCollapse={() => ui.setRailCollapsed(v => !v)}
      />
      ```

- [ ] Bước 4: Thêm nhánh render trang Thùng rác. Ngay **sau** khối `{ui.currentView === 'settings' && ( ... )}`, thêm:
      ```jsx
      {ui.currentView === 'trash' && (
        <TrashPage
          items={trashedProblems}
          onRestore={(id) => { restoreProblem(id); success('Đã khôi phục bài'); }}
          onPurge={(id) => { purgeProblem(id); success('Đã xoá hẳn'); }}
          onEmptyAll={() => { emptyTrash(); success('Đã dọn sạch thùng rác'); }}
        />
      )}
      ```

- [ ] Bước 5: Check it works.
      Run: `$env:CI="false"; npm run build` → 0 warning. Rồi `npx tauri dev`:
      - Xoá vài bài ở feed → rail hiện **Thùng rác** với badge đúng số.
      - Bấm **Thùng rác** → thấy đúng các bài vừa xoá, có đề + dòng phân loại + "Đã xoá [ngày giờ]".
      - **Khôi phục** một bài → biến khỏi thùng, quay lại feed (đúng phân loại), badge giảm 1.
      - **Xoá hẳn** một bài (xác nhận) → biến khỏi thùng, KHÔNG về feed.
      - **Xoá sạch thùng rác** (xác nhận) → thùng trống, hiện "Thùng rác trống.".
      *Nếu badge không cập nhật:* đảm bảo Task 2 đã `await loadProblems()` trong mỗi hàm và App lấy `trashCount` từ `useProblems`.

- [ ] Bước 6: Lưu tiến độ.
      Run: `git add . ; git commit -m "feat(ux): gan Thung rac vao nav rail + render trang" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 5: Tinh chỉnh trải nghiệm xoá — toast Hoàn tác + gỡ khỏi giỏ

**What you'll have when this is done:** Xoá 1 bài: đi ngay (không hộp thoại) kèm toast **Hoàn tác**; xoá hàng loạt: vẫn hỏi xác nhận. Bài bị xoá cũng **rời khỏi Giỏ**.

- [ ] Bước 1: Thêm toast có nút Hoàn tác vào `src/hooks/useToast.js`. Thêm `import React from 'react';` ở đầu file (cùng nhóm import), rồi thêm hàm này trong hook (trước `return`):
      ```jsx
      // Toast có nút Hoàn tác (dùng cho xoá mềm). Bấm Hoàn tác sẽ gọi onUndo và đóng toast.
      const undoToast = (message, onUndo) => {
        toast((t) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{message}</span>
            <button
              onClick={() => { toast.dismiss(t.id); onUndo(); }}
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-cobalt)', borderRadius: 6, padding: '2px 10px', fontWeight: 600, cursor: 'pointer' }}
            >Hoàn tác</button>
          </span>
        ), { duration: 5000, position: 'top-right' });
      };
      ```
      Và thêm `undoToast` vào khối `return { success, error, loading, info, undoToast };`.

- [ ] Bước 2: Trong `src/App.jsx`, lấy thêm `undoToast` từ `useToast`:
      ```jsx
      const { success, info, undoToast } = useToast();
      ```

- [ ] Bước 3: Sửa **xoá 1 bài** — bỏ `window.confirm`, gỡ khỏi giỏ, thêm Hoàn tác. Tìm prop `onDelete={(id) => { ... }}` đang truyền cho `<DataGrid>` và thay bằng:
      ```jsx
      onDelete={(id) => {
        deleteProblem(id);
        removeFromCart(id);
        if (ui.selectedPreview?.id === id) ui.setSelectedPreview(null);
        undoToast('Đã chuyển vào thùng rác', () => restoreProblem(id));
      }}
      ```

- [ ] Bước 4: Sửa **xoá hàng loạt** — giữ confirm, gỡ các bài khỏi giỏ. Thay hàm `handleBulkDelete` bằng:
      ```jsx
      const handleBulkDelete = () => {
        if (ui.selectedIds.length === 0) return;
        const ids = ui.selectedIds;
        if (window.confirm(`Thầy có chắc chắn muốn xóa ${ids.length} bài tập đã chọn? (Sẽ chuyển vào Thùng rác)`)) {
          bulkDeleteProblems(ids);
          ids.forEach((id) => removeFromCart(id));
          ui.setSelectedIds([]);
          ui.setSelectedPreview(null);
          success(`Đã chuyển ${ids.length} bài vào Thùng rác`);
        }
      };
      ```

- [ ] Bước 5: Check it works.
      Run: `$env:CI="false"; npm run build` → 0 warning. Rồi `npx tauri dev`:
      - Xoá 1 bài (nút Xoá trên thẻ) → **không** hỏi xác nhận; bài biến mất; góc phải hiện toast "Đã chuyển vào thùng rác" + nút **Hoàn tác**. Bấm Hoàn tác → bài quay lại feed (và **không** vào lại giỏ).
      - Thêm 1 bài vào Giỏ, rồi xoá đúng bài đó → mở **Giỏ** thấy bài đã rời giỏ.
      - Chọn nhiều bài (bấm thân thẻ) → **Xoá N** → **vẫn hỏi xác nhận** → các bài vào thùng rác + rời giỏ.
      *Nếu toast không có nút:* kiểm tra `useToast.js` đã `import React` và `return` có `undoToast`.

- [ ] Bước 6: Lưu tiến độ.
      Run: `git add . ; git commit -m "feat(ux): xoa 1 bai co Hoan tac + go khoi gio; xoa loat giu confirm" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 6: Nghiệm thu cuối — an toàn xuất `.tex` + kiểm dữ liệu + dọn

**What you'll have when this is done:** Chắc chắn xuất `.tex` **y nguyên** (byte-identical), dữ liệu khôi phục đúng phân loại, xoá hẳn không để lại rác — và build sạch.

- [ ] Bước 1: **An toàn xuất `.tex` (BẮT BUỘC).** `npx tauri dev`:
      1. Thêm bài có công thức, ví dụ statement `Chứng minh $x^2 + y^2 = z^2$ có vô số nghiệm nguyên.`, gắn 1 phân loại bất kỳ, lưu.
      2. Bấm thân thẻ để chọn → **Thêm vào giỏ** → mở **Giỏ** → **Xuất đề** → lưu file `.tex`.
      3. Mở file `.tex`: xác nhận có `\begin{bt} ... \end{bt}`, công thức `$x^2 + y^2 = z^2$` **nguyên vẹn**, `\loigiai{...}` nếu chọn kèm lời giải.

- [ ] Bước 2: **Đối chiếu byte-identical bằng git** (đợt này KHÔNG sửa bộ dựng xuất).
      Run: `git diff master -- src/utils/buildProblemTex.js`
      You should see: **rỗng** (không dòng nào) — bộ dựng khối `\begin{bt}` không bị chạm.
      Run: `git diff master -- src/App.jsx | Select-String "handleFinalExport","documentclass","buildProblemTex","begin{document}"`
      You should see: **không dòng `+`/`-` nào** chứa các từ khoá xuất → `handleFinalExport` nguyên vẹn.

- [ ] Bước 3: **Kiểm vòng đời dữ liệu** (`npx tauri dev`):
      - Xoá mềm 1 bài đã phân loại → vào Thùng rác → **Khôi phục** → về feed **đúng phân loại cũ** (cây/độ khó/lớp còn nguyên).
      - Xoá mềm 1 bài khác → **Xoá hẳn** từ Thùng rác → bài mất hẳn; tắt/mở lại app vẫn không thấy đâu (DB đã xoá + bảng nối đã dọn).
      - Tổng số ở Header = số bài đang dùng (không tính bài trong thùng).

- [ ] Bước 4: Kiểm biên dịch lần cuối + xác nhận không file thừa.
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully.` — **0 warning**.

- [ ] Bước 5: Lưu tiến độ cuối.
      Run: `git add . ; git commit -m "chore(ux): nghiem thu Thung rac (export byte-identical, du lieu nguyen ven)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

> **Sau khi Thầy nghiệm thu xong:** merge vào `master` giống đợt khung —
> `git checkout master ; git merge --no-ff ux-gd3-thung-rac` — rồi cập nhật nhật ký (số 13) + memory. (Chưa làm cho tới khi Thầy duyệt trực quan.)

---

## Ready to Build

Kế hoạch đã lưu tại `.docs/plans/2026-06-24-ux-gd3-thung-rac.md`. Việc cần làm:

1. Đọc lướt cả kế hoạch một lượt trước khi bắt đầu.
2. Làm theo thứ tự task — đừng nhảy cóc (mỗi task được thiết kế để app vẫn chạy sau khi xong).
3. Hoàn thành bước "Check it works" trước khi sang task kế.
4. Nếu có gì không như mong đợi, **dừng lại và mô tả đúng những gì thấy** — đừng thử sửa lung tung.

Nói **"bắt đầu build"** (hoặc "làm Task 1") khi Thầy sẵn sàng.
