# Gập/mở nhánh cây trong "Quản lý phân loại" — Build Plan

**What we're building:** Thêm nút mũi tên thu gọn/mở rộng từng nhánh cây trong màn Quản lý phân loại (Cài đặt), cùng 2 nút "Mở tất cả / Gập tất cả".

**Why:** Cây phân loại to lên thì rối; gập/mở giúp Thầy dễ quan sát và quản lý — giống cách đã làm ở phần Bài.

**Approach:** Sao chép đúng pattern gập/mở của `FilterSidebar` sang `CategoryManagerModal`: một state `expanded` (mặc định gập hết), nút chevron trên mỗi nhánh có con, chỉ vẽ nhánh con khi mở. Thêm 2 nút mở/gập toàn bộ. Thuần giao diện, chỉ sửa **một file**, không đụng cơ sở dữ liệu hay đường xuất `.tex`.

**Spec:** [.docs/specs/2026-07-11-gap-cay-quan-ly-phan-loai-design.md](../specs/2026-07-11-gap-cay-quan-ly-phan-loai-design.md) (đọc trước khi build).

**Files we'll create or change:**
- `src/components/Modals/CategoryManagerModal.jsx` — thêm state gập/mở, nút chevron mỗi nhánh, 2 nút mở/gập toàn bộ, tự bung khi thêm nhánh con

**Giải nghĩa vài từ:** *state* = mẩu dữ liệu React nhớ trong lúc màn đang mở; *chevron* = biểu tượng mũi tên ▸/▾; *gate* = đặt điều kiện "chỉ vẽ khi …"; *idempotent* = chạy lại nhiều lần vẫn ra một kết quả.

> ✅ **An toàn:** Chỉ sửa 1 file giao diện. **Không đổi** cấu trúc CSDL, dữ liệu phân loại, hay đường xuất (`buildProblemTex.js` / `buildContentFile.js` / `ExportModal.jsx` / `db.js` / Rust). **Golden export phải giữ nguyên 3/3.**

> ⚠️ **Thứ tự:** Làm Task 1 → 2 → 3. Sau Task 1 app đã chạy được với cây gập/mở; Task 2 thêm 2 nút mở/gập toàn bộ; Task 3 là kiểm + nghiệm thu.

---

### Task 1: Thêm gập/mở từng nhánh (mũi tên ▸/▾)

**What you'll have when this is done:** Cây trong Quản lý phân loại mặc định gập hết (chỉ thấy các hệ); mỗi nhánh có con hiện mũi tên bấm để bung/gập; thêm nhánh con tự bung.

- [ ] Bước 1: Mở `src/components/Modals/CategoryManagerModal.jsx`. Tìm khối khai báo state trong `CategoryManagerModal`:
      ```jsx
      const [moving, setMoving] = useState(null);     // nodeId | null
      const [selectedHeId, setSelectedHeId] = useState(null); // hệ đang chọn để xem thang độ khó
      ```
      Thay bằng (thêm state `expanded`):
      ```jsx
      const [moving, setMoving] = useState(null);     // nodeId | null
      const [selectedHeId, setSelectedHeId] = useState(null); // hệ đang chọn để xem thang độ khó
      const [expanded, setExpanded] = useState({});   // { [catId]: true } — mặc định {} = gập hết (chỉ thấy các hệ)
      ```

- [ ] Bước 2: Tìm dòng `const cancel = () => { setAdding(null); setRenaming(null); setMoving(null); };`
      NGAY TRƯỚC dòng đó, thêm 2 hàm mở/gập toàn bộ:
      ```jsx
      // Mở/gập toàn bộ cây. "Mở tất cả" = đánh dấu mọi nhánh CÓ con; "Gập tất cả" = xoá hết.
      const expandAll = () => {
        const next = {};
        for (const c of categories) if ((childrenMap[c.id] || []).length) next[c.id] = true;
        setExpanded(next);
      };
      const collapseAll = () => setExpanded({});

      ```

- [ ] Bước 3: Trong đối tượng `ctx`, tìm 2 dòng:
      ```jsx
        adding, renaming, moving,
        selectedHeId,
      ```
      Thay bằng (thêm `expanded` + `toggleExpand`):
      ```jsx
        adding, renaming, moving,
        selectedHeId,
        expanded,
        toggleExpand: (id) => setExpanded((e) => ({ ...e, [id]: !e[id] })),
      ```

- [ ] Bước 4: Vẫn trong `ctx`, tìm dòng:
      ```jsx
        startAdd: (parentId) => { cancel(); setAdding({ parentId, value: '' }); },
      ```
      Thay bằng (tự bung nhánh cha khi thêm con):
      ```jsx
        startAdd: (parentId) => { cancel(); if (parentId) setExpanded((e) => ({ ...e, [parentId]: true })); setAdding({ parentId, value: '' }); },
      ```

- [ ] Bước 5: Lên đầu file, trong component `CategoryNode`, tìm:
      ```jsx
      const CategoryNode = ({ node, depth, ctx, isFirst, isLast }) => {
        const children = ctx.childrenMap[node.id] || [];
        const [hovered, setHovered] = useState(false);
      ```
      Thay bằng (thêm `hasChildren` + `open`):
      ```jsx
      const CategoryNode = ({ node, depth, ctx, isFirst, isLast }) => {
        const children = ctx.childrenMap[node.id] || [];
        const hasChildren = children.length > 0;
        const open = !!ctx.expanded[node.id];
        const [hovered, setHovered] = useState(false);
      ```

- [ ] Bước 6: Trong `CategoryNode`, tìm dòng bullet (dấu ■/•) ở đầu dòng của node:
      ```jsx
              <span style={{ color: depth === 0 ? 'var(--color-cobalt)' : 'var(--color-text-muted)' }}>{depth === 0 ? '■' : '•'}</span>
      ```
      Thay bằng (chèn nút mũi tên hoặc khoảng trống TRƯỚC bullet):
      ```jsx
              {hasChildren ? (
                <button
                  onClick={() => ctx.toggleExpand(node.id)}
                  aria-label={open ? 'Gập nhánh' : 'Mở nhánh'}
                  style={{ ...iconBtn, padding: 0, color: 'var(--color-text-subtle)' }}
                >
                  {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
              ) : (
                <span style={{ width: 15, flexShrink: 0, display: 'inline-block' }} />
              )}
              <span style={{ color: depth === 0 ? 'var(--color-cobalt)' : 'var(--color-text-muted)' }}>{depth === 0 ? '■' : '•'}</span>
      ```

- [ ] Bước 7: Vẫn trong `CategoryNode`, tìm đoạn vẽ nhánh con (gần cuối component):
      ```jsx
            {children.map((child, i) => (
              <CategoryNode key={child.id} node={child} depth={depth + 1} ctx={ctx}
                isFirst={i === 0} isLast={i === children.length - 1} />
            ))}
      ```
      Thay bằng (chỉ vẽ con khi nhánh đang mở):
      ```jsx
            {open && children.map((child, i) => (
              <CategoryNode key={child.id} node={child} depth={depth + 1} ctx={ctx}
                isFirst={i === 0} isLast={i === children.length - 1} />
            ))}
      ```

- [ ] Bước 8: Check it works
      Run: `npx tauri dev`
      You should see: Cài đặt › Quản lý phân loại → cây **chỉ hiện các hệ**, mỗi hệ có mũi tên ▸. Bấm mũi tên → bung/gập nhánh. Bấm **tên** hệ → bảng độ khó bên phải vẫn mở. Bấm "Thêm nhánh con" vào hệ đang gập → hệ tự bung, thấy ô nhập.
      (Nếu chưa muốn mở app ngay, có thể để dồn kiểm ở Task 3.)

- [ ] Bước 9: Save your progress
      Run: `git add src/components/Modals/CategoryManagerModal.jsx && git commit -m "feat(taxonomy): gap/mo tung nhanh cay trong Quan ly phan loai"`

---

### Task 2: Thêm 2 nút "Mở tất cả / Gập tất cả"

**What you'll have when this is done:** Đầu cột cây có 2 nút bấm một phát bung hoặc gập cả cây.

- [ ] Bước 1: Ở đầu file, tìm 2 style dùng chung `iconBtn` và `inputStyle`. NGAY SAU khối `inputStyle` (trước dòng khai báo `InlineInput`), thêm style mới:
      ```jsx
      const miniBtn = {
        background: 'none', border: '1px solid var(--color-border)', cursor: 'pointer',
        color: 'var(--color-text-muted)', padding: '0.15rem 0.5rem', borderRadius: '6px',
        fontSize: '0.72rem', fontWeight: 600,
      };
      ```

- [ ] Bước 2: Tìm khối header của cột cây (nhãn "Cây chuyên đề" + nút "Thêm hệ"):
      ```jsx
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-surface-muted)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cây chuyên đề</span>
              <button onClick={() => ctx.startAdd(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1px solid var(--color-cobalt-border)', backgroundColor: 'var(--color-cobalt-bg)', color: 'var(--color-cobalt)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                <FolderPlus size={15} /> Thêm hệ
              </button>
            </div>
      ```
      Thay bằng (thêm 2 nút mở/gập cạnh nhãn, cho phép xuống dòng khi hẹp):
      ```jsx
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--color-surface-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cây chuyên đề</span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button onClick={expandAll} style={miniBtn} title="Mở tất cả nhánh">Mở tất cả</button>
                  <button onClick={collapseAll} style={miniBtn} title="Gập tất cả nhánh">Gập tất cả</button>
                </div>
              </div>
              <button onClick={() => ctx.startAdd(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1px solid var(--color-cobalt-border)', backgroundColor: 'var(--color-cobalt-bg)', color: 'var(--color-cobalt)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                <FolderPlus size={15} /> Thêm hệ
              </button>
            </div>
      ```

- [ ] Bước 3: Check it works
      Run: `CI=true npm run build`
      You should see: `Compiled successfully`, **0 warning**. (Nếu báo `no-unused-vars` cho `expandAll`/`collapseAll`/`miniBtn` nghĩa là chưa nối đủ ở Bước 2 — so lại.)

- [ ] Bước 4: Save your progress
      Run: `git add src/components/Modals/CategoryManagerModal.jsx && git commit -m "feat(taxonomy): nut Mo tat ca / Gap tat ca cho cay phan loai"`

---

### Task 3: Kiểm tự động + an toàn xuất + nghiệm thu

**What you'll have when this is done:** Bằng chứng cả kho test vẫn xanh, đường xuất `.tex` không đổi, phạm vi sửa đúng 1 file, và Thầy tận mắt nghiệm thu.

- [ ] Bước 1: Chạy toàn bộ bài kiểm
      Run: `npm test -- --watchAll=false`
      You should see: `Tests: <tất cả> passed` — không bài đỏ, gồm **golden export KHÔNG đổi 3/3** (đường xuất không bị chạm; tính năng này không thêm test mới).

- [ ] Bước 2: An toàn xuất đầu-cuối (dù không đụng đường xuất). Trong app (`npx tauri dev`): thêm tạm 1 bài có công thức `$x^2 + y^2 = z^2$`, phân loại vào 1 hệ/nhánh/mức → vào Giỏ → **Xuất file nội dung** ra `D:\check-tree.tex`.
      Mở `D:\check-tree.tex`: công thức `$x^2 + y^2 = z^2$` còn **nguyên vẹn** trong khối `\begin{bt}...\end{bt}`. Xoá bài tạm + file `.tex` sau khi xong.

- [ ] Bước 3: Xác nhận phạm vi sửa đúng như plan
      Run: `git status --short`
      You should see: không còn gì chưa commit ngoài `src-tauri/Cargo.toml` (do CRLF, cố ý không commit).
      Run: `git diff --name-only HEAD~2 HEAD`
      You should see: **chỉ** `src/components/Modals/CategoryManagerModal.jsx` (+ các file docs nếu commit) — KHÔNG có `buildProblemTex.js`, `buildContentFile.js`, `db.js`, `ExportModal.jsx`, hay file Rust.

- [ ] Bước 4: Nghiệm thu GUI (Thầy) — theo checklist mục 7 của spec:
      1. Mở màn → cây gập hết, chỉ thấy hệ, mỗi hệ có mũi tên ▸.
      2. Bấm mũi tên → bung/gập; bấm lại → đảo.
      3. "Mở tất cả" → bung cả cây; "Gập tất cả" → gập về chỉ còn hệ.
      4. Bấm **tên** hệ → bảng độ khó bên phải mở đúng (không lẫn với mũi tên).
      5. "Thêm nhánh con" vào hệ đang gập → hệ tự bung, thấy ô nhập; thêm xong thấy nhánh mới.
      6. Sửa/xoá/di chuyển/đổi vị trí nhánh vẫn như cũ.

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order — don't skip ahead
3. Complete the "Check it works" step before moving to the next task
4. If something doesn't work as expected, stop and describe what you see — don't try random fixes

Say "let's start building" when you're ready to begin Task 1.
