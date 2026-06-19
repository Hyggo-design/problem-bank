# Hệ Thống Phân Loại (Taxonomy) — Build Plan

**What we're building:** Một hệ thống phân loại bài tập điều khiển bằng dữ liệu — cây chuyên đề nhiều tầng (gốc = hệ), độ khó theo từng hệ, lớp và tag — Thầy tự sửa qua giao diện, không cần đụng code.

**Why:** Để Thầy tổ chức bài tập linh hoạt cho nhiều hệ dạy (THCS, THPT, Chuyên, Olympic) và thay đổi cách sắp xếp bất cứ lúc nào mà không phải sửa code.

**Approach:** Thêm các bảng mới vào SQLite (không xóa bảng cũ — an toàn), thêm một hook đọc/ghi phân loại, một màn hình quản lý phân loại, một bộ điều khiển phân loại tái sử dụng trong các form, rồi cập nhật lọc/tìm và Smart Import. Làm theo 6 giai đoạn, mỗi việc kiểm thử xong mới sang việc kế tiếp.

**Thiết kế gốc đã duyệt:** [.docs/specs/2026-06-19-he-thong-phan-loai-design.md](../specs/2026-06-19-he-thong-phan-loai-design.md)

**Files we'll create or change:**
- `src/utils/db.js` — thêm bảng mới + seed 4 hệ (sửa)
- `src/hooks/useTaxonomy.js` — đọc/ghi cây, độ khó, lớp (tạo mới)
- `src/hooks/useProblems.js` — đọc/ghi phân loại của từng bài (sửa)
- `src/components/Modals/CategoryManagerModal.jsx` — màn hình quản lý phân loại (tạo mới)
- `src/components/ClassificationPicker.jsx` — bộ điều khiển phân loại tái sử dụng (tạo mới)
- `src/components/Modals/AddProblemModal.jsx`, `EditProblemModal.jsx`, `SmartImportModal.jsx` — gắn bộ điều khiển (sửa)
- `src/components/ControlsRow.jsx`, `DataGrid.jsx` — lọc/hiển thị theo phân loại (sửa)
- `src/components/Toolbar.jsx` + `src/App.jsx` — nút mở màn hình quản lý (sửa)

---

## Cách chạy & kiểm thử app (đọc trước)

- **Chạy app để kiểm thử:** mở terminal trong thư mục dự án, chạy:
  ```
  npx tauri dev
  ```
  > ⚠️ App này dùng cơ sở dữ liệu qua Tauri, nên **phải chạy bằng `npx tauri dev`** chứ KHÔNG phải `npm start` (chạy `npm start` thì phần lưu trữ sẽ không hoạt động). Lần đầu chạy sẽ biên dịch Rust nên hơi lâu (vài phút); các lần sau nhanh hơn.
- **Cửa sổ app** tên "Ngân hàng câu hỏi" sẽ hiện ra. Để xem lỗi kỹ thuật: bấm chuột phải trong app → "Inspect" → tab Console.
- **File cơ sở dữ liệu** nằm ở: `C:\Users\Admin\AppData\Roaming\com.tauri.dev\problem_bank.db`
- **Quyết định an toàn dữ liệu:** kế hoạch này chỉ **THÊM** bảng mới, **không xóa** bảng `problems` cũ. Dữ liệu test hiện có vẫn còn nguyên (chỉ là chưa gắn phân loại mới). Vì vậy không cần lo mất dữ liệu. Nếu muốn chắc chắn, đóng app rồi copy file `problem_bank.db` ở trên ra một chỗ khác trước khi bắt đầu.

---

# GIAI ĐOẠN 1 — Tầng dữ liệu (database)

### Task 1: Thêm các bảng phân loại mới vào database

**What you'll have when this is done:** Database có đủ 6 bảng mới để chứa cây phân loại, độ khó, lớp và liên kết với bài tập.

- [ ] Bước 1: Mở `src/utils/db.js`. Tìm đoạn tạo 3 INDEX cũ (`idx_topic`, `idx_level`, `idx_date`). **Ngay sau** đoạn đó (trước `return db;`), thêm khối tạo bảng mới:
  ```js
  // === BẢNG PHÂN LOẠI MỚI (taxonomy) ===
  await db.execute(`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT,
    position INTEGER DEFAULT 0, created_at TEXT
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS difficulty_levels (
    id TEXT PRIMARY KEY, he_id TEXT NOT NULL, name TEXT NOT NULL, position INTEGER DEFAULT 0
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS grades (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, position INTEGER DEFAULT 0
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS problem_categories (
    problem_id TEXT NOT NULL, category_id TEXT NOT NULL,
    PRIMARY KEY (problem_id, category_id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS problem_difficulties (
    problem_id TEXT NOT NULL, he_id TEXT NOT NULL, difficulty_id TEXT NOT NULL,
    PRIMARY KEY (problem_id, he_id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS problem_grades (
    problem_id TEXT NOT NULL, grade_id TEXT NOT NULL,
    PRIMARY KEY (problem_id, grade_id)
  )`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_cat_parent ON categories(parent_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_diff_he ON difficulty_levels(he_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_pc_problem ON problem_categories(problem_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_pc_category ON problem_categories(category_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_pd_problem ON problem_difficulties(problem_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_pg_problem ON problem_grades(problem_id);`);
  ```
- [ ] Bước 2: Chạy `npx tauri dev`. App mở lên bình thường, không có lỗi đỏ trong Console.
- [ ] Bước 3: Check it works — trong Console gõ kiểm tra (hoặc để Task 2 xác nhận gián tiếp): các bài tập test cũ vẫn hiển thị đầy đủ → chứng tỏ không mất dữ liệu.
- [ ] Bước 4: Save your progress — `git add . && git commit -m "feat(taxonomy): add classification tables"`

### Task 2: Tự động tạo sẵn 4 hệ mặc định khi database trống

**What you'll have when this is done:** Lần đầu chạy, app tự có 4 hệ (THCS, THPT, Chuyên, Olympic), mỗi hệ có thang độ khó mặc định, và danh sách lớp 6–12.

- [ ] Bước 1: Trong `src/utils/db.js`, thêm hàm seed (đặt ngoài `getDb`, cùng file):
  ```js
  const seedTaxonomy = async (db) => {
    const rows = await db.select('SELECT COUNT(*) AS n FROM categories');
    if (rows[0].n > 0) return; // đã có dữ liệu phân loại → không seed lại
    const heList = ['Toán THCS', 'Toán THPT', 'Toán Chuyên', 'Olympic'];
    const diffDefault = ['Cơ bản', 'Trung bình', 'Nâng cao'];
    for (let i = 0; i < heList.length; i++) {
      const heId = crypto.randomUUID();
      await db.execute(
        'INSERT INTO categories (id, name, parent_id, position, created_at) VALUES ($1,$2,NULL,$3,$4)',
        [heId, heList[i], i, new Date().toISOString()]
      );
      for (let j = 0; j < diffDefault.length; j++) {
        await db.execute(
          'INSERT INTO difficulty_levels (id, he_id, name, position) VALUES ($1,$2,$3,$4)',
          [crypto.randomUUID(), heId, diffDefault[j], j]
        );
      }
    }
    for (let g = 6; g <= 12; g++) {
      await db.execute('INSERT INTO grades (id, name, position) VALUES ($1,$2,$3)',
        [crypto.randomUUID(), 'Lớp ' + g, g]);
    }
  };
  ```
- [ ] Bước 2: Gọi `await seedTaxonomy(db);` ngay trước `return db;` trong `getDb`.
- [ ] Bước 3: Chạy `npx tauri dev`.
- [ ] Bước 4: Check it works — mở Console, gõ lệnh kiểm tra nhanh (hoặc đợi Task 6 xem trên giao diện). Kỳ vọng: bảng `categories` có đúng 4 dòng, `grades` có 7 dòng.
- [ ] Bước 5: Save — `git add . && git commit -m "feat(taxonomy): seed 4 default systems"`

### Task 3: Tạo hook `useTaxonomy` — phần ĐỌC dữ liệu

**What you'll have when this is done:** Một "thư ký" chuyên đọc cây phân loại, thang độ khó và danh sách lớp để các màn hình dùng chung.

- [ ] Bước 1: Tạo file mới `src/hooks/useTaxonomy.js` với nội dung đọc dữ liệu:
  ```js
  import { useState, useEffect, useCallback } from 'react';
  import { getDb } from '../utils/db';

  export const useTaxonomy = () => {
    const [categories, setCategories] = useState([]); // [{id,name,parent_id,position}]
    const [difficulties, setDifficulties] = useState([]); // [{id,he_id,name,position}]
    const [grades, setGrades] = useState([]);

    const loadAll = useCallback(async () => {
      const db = await getDb();
      setCategories(await db.select('SELECT * FROM categories ORDER BY position'));
      setDifficulties(await db.select('SELECT * FROM difficulty_levels ORDER BY position'));
      setGrades(await db.select('SELECT * FROM grades ORDER BY position'));
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    return { categories, difficulties, grades, reload: loadAll };
  };
  ```
- [ ] Bước 2: Thêm 2 hàm tiện ích (cùng file, ngoài hook) dùng nhiều lần sau này:
  ```js
  // Tìm hệ (nút gốc) của một nhánh bất kỳ
  export const getRootHeId = (catId, parentMap) => {
    let cur = catId;
    while (parentMap[cur]) cur = parentMap[cur];
    return cur;
  };
  // Lấy nhánh đó và TẤT CẢ nhánh con bên dưới
  export const getDescendantIds = (rootId, childrenMap) => {
    const out = [rootId]; const stack = [rootId];
    while (stack.length) {
      const cur = stack.pop();
      for (const c of (childrenMap[cur] || [])) { out.push(c); stack.push(c); }
    }
    return out;
  };
  ```
- [ ] Bước 3: Check it works — tạm thời trong `App.jsx` gọi `const tax = useTaxonomy();` và `console.log(tax.categories)`. Chạy app, Console in ra mảng 4 hệ. Sau đó xóa dòng log tạm.
- [ ] Bước 4: Save — `git add . && git commit -m "feat(taxonomy): add useTaxonomy read hook"`

### Task 4: `useTaxonomy` — thêm/sửa/xóa/di chuyển NHÁNH

**What you'll have when this is done:** Có thể tạo, đổi tên, xóa và chuyển nhánh trong cây (chưa có giao diện, chỉ là hàm).

- [ ] Bước 1: Trong `useTaxonomy`, thêm các hàm (nhớ `await reload()` sau mỗi thao tác để giao diện cập nhật):
  ```js
  const addCategory = async (name, parentId = null) => {
    const db = await getDb();
    const sib = await db.select('SELECT COUNT(*) AS n FROM categories WHERE parent_id IS $1', [parentId]);
    await db.execute('INSERT INTO categories (id,name,parent_id,position,created_at) VALUES ($1,$2,$3,$4,$5)',
      [crypto.randomUUID(), name.trim(), parentId, sib[0].n, new Date().toISOString()]);
    await loadAll();
  };
  const renameCategory = async (id, name) => {
    const db = await getDb();
    await db.execute('UPDATE categories SET name=$1 WHERE id=$2', [name.trim(), id]);
    await loadAll();
  };
  const deleteCategory = async (id) => {
    const db = await getDb();
    // Gỡ nhãn khỏi các bài, KHÔNG xóa bài
    await db.execute('DELETE FROM problem_categories WHERE category_id=$1', [id]);
    await db.execute('DELETE FROM categories WHERE id=$1', [id]);
    await loadAll();
  };
  const moveCategory = async (id, newParentId) => {
    const db = await getDb();
    await db.execute('UPDATE categories SET parent_id=$1 WHERE id=$2', [newParentId, id]);
    await loadAll();
  };
  ```
  Thêm `addCategory, renameCategory, deleteCategory, moveCategory` vào phần `return {...}` của hook.
- [ ] Bước 2: Lưu ý xóa an toàn — `deleteCategory` chỉ gỡ liên kết `problem_categories`, **không** đụng bảng `problems`. (Cảnh báo trước khi xóa sẽ làm ở giao diện, Task 7.)
- [ ] Bước 3: Check it works — tạm gọi `tax.addCategory('Đạo hàm', <id của Toán THPT>)` một lần qua Console, chạy lại, thấy nhánh mới xuất hiện trong `tax.categories`. Xóa thử để dọn.
- [ ] Bước 4: Save — `git add . && git commit -m "feat(taxonomy): category CRUD"`

### Task 5: `useTaxonomy` — quản lý ĐỘ KHÓ (theo hệ) và LỚP

**What you'll have when this is done:** Có hàm thêm/sửa/xóa mức độ khó cho từng hệ, và thêm/sửa/xóa lớp.

- [ ] Bước 1: Thêm vào `useTaxonomy`:
  ```js
  const addDifficulty = async (heId, name) => {
    const db = await getDb();
    const sib = await db.select('SELECT COUNT(*) AS n FROM difficulty_levels WHERE he_id=$1', [heId]);
    await db.execute('INSERT INTO difficulty_levels (id,he_id,name,position) VALUES ($1,$2,$3,$4)',
      [crypto.randomUUID(), heId, name.trim(), sib[0].n]); await loadAll();
  };
  const renameDifficulty = async (id, name) => {
    const db = await getDb();
    await db.execute('UPDATE difficulty_levels SET name=$1 WHERE id=$2', [name.trim(), id]); await loadAll();
  };
  const deleteDifficulty = async (id) => {
    const db = await getDb();
    await db.execute('DELETE FROM problem_difficulties WHERE difficulty_id=$1', [id]);
    await db.execute('DELETE FROM difficulty_levels WHERE id=$1', [id]); await loadAll();
  };
  const addGrade = async (name) => {
    const db = await getDb();
    const n = await db.select('SELECT COUNT(*) AS n FROM grades');
    await db.execute('INSERT INTO grades (id,name,position) VALUES ($1,$2,$3)',
      [crypto.randomUUID(), name.trim(), n[0].n]); await loadAll();
  };
  const deleteGrade = async (id) => {
    const db = await getDb();
    await db.execute('DELETE FROM problem_grades WHERE grade_id=$1', [id]);
    await db.execute('DELETE FROM grades WHERE id=$1', [id]); await loadAll();
  };
  ```
  Nhớ thêm tất cả vào `return {...}`.
- [ ] Bước 2: Check it works — qua Console thử `tax.addDifficulty(<id hệ Chuyên>, 'Rất khó')`, thấy xuất hiện trong `tax.difficulties`.
- [ ] Bước 3: Save — `git add . && git commit -m "feat(taxonomy): difficulty & grade CRUD"`

---

# GIAI ĐOẠN 2 — Màn hình "Quản lý phân loại"

> Component mới: `src/components/Modals/CategoryManagerModal.jsx`. Mở từ một nút trong Toolbar. Toàn bộ giai đoạn này chỉ dùng các hàm đã viết ở Giai đoạn 1.

### Task 6: Khung màn hình quản lý + hiển thị cây

**What you'll have when this is done:** Một cửa sổ mở ra hiện 4 hệ và các nhánh con (chưa sửa được, chỉ xem).

- [ ] Bước 1: Tạo `CategoryManagerModal.jsx`: nhận `useTaxonomy()`, dựng `childrenMap` (parent_id → các con) từ `categories`, render đệ quy thành cây thụt lề. Mỗi nút hiện tên + (sau này) các nút thao tác.
- [ ] Bước 2: Thêm nút "Quản lý phân loại" vào `src/components/Toolbar.jsx`; trong `App.jsx` thêm state `showCategoryManager` và render modal khi bật.
- [ ] Bước 3: Check it works — chạy app, bấm "Quản lý phân loại", thấy 4 hệ: Toán THCS, Toán THPT, Toán Chuyên, Olympic.
- [ ] Bước 4: Save — `git add . && git commit -m "feat(taxonomy): category manager skeleton + tree view"`

### Task 7: Thêm/đổi tên/xóa/di chuyển nhánh trên giao diện

**What you'll have when this is done:** Thầy dựng được cây thật bằng tay: thêm nhánh con, đổi tên, xóa (có cảnh báo), chuyển nhánh.

- [ ] Bước 1: Mỗi nút trong cây thêm các nút nhỏ: **➕** (hỏi tên rồi `addCategory(name, nodeId)`), **✏️** (hỏi tên mới rồi `renameCategory`), **🗑️** (xác nhận rồi `deleteCategory`). Ở tầng trên cùng có nút "➕ Thêm hệ" (`addCategory(name, null)`).
- [ ] Bước 2: Di chuyển nhánh: mỗi nút có ô chọn "Chuyển vào…" liệt kê các nhánh khác → `moveCategory(id, newParentId)`. (Chưa làm kéo-thả.)
- [ ] Bước 3: Cảnh báo xóa an toàn — trước khi xóa, `window.confirm('Xóa nhánh này? Các bài đang gắn sẽ bị gỡ nhãn nhưng KHÔNG bị xóa.')`.
- [ ] Bước 4: Check it works — dựng thử: Toán THPT → thêm "Đạo hàm" → thêm con "Cực trị" → đổi tên → xóa. Quan sát cây cập nhật tức thì.
- [ ] Bước 5: Save — `git add . && git commit -m "feat(taxonomy): edit tree from UI"`

### Task 8: Bảng thang độ khó theo từng hệ

**What you'll have when this is done:** Chọn một hệ thì thấy và sửa được thang độ khó riêng của hệ đó.

- [ ] Bước 1: Trong modal, khi bấm chọn một hệ (nút gốc), hiện panel bên phải: danh sách `difficulties` lọc theo `he_id`, mỗi mức có nút đổi tên/xóa, dưới cùng có ô "+ thêm mức".
- [ ] Bước 2: Nối nút với `addDifficulty(heId, name)`, `renameDifficulty`, `deleteDifficulty`.
- [ ] Bước 3: Check it works — chọn hệ Chuyên, thêm "Rất khó", đổi tên "Cơ bản" → "Dễ", xóa một mức. Quan sát cập nhật.
- [ ] Bước 4: Save — `git add . && git commit -m "feat(taxonomy): per-system difficulty editor"`

### Task 9: Quản lý danh sách Lớp

**What you'll have when this is done:** Sửa được danh sách lớp dùng chung.

- [ ] Bước 1: Thêm một khu "Lớp" trong modal: liệt kê `grades`, mỗi lớp có nút xóa, có ô "+ thêm lớp" → `addGrade`, `deleteGrade`.
- [ ] Bước 2: Check it works — thêm "Lớp chuyên", xóa, thấy cập nhật.
- [ ] Bước 3: Save — `git add . && git commit -m "feat(taxonomy): grade list management"`

---

# GIAI ĐOẠN 3 — Bộ điều khiển phân loại & form nhập/sửa

### Task 10: `ClassificationPicker` — cây tick chọn nhánh + ô lọc nhanh

**What you'll have when this is done:** Một thành phần tái sử dụng để tick chọn một/nhiều nhánh, có ô gõ lọc.

- [ ] Bước 1: Tạo `src/components/ClassificationPicker.jsx`. Props: `value` (gồm `categoryIds`, `difficultyByHe`, `gradeIds`), `onChange`. Dùng `useTaxonomy()` để lấy cây.
- [ ] Bước 2: Render cây có checkbox cho từng nút; tick/bỏ tick cập nhật `categoryIds`. Thêm ô input lọc: gõ chữ thì chỉ hiện các nút có tên khớp (và cha của chúng).
- [ ] Bước 3: Check it works — tạm đặt `<ClassificationPicker>` vào `AddProblemModal`, tick vài nhánh, `console.log` thấy `categoryIds` đúng.
- [ ] Bước 4: Save — `git add . && git commit -m "feat(taxonomy): ClassificationPicker tree + filter"`

### Task 11: `ClassificationPicker` — ô độ khó hiện theo từng hệ

**What you'll have when this is done:** Tick nhánh ở hệ nào thì hiện ô chọn độ khó của hệ đó.

- [ ] Bước 1: Từ `categoryIds`, tính `parentMap` rồi dùng `getRootHeId` để ra danh sách hệ riêng biệt đang được chạm tới.
  ```js
  const parentMap = Object.fromEntries(categories.map(c => [c.id, c.parent_id]));
  const heIds = [...new Set(value.categoryIds.map(id => getRootHeId(id, parentMap)))];
  ```
- [ ] Bước 2: Với mỗi `heId`, render một ô chọn (dropdown) gồm các `difficulties` của hệ đó; chọn xong cập nhật `difficultyByHe[heId]`. Nếu bỏ hết nhánh của một hệ thì xóa độ khó của hệ đó.
- [ ] Bước 3: Check it works — tick 1 nhánh Chuyên + 1 nhánh THPT → hiện đúng 2 ô độ khó với 2 thang khác nhau.
- [ ] Bước 4: Save — `git add . && git commit -m "feat(taxonomy): per-system difficulty in picker"`

### Task 12: `ClassificationPicker` — chip Lớp + ô Tag tự do

**What you'll have when this is done:** Chọn nhiều lớp dạng chip và gõ tag tự do.

- [ ] Bước 1: Render `grades` thành các chip bấm để chọn/bỏ → cập nhật `gradeIds`. Thêm ô text tag tự do (như form hiện tại).
- [ ] Bước 2: Check it works — chọn Lớp 9 + Lớp 10, gõ tag "thi thử", thấy state đúng.
- [ ] Bước 3: Save — `git add . && git commit -m "feat(taxonomy): grade chips + free tags in picker"`

### Task 13: Gắn `ClassificationPicker` vào form Thêm bài + lưu phân loại

**What you'll have when this is done:** Thêm một bài mới kèm phân loại đầy đủ, lưu xuống database, và **xác nhận xuất LaTeX vẫn đúng**.

- [ ] Bước 1: Trong `AddProblemModal.jsx`, bỏ 2 ô "Chuyên đề" và "Độ khó" cũ, thay bằng `<ClassificationPicker>`. (Ô LaTeX đề bài, lời giải, loại câu giữ nguyên.)
- [ ] Bước 2: Trong `src/hooks/useProblems.js`, thêm hàm lưu phân loại (xóa-rồi-ghi để dùng được cả khi sửa):
  ```js
  const saveClassification = async (db, problemId, cls) => {
    await db.execute('DELETE FROM problem_categories WHERE problem_id=$1', [problemId]);
    await db.execute('DELETE FROM problem_difficulties WHERE problem_id=$1', [problemId]);
    await db.execute('DELETE FROM problem_grades WHERE problem_id=$1', [problemId]);
    for (const cid of (cls.categoryIds||[]))
      await db.execute('INSERT INTO problem_categories (problem_id,category_id) VALUES ($1,$2)', [problemId, cid]);
    for (const [heId, diffId] of Object.entries(cls.difficultyByHe||{}))
      if (diffId) await db.execute('INSERT INTO problem_difficulties (problem_id,he_id,difficulty_id) VALUES ($1,$2,$3)', [problemId, heId, diffId]);
    for (const gid of (cls.gradeIds||[]))
      await db.execute('INSERT INTO problem_grades (problem_id,grade_id) VALUES ($1,$2)', [problemId, gid]);
  };
  ```
  Gọi `saveClassification` bên trong `addProblem` (sau khi INSERT bài). Cột `topic`/`level` cũ cứ để giá trị mặc định (`'Chưa phân loại'`, `1`) — không dùng nữa nhưng giữ cho an toàn.
- [ ] Bước 3: Check it works (cơ bản) — thêm một bài, gắn 2 hệ + lớp, lưu; mở lại app thấy bài còn đó.
- [ ] Bước 4: **KIỂM TRA AN TOÀN LATEX (bắt buộc)** — thêm một bài có công thức `$x^2 + y^2 = z^2$`, gắn phân loại, lưu. Đưa bài vào giỏ → Xuất đề `.tex`. Mở file `.tex` bằng Notepad, xác nhận dòng `$x^2 + y^2 = z^2$` xuất hiện **nguyên vẹn** trong `\begin{bt}...\end{bt}`. Nếu sai → dừng, báo lại.
- [ ] Bước 5: Save — `git add . && git commit -m "feat(taxonomy): classify on add + verify latex export"`

### Task 14: Đọc phân loại khi tải bài + gắn vào form Sửa

**What you'll have when this is done:** Mở một bài để sửa thì phân loại hiện sẵn đúng như đã lưu; sửa xong lưu lại được.

- [ ] Bước 1: Trong `useProblems.js`, sau khi `SELECT * FROM problems`, tải thêm 3 bảng nối và gắn vào mỗi bài:
  ```js
  const pc = await db.select('SELECT * FROM problem_categories');
  const pd = await db.select('SELECT * FROM problem_difficulties');
  const pg = await db.select('SELECT * FROM problem_grades');
  // gộp theo problem_id thành: p.categoryIds, p.difficultyByHe, p.gradeIds
  ```
- [ ] Bước 2: Trong `EditProblemModal.jsx`, dùng `<ClassificationPicker>` với `value` lấy từ bài đang sửa; khi lưu, `updateProblem` gọi `saveClassification` (đã viết).
- [ ] Bước 3: Check it works — sửa một bài, đổi nhánh + độ khó, lưu, đóng, mở lại → phân loại đúng như vừa đặt.
- [ ] Bước 4: Save — `git add . && git commit -m "feat(taxonomy): load classification + edit form"`

---

# GIAI ĐOẠN 4 — Lọc & hiển thị

### Task 15: Lọc theo nhánh (gồm cả nhánh con) + sửa cột hiển thị

**What you'll have when this is done:** Chọn một nhánh để lọc thì ra mọi bài thuộc nhánh đó và các nhánh con; bảng hiển thị chuyên đề mới.

- [ ] Bước 1: Trong `ControlsRow.jsx`, bỏ mảng `topics` hardcode, thay ô "Tất cả chủ đề" bằng danh sách nhánh lấy từ `useTaxonomy` (hiển thị thụt lề theo tầng).
- [ ] Bước 2: Trong `DataGrid.jsx`, sửa bộ lọc: dựng `childrenMap`, dùng `getDescendantIds(selectedNode)` ra tập nhánh hợp lệ; một bài khớp nếu `p.categoryIds` giao với tập đó. Sửa cột "Chuyên đề" để hiện tên nhánh đã gắn (thay cho `p.topic`), cột độ khó hiện theo hệ.
- [ ] Bước 3: Check it works — gắn vài bài vào "Hình học → Tam giác đồng dạng", rồi lọc ở nhánh cha "Hình học" → các bài đó vẫn hiện.
- [ ] Bước 4: Save — `git add . && git commit -m "feat(taxonomy): filter by branch incl. descendants"`

### Task 16: Lọc theo Lớp và theo Độ khó

**What you'll have when this is done:** Lọc thêm được theo lớp và theo mức độ khó.

- [ ] Bước 1: Thêm ô lọc Lớp (từ `grades`) và ô lọc Độ khó. Bài khớp lọc lớp nếu `gradeIds` chứa lớp đã chọn; khớp độ khó nếu có mức tương ứng trong `difficultyByHe`.
- [ ] Bước 2: Check it works — lọc "Lớp 9" ra đúng các bài gắn lớp 9; kết hợp với lọc nhánh vẫn đúng.
- [ ] Bước 3: Save — `git add . && git commit -m "feat(taxonomy): filter by grade and difficulty"`

---

# GIAI ĐOẠN 5 — Smart Import

### Task 17: Dùng `ClassificationPicker` ở bước rà soát Smart Import

**What you'll have when this is done:** Sau khi AI/Regex bóc tách, mỗi câu rà soát được gắn phân loại mới trước khi lưu hàng loạt.

- [ ] Bước 1: Trong `SmartImportModal.jsx` (bước `review`), thay 3 ô select cũ (topic/level/type) — giữ lại "loại câu", thay phần chuyên đề/độ khó bằng `<ClassificationPicker>` cho từng câu (gọn lại nếu cần).
- [ ] Bước 2: Khi `handleFinalSave`, đính kèm phân loại vào mỗi bài; trong `saveImportedProblems` (useProblems) gọi `saveClassification` cho từng bài sau khi chèn.
- [ ] Bước 3: Check it works — import 1 file `.tex` test, gắn phân loại cho 1–2 câu, lưu, kiểm tra phân loại đã vào đúng.
- [ ] Bước 4: **Kiểm tra LaTeX** — xuất một câu vừa import ra `.tex`, xác nhận công thức nguyên vẹn.
- [ ] Bước 5: Save — `git add . && git commit -m "feat(taxonomy): classification in Smart Import"`

---

# GIAI ĐOẠN 6 — Dọn dẹp & kiểm thử tổng

### Task 18: Dọn code cũ + kiểm thử xuất LaTeX toàn diện

**What you'll have when this is done:** Code không còn danh sách chuyên đề hardcode; app build sạch; xuất đề `.tex` đã được kiểm chứng đầy đủ.

- [ ] Bước 1: Xóa mảng `TOPICS` không còn dùng trong `src/utils/constants.js` và mảng `topics` hardcode trong `SmartImportModal.jsx` (đã thay bằng cây). Kiểm tra không còn chỗ nào import chúng.
- [ ] Bước 2: Tạo ~5 bài thật rải ở 2–3 hệ, mỗi bài có công thức LaTeX, gắn phân loại đầy đủ. Cho vào giỏ, xuất đề `.tex` có cả lời giải.
- [ ] Bước 3: Check it works — mở file `.tex`: cấu trúc `\begin{bt}...\end{bt}` đúng, mọi công thức nguyên vẹn, `\loigiai{...}` đúng chỗ. Chạy `CI=false npm run build` → "Compiled" không lỗi mới.
- [ ] Bước 4: Save — `git add . && git commit -m "chore(taxonomy): cleanup + full latex export check"`

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order — don't skip ahead
3. Complete the "Check it works" step before moving to the next task
4. If something doesn't work as expected, stop and describe what you see — don't try random fixes

Say "let's start building" when you're ready to begin Task 1.
