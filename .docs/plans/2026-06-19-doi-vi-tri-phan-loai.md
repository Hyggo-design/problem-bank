# Đổi vị trí (sắp xếp thứ tự) trong Quản lý phân loại — Build Plan

**What we're building:** Nút cho phép Thầy sắp lại thứ tự nhánh chuyên đề, mức độ khó và lớp ngay trên màn hình "Quản lý phân loại"; đồng thời gom các nút thao tác lại cho gọn (chỉ hiện khi rê chuột vào dòng).

**Why:** Để Thầy chủ động sắp xếp danh mục theo ý mình (vd: kéo Lớp 5 về đầu, để "Đại số" trước "Hình học") mà không cần đụng code — và màn hình quản lý bớt rối hơn hiện tại.

**Approach:** Thêm vài hàm "đổi vị trí" vào hook `useTaxonomy` (đánh số lại `position = 0,1,2…` cho cả nhóm anh em theo thứ tự mới). Sau đó sửa giao diện `CategoryManagerModal`: ẩn nút khi không rê chuột, thêm ⬆⬇ cho cây & thang độ khó, ◀▶ cho chip lớp. Làm từng phần, kiểm thử xong mới sang phần kế.

**Thiết kế đã duyệt:** [.docs/specs/2026-06-19-doi-vi-tri-phan-loai-design.md](../specs/2026-06-19-doi-vi-tri-phan-loai-design.md)

**Files we'll create or change:**
- `src/hooks/useTaxonomy.js` — thêm hàm `reorderCategory`, `reorderDifficulty`, `reorderGrade` (sửa)
- `src/components/Modals/CategoryManagerModal.jsx` — hover-reveal + nút đổi vị trí cho cả 3 khu (sửa)
- `D:/tmp/verify_reorder.py` — script kiểm thử logic đánh số lại trên SQLite thật (tạo mới, ngoài repo)

---

## Cách chạy & kiểm thử (đọc trước)

- **Chạy app:** mở terminal trong thư mục dự án, chạy `npx tauri dev`. Cứ **để cửa sổ này chạy suốt** — khi sửa code giao diện, app **tự nạp lại** (hot reload), không cần tắt mở lại.
- **Kiểm tra biên dịch nhanh** (không cần Rust): `CI=false npm run build` → mong đợi dòng `Compiled successfully` (hoặc "Compiled with warnings" nhưng KHÔNG có warning mới từ file mình sửa).
- **Xem lỗi kỹ thuật trong app:** bấm chuột phải trong cửa sổ app → "Inspect" → tab Console (không có dòng đỏ là tốt).
- **An toàn:** kế hoạch này **không** đụng bảng `problems` hay logic xuất LaTeX. Chỉ ghi lại cột `position` của 3 bảng danh mục. Không có nguy cơ mất bài tập.

---

# Task 1: Thêm hàm "đổi vị trí" vào `useTaxonomy` (kèm kiểm thử SQLite)

**What you'll have when this is done:** Hook có 3 hàm mới để đổi thứ tự nhánh/độ khó/lớp; logic đánh số lại đã được kiểm chứng trên SQLite thật.

- [ ] Bước 1: **Viết bài kiểm thử trước.** Tạo file mới `D:/tmp/verify_reorder.py` với nội dung sau (kiểm tra logic "đánh số lại cả nhóm" trên một SQLite thật trong bộ nhớ):
  ```python
  import sqlite3
  db = sqlite3.connect(':memory:')
  db.execute("CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT, parent_id TEXT, position INTEGER)")
  # Nhóm P1 có 3 con với position LỆCH (0,2,4) để test việc đánh số lại;
  # Nhóm P2 để test 'cô lập' (không bị đụng khi sắp nhóm P1).
  rows = [('a','A','P1',0),('b','B','P1',2),('c','C','P1',4),
          ('x','X','P2',0),('y','Y','P2',1)]
  db.executemany("INSERT INTO categories VALUES (?,?,?,?)", rows)

  def reorder(parent, node_id, direction):
      arr = [r[0] for r in db.execute(
          "SELECT id FROM categories WHERE parent_id=? ORDER BY position", (parent,)).fetchall()]
      idx = arr.index(node_id)
      swap = idx-1 if direction=='up' else idx+1
      if swap < 0 or swap >= len(arr): return            # đã ở đầu/cuối -> không làm gì
      arr[idx], arr[swap] = arr[swap], arr[idx]
      for i, cid in enumerate(arr):                       # đánh số lại 0..n-1
          db.execute("UPDATE categories SET position=? WHERE id=?", (i, cid))

  def order(parent):
      return [r[0] for r in db.execute(
          "SELECT id FROM categories WHERE parent_id=? ORDER BY position", (parent,)).fetchall()]

  # Đưa C lên 1 bậc: A,B,C -> A,C,B
  reorder('P1','c','up')
  assert order('P1') == ['a','c','b'], order('P1')
  # position phải sạch 0,1,2 (đã dọn hết lệch)
  pos = [r[0] for r in db.execute("SELECT position FROM categories WHERE parent_id='P1' ORDER BY position").fetchall()]
  assert pos == [0,1,2], pos
  # Nhóm P2 không bị ảnh hưởng
  assert order('P2') == ['x','y'], order('P2')
  # Bấm ⬆ ở mục đầu (A) -> không đổi
  reorder('P1','a','up');  assert order('P1') == ['a','c','b'], order('P1')
  # Bấm ⬇ ở mục cuối (B) -> không đổi
  reorder('P1','b','down'); assert order('P1') == ['a','c','b'], order('P1')
  print("OK reorder: 5/5 assertions passed")
  ```
- [ ] Bước 2: Chạy thử bài kiểm thử:
      Run: `python D:/tmp/verify_reorder.py`
      You should see: `OK reorder: 5/5 assertions passed`
      (Nếu báo `AssertionError` → dừng lại, đừng sửa lung tung, báo lại con số in ra.)
- [ ] Bước 3: **Giờ viết code thật.** Mở `src/hooks/useTaxonomy.js`. Ngay **trước** dòng `return {` (hiện ở khoảng dòng 148), chèn khối sau:
  ```js
  // 8. ĐỔI VỊ TRÍ — đánh số lại position = 0..n-1 cho cả nhóm "anh em" theo thứ tự mới.
  //    Cách này tự dọn mọi lệch/trùng position cũ. `table` là hằng số cố định trong
  //    code (không phải dữ liệu người dùng) nên ghép thẳng vào SQL là an toàn.
  const reorderInGroup = async (table, siblings, id, dir) => {
    try {
      const arr = [...siblings].sort((a, b) => a.position - b.position);
      const idx = arr.findIndex((x) => x.id === id);
      const swapWith = dir === 'up' ? idx - 1 : idx + 1;
      if (idx === -1 || swapWith < 0 || swapWith >= arr.length) return; // đã ở đầu/cuối
      [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
      const db = await getDb();
      for (let i = 0; i < arr.length; i++) {
        await db.execute(`UPDATE ${table} SET position = $1 WHERE id = $2`, [i, arr[i].id]);
      }
      await loadAll();
    } catch (error) {
      console.error('Lỗi đổi vị trí:', error);
    }
  };

  // Đổi vị trí một NHÁNH trong cùng cha (dir: 'up' | 'down')
  const reorderCategory = async (id, dir) => {
    const node = categories.find((c) => c.id === id);
    if (!node) return;
    const siblings = categories.filter((c) => c.parent_id === node.parent_id);
    await reorderInGroup('categories', siblings, id, dir);
  };

  // Đổi vị trí một MỨC ĐỘ KHÓ trong cùng hệ
  const reorderDifficulty = async (id, dir) => {
    const lv = difficulties.find((d) => d.id === id);
    if (!lv) return;
    const siblings = difficulties.filter((d) => d.he_id === lv.he_id);
    await reorderInGroup('difficulty_levels', siblings, id, dir);
  };

  // Đổi vị trí một LỚP (cả danh sách là một nhóm)
  const reorderGrade = async (id, dir) => {
    await reorderInGroup('grades', grades, id, dir);
  };
  ```
- [ ] Bước 4: Trong `return { ... }` của hook, thêm 3 hàm mới vào. Sửa dòng cuối của khối return từ:
  ```js
      addGrade, deleteGrade,
  ```
  thành:
  ```js
      addGrade, deleteGrade,
      reorderCategory, reorderDifficulty, reorderGrade,
  ```
- [ ] Bước 5: Check it works — chạy `CI=false npm run build`. You should see: `Compiled successfully` (không lỗi đỏ, không warning mới từ `useTaxonomy.js`).
- [ ] Bước 6: Save your progress
      Run: `git add . && git commit -m "feat(taxonomy): reorder functions (renumber group positions)"`

---

# Task 2: Cây chuyên đề — ẩn nút khi không rê chuột + thêm ⬆⬇

**What you'll have when this is done:** Cây sạch (chỉ hiện tên); rê vào dòng nào mới hiện nút của dòng đó, gồm 2 nút ⬆⬇ để đổi thứ tự trong cùng cha.

- [ ] Bước 1: Mở `src/components/Modals/CategoryManagerModal.jsx`. Thêm 4 icon mũi tên vào dòng import (dòng 2). Sửa từ:
  ```js
  import { X, FolderTree, FolderPlus, Plus, Pencil, Trash2, Check, FolderInput, Gauge, GraduationCap } from 'lucide-react';
  ```
  thành:
  ```js
  import { X, FolderTree, FolderPlus, Plus, Pencil, Trash2, Check, FolderInput, Gauge, GraduationCap, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
  ```
- [ ] Bước 2: Trong component `CategoryNode`, cho nó nhận thêm 2 prop `isFirst`, `isLast` và một state `hovered`. Sửa dòng khai báo (dòng 42) từ:
  ```js
  const CategoryNode = ({ node, depth, ctx }) => {
    const children = ctx.childrenMap[node.id] || [];
  ```
  thành:
  ```js
  const CategoryNode = ({ node, depth, ctx, isFirst, isLast }) => {
    const children = ctx.childrenMap[node.id] || [];
    const [hovered, setHovered] = useState(false);
  ```
- [ ] Bước 3: Cho dòng (row) bật/tắt `hovered`. Tìm 2 dòng `onMouseEnter`/`onMouseLeave` của row (khoảng dòng 62–63), sửa thành:
  ```js
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; setHovered(true); }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; setHovered(false); }}
  ```
- [ ] Bước 4: Bọc nhóm 4 nút thao tác cũ trong điều kiện `hovered`, và thêm ⬆⬇ vào đầu nhóm. Tìm khối 4 nút (Plus / Pencil / FolderInput / Trash2, khoảng dòng 89–92) và thay **toàn bộ 4 dòng đó** bằng:
  ```js
            {hovered && (
              <>
                <button onClick={() => ctx.reorderCategory(node.id, 'up')} disabled={isFirst} title="Lên trên"
                  style={{ ...iconBtn, opacity: isFirst ? 0.25 : 1, cursor: isFirst ? 'default' : 'pointer' }}><ChevronUp size={16} /></button>
                <button onClick={() => ctx.reorderCategory(node.id, 'down')} disabled={isLast} title="Xuống dưới"
                  style={{ ...iconBtn, opacity: isLast ? 0.25 : 1, cursor: isLast ? 'default' : 'pointer' }}><ChevronDown size={16} /></button>
                <button onClick={() => ctx.startAdd(node.id)} title="Thêm nhánh con" style={iconBtn}><Plus size={16} /></button>
                <button onClick={() => ctx.startRename(node)} title="Đổi tên" style={iconBtn}><Pencil size={15} /></button>
                <button onClick={() => ctx.startMove(node.id)} title="Di chuyển" style={iconBtn}><FolderInput size={15} /></button>
                <button onClick={() => ctx.remove(node)} title="Xóa" style={{ ...iconBtn, color: '#f87171' }}><Trash2 size={15} /></button>
              </>
            )}
  ```
- [ ] Bước 5: Truyền `isFirst`/`isLast` xuống khi render. (a) Trong `CategoryNode`, chỗ render các con (khoảng dòng 129–131), sửa thành:
  ```js
        {children.map((child, i) => (
          <CategoryNode key={child.id} node={child} depth={depth + 1} ctx={ctx}
            isFirst={i === 0} isLast={i === children.length - 1} />
        ))}
  ```
  (b) Trong modal, chỗ render các hệ gốc `roots.map(...)` (khoảng dòng 327–329), sửa thành:
  ```js
                  roots.map((node, i) => (
                    <CategoryNode key={node.id} node={node} depth={0} ctx={ctx}
                      isFirst={i === 0} isLast={i === roots.length - 1} />
                  ))
  ```
- [ ] Bước 6: Nối hàm vào `ctx`. Tìm object `ctx = { ... }` (khoảng dòng 263), thêm một dòng (vd ngay sau `pathOf: ...`):
  ```js
      reorderCategory: (id, dir) => tax.reorderCategory(id, dir),
  ```
- [ ] Bước 7: Check it works — `CI=false npm run build` phải `Compiled successfully`. Rồi trong app (đang chạy `npx tauri dev`): mở "Quản lý phân loại"; cây chỉ hiện tên, rê vào một hệ thì hiện nút; thêm 2–3 nhánh con vào một hệ, bấm ⬆⬇ thấy chúng đổi chỗ; nhánh trên cùng có ⬆ mờ, dưới cùng có ⬇ mờ. Đóng app mở lại → thứ tự vẫn giữ.
- [ ] Bước 8: Save your progress
      Run: `git add . && git commit -m "feat(taxonomy): hover-reveal + reorder buttons on category tree"`

---

# Task 3: Thang độ khó — ẩn nút khi không rê + thêm ⬆⬇

**What you'll have when this is done:** Trong panel thang độ khó của một hệ, mỗi mức chỉ hiện nút khi rê chuột, và có ⬆⬇ để sắp lại thứ tự các mức.

- [ ] Bước 1: Trong `CategoryManagerModal.jsx`, tìm component `DifficultyPanel` (khoảng dòng 138). Cho nó nhận thêm prop `onReorder` và một state `hoveredId`. Sửa từ:
  ```js
  const DifficultyPanel = ({ he, levels, onAdd, onRename, onDelete }) => {
    const [newName, setNewName] = useState('');
    const [renaming, setRenaming] = useState(null); // { id, value }
  ```
  thành:
  ```js
  const DifficultyPanel = ({ he, levels, onAdd, onRename, onDelete, onReorder }) => {
    const [newName, setNewName] = useState('');
    const [renaming, setRenaming] = useState(null); // { id, value }
    const [hoveredId, setHoveredId] = useState(null);
  ```
- [ ] Bước 2: Cho mỗi dòng mức độ khó bật/tắt `hoveredId`. Tìm dòng `<div key={lv.id} style={{ display: 'flex', ... backgroundColor: '#f8fafc', borderRadius: '7px' }}>` (khoảng dòng 163), thêm 2 thuộc tính sự kiện vào ngay sau `key={lv.id}`:
  ```js
              onMouseEnter={() => setHoveredId(lv.id)}
              onMouseLeave={() => setHoveredId(null)}
  ```
- [ ] Bước 3: Bọc nút rename/delete trong `hoveredId` và thêm ⬆⬇. Tìm khối `else` hiện 2 nút (Pencil + Trash2, khoảng dòng 168–172) và thay **cả khối** (từ `<>` tới `</>`) bằng:
  ```js
                <>
                  <span style={{ flex: 1, fontSize: '0.9rem', color: '#1e293b' }}>{lv.name}</span>
                  {hoveredId === lv.id && (
                    <>
                      <button onClick={() => onReorder(lv.id, 'up')} disabled={i === 0} title="Lên trên"
                        style={{ ...iconBtn, opacity: i === 0 ? 0.25 : 1, cursor: i === 0 ? 'default' : 'pointer' }}><ChevronUp size={14} /></button>
                      <button onClick={() => onReorder(lv.id, 'down')} disabled={i === levels.length - 1} title="Xuống dưới"
                        style={{ ...iconBtn, opacity: i === levels.length - 1 ? 0.25 : 1, cursor: i === levels.length - 1 ? 'default' : 'pointer' }}><ChevronDown size={14} /></button>
                      <button onClick={() => setRenaming({ id: lv.id, value: lv.name })} title="Đổi tên" style={iconBtn}><Pencil size={14} /></button>
                      <button onClick={() => { if (window.confirm(`Xóa mức “${lv.name}”? Các bài đang gắn mức này (ở hệ ${he.name}) sẽ bị gỡ độ khó.`)) onDelete(lv.id); }} title="Xóa" style={{ ...iconBtn, color: '#f87171' }}><Trash2 size={14} /></button>
                    </>
                  )}
                </>
  ```
- [ ] Bước 4: Truyền hàm vào panel. Tìm chỗ render `<DifficultyPanel ... onDelete={tax.deleteDifficulty} />` (khoảng dòng 337–344), thêm một dòng prop:
  ```js
                  onReorder={tax.reorderDifficulty}
  ```
- [ ] Bước 5: Check it works — `CI=false npm run build` phải sạch. Trong app: bấm một hệ để mở thang độ khó; rê vào một mức thấy hiện ⬆⬇; bấm sắp lại; mức đầu ⬆ mờ, mức cuối ⬇ mờ; đóng/mở app thứ tự vẫn giữ.
- [ ] Bước 6: Save your progress
      Run: `git add . && git commit -m "feat(taxonomy): reorder buttons for per-system difficulty"`

---

# Task 4: Danh sách Lớp — ẩn nút khi không rê + thêm ◀▶

**What you'll have when this is done:** Mỗi chip lớp chỉ hiện nút khi rê chuột, có ◀▶ để dời lớp sớm/muộn hơn (vd kéo Lớp 5 về đầu).

- [ ] Bước 1: Tìm component `GradesPanel` (khoảng dòng 188). Cho nhận thêm prop `onReorder` và state `hoveredId`. Sửa từ:
  ```js
  const GradesPanel = ({ grades, onAdd, onDelete }) => {
    const [newName, setNewName] = useState('');
  ```
  thành:
  ```js
  const GradesPanel = ({ grades, onAdd, onDelete, onReorder }) => {
    const [newName, setNewName] = useState('');
    const [hoveredId, setHoveredId] = useState(null);
  ```
- [ ] Bước 2: Thay cả khối render chip. Tìm `{grades.map((g) => ( ... ))}` (khoảng dòng 204–213) và thay **toàn bộ** bằng:
  ```js
          {grades.map((g, i) => (
            <span key={g.id}
              onMouseEnter={() => setHoveredId(g.id)} onMouseLeave={() => setHoveredId(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.6rem', borderRadius: '999px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155' }}>
              {g.name}
              {hoveredId === g.id && (
                <>
                  <button onClick={() => onReorder(g.id, 'up')} disabled={i === 0} title="Dời sớm hơn"
                    style={{ ...iconBtn, padding: '0.1rem', opacity: i === 0 ? 0.25 : 1, cursor: i === 0 ? 'default' : 'pointer' }}><ChevronLeft size={14} /></button>
                  <button onClick={() => onReorder(g.id, 'down')} disabled={i === grades.length - 1} title="Dời muộn hơn"
                    style={{ ...iconBtn, padding: '0.1rem', opacity: i === grades.length - 1 ? 0.25 : 1, cursor: i === grades.length - 1 ? 'default' : 'pointer' }}><ChevronRight size={14} /></button>
                  <button onClick={() => { if (window.confirm(`Xóa “${g.name}”? Các bài đang gắn lớp này sẽ bị gỡ.`)) onDelete(g.id); }} title="Xóa lớp"
                    style={{ ...iconBtn, padding: '0.1rem', color: '#94a3b8' }}><X size={14} /></button>
                </>
              )}
            </span>
          ))}
  ```
- [ ] Bước 3: Truyền hàm vào panel. Tìm `<GradesPanel grades={grades} onAdd={tax.addGrade} onDelete={tax.deleteGrade} />` (khoảng dòng 353), thêm prop `onReorder`:
  ```js
              <GradesPanel grades={grades} onAdd={tax.addGrade} onDelete={tax.deleteGrade} onReorder={tax.reorderGrade} />
  ```
- [ ] Bước 4: Check it works — `CI=false npm run build` phải sạch. Trong app: rê vào một chip lớp thấy hiện ◀▶ và nút xóa; bấm ◀▶ để dời; lớp đầu ◀ mờ, lớp cuối ▶ mờ; thử kéo "Lớp 5" về đầu; đóng/mở app thứ tự vẫn giữ.
- [ ] Bước 5: Save your progress
      Run: `git add . && git commit -m "feat(taxonomy): reorder (left/right) for grade chips"`

---

# Task 5: Kiểm thử tổng + an toàn LaTeX + ghi nhật ký

**What you'll have when this is done:** Toàn bộ tính năng chạy mượt trong app, biên dịch sạch, xác nhận xuất LaTeX không bị ảnh hưởng, và có một mục nhật ký ngắn.

- [ ] Bước 1: Trong app (`npx tauri dev`), làm một lượt tổng: sắp lại thứ tự 3 hệ; trong 1 hệ sắp lại nhánh con; sắp lại thang độ khó; kéo Lớp 5 về đầu. Đóng app, mở lại → **mọi thứ tự vẫn đúng** như vừa đặt.
- [ ] Bước 2: **An toàn LaTeX (sanity check).** Tính năng này không đụng đề bài/xuất, nhưng vẫn kiểm cho chắc: thêm một bài có công thức `$x^2 + y^2 = z^2$` (gắn đại một phân loại), đưa vào giỏ → Xuất đề `.tex`. Mở file `.tex` bằng Notepad, xác nhận dòng `$x^2 + y^2 = z^2$` xuất hiện **nguyên vẹn** trong `\begin{bt}...\end{bt}`. Nếu sai → dừng, báo lại.
- [ ] Bước 3: Biên dịch lần cuối: `CI=false npm run build` → `Compiled successfully`, không warning mới.
- [ ] Bước 4: Ghi nhật ký — tạo file `.docs/03_2026_06_19.md` ghi ngắn gọn: đã thêm tính năng đổi vị trí (hover-reveal + ⬆⬇ cho cây/độ khó, ◀▶ cho lớp), cách lưu (đánh số lại nhóm), kết quả kiểm thử. (Theo mẫu các nhật ký trước.)
- [ ] Bước 5: Save your progress
      Run: `git add . && git commit -m "chore(taxonomy): verify reorder + latex smoke test + journal"`

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order — don't skip ahead
3. Complete the "Check it works" step before moving to the next task
4. If something doesn't work as expected, stop and describe what you see — don't try random fixes

Say "let's start building" when you're ready to begin Task 1.
