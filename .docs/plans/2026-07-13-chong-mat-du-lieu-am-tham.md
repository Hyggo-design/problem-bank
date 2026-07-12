# Chống mất dữ liệu âm thầm (Đợt A #1) — Build Plan

**What we're building:** App chỉ báo *"đã lưu/xoá thành công"* **sau khi** cơ sở dữ liệu (CSDL) ghi xong thật; nếu hỏng thì hiện **toast đỏ báo lỗi** và **không làm mất** thứ Thầy vừa gõ.

**Why:** Hiện khi lưu thất bại (ổ đĩa trục trặc, CSDL bị khoá, đĩa đầy), app vẫn báo "thành công" rồi âm thầm nuốt lỗi → Thầy tưởng đã lưu nhưng mở lại thì bài biến mất. Đây là rủi ro mất dữ liệu thật nhất khi đang nhập kho.

**Approach:** Tách phần "ghi xuống CSDL" ra một file thuần (`problemWrites.js`) **ném lỗi khi hỏng** (không nuốt) — kiểm được bằng "db giả". Tầng hook (`useProblems.js`) bọc lại, trả **thành/bại (true/false)**. Màn hình (`App.jsx`) **chờ kết quả** rồi mới rẽ nhánh: xong → toast xanh; hỏng → toast đỏ + **giữ nguyên cửa sổ** để thử lại. Không đụng đường xuất `.tex`.

**Spec đã duyệt:** [`.docs/specs/2026-07-13-chong-mat-du-lieu-am-tham-design.md`](../specs/2026-07-13-chong-mat-du-lieu-am-tham-design.md)

**Files we'll create or change:**
- `src/utils/problemWrites.js` — **MỚI**: 9 hàm ghi CSDL thuần, ném lỗi khi hỏng
- `src/utils/problemWrites.test.js` — **MỚI**: kiểm "db giả" (hỏng → phải báo lỗi, không nuốt)
- `src/hooks/useProblems.js` — 8 hàm đổi dữ liệu → trả `true/false`; danh sách chỉ đổi khi ghi xong
- `src/App.jsx` — thêm `error()` vào toast; 9 điểm gọi → `await` + rẽ nhánh xanh/đỏ

**KHÔNG đụng:** `buildProblemTex.js`, `buildContentFile.js`, `ExportModal.jsx`, `db.js`, schema, Rust → golden-file test giữ nguyên.

---

### Task 1: Chuẩn bị — nhánh mới + lưới an toàn (baseline)

**What you'll have when this is done:** Một nhánh riêng để làm việc, một bản chụp DB an toàn, và con số test "trước khi sửa" để đối chiếu.

- [ ] Bước 1: Tạo nhánh làm việc riêng (không đụng `master`)
      Run: `git checkout -b feat-chong-mat-du-lieu`
      You should see: `Switched to a new branch 'feat-chong-mat-du-lieu'`

- [ ] Bước 2: Sao lưu tay file CSDL (phòng hờ, dù ta KHÔNG đổi cấu trúc DB)
      Mở Cài đặt trong app để xem đường dẫn DB (hoặc tìm file `problem_bank.db` trong thư mục Thầy đã đặt), rồi **copy** file `problem_bank.db` sang một thư mục an toàn, đặt tên kèm ngày (vd `problem_bank_backup_2026-07-13.db`).
      (App đã có auto-backup, đây là lớp phòng hờ thứ hai.)

- [ ] Bước 3: Chạy toàn bộ test cũ để ghi mốc "baseline"
      Run: `npm test -- --watchAll=false`
      You should see: tất cả suite **PASS** (gồm `buildContentFile` golden **3/3**). Ghi lại tổng số test đang xanh.

- [ ] Bước 4: Kiểm build sạch
      Run: `npm run build`  *(PowerShell muốn coi cảnh báo là lỗi thì chạy `$env:CI='true'; npm run build`)*
      You should see: `Compiled successfully` (không lỗi).

**Nếu trục trặc:** nếu `npm test` chưa xanh sẵn từ đầu → **dừng lại**, chụp màn hình báo cho tôi; đừng sửa gì thêm (ta cần baseline sạch trước khi bắt đầu).

---

### Task 2: Viết bài kiểm tầng ghi TRƯỚC (test-first) — kỳ vọng ĐỎ

**What you'll have when this is done:** Một file test mô tả đúng "hợp đồng": CSDL hỏng thì hàm phải **báo lỗi**, không nuốt. Chạy giờ sẽ ĐỎ vì chưa có file cần kiểm — điều đó là **đúng ý**.

- [ ] Bước 1: Tạo file `src/utils/problemWrites.test.js` với nội dung:

```js
import {
  saveClassification, insertProblem, updateProblemRow, insertImportedProblems,
  softDeleteProblem, softDeleteMany, restoreProblemRow, purgeProblemRow, emptyTrashRows,
} from './problemWrites';

// "db giả" chạy trơn tru
const okDb = () => ({
  execute: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
  select: jest.fn().mockResolvedValue([]),
});
// "db giả" hỏng (mô phỏng đĩa đầy / CSDL khoá)
const failDb = (msg = 'disk full') => ({
  execute: jest.fn().mockRejectedValue(new Error(msg)),
  select: jest.fn().mockRejectedValue(new Error(msg)),
});

const sample = { id: 'p1', statement: '$x^2$', options: [],
  categoryIds: ['c1'], difficultyByHe: { h1: 'd1' }, gradeIds: ['g1'] };

// Mỗi mục: [tên hàm, cách chạy nó với 1 db cho trước]
const cases = [
  ['saveClassification',     (db) => saveClassification(db, 'p1', sample)],
  ['insertProblem',          (db) => insertProblem(db, sample)],
  ['updateProblemRow',       (db) => updateProblemRow(db, sample)],
  ['insertImportedProblems', (db) => insertImportedProblems(db, [sample])],
  ['softDeleteProblem',      (db) => softDeleteProblem(db, 'p1')],
  ['softDeleteMany',         (db) => softDeleteMany(db, ['p1', 'p2'])],
  ['restoreProblemRow',      (db) => restoreProblemRow(db, 'p1')],
  ['purgeProblemRow',        (db) => purgeProblemRow(db, 'p1')],
  ['emptyTrashRows',         (db) => emptyTrashRows(db)],
];

describe('problemWrites — CSDL hỏng thì NÉM lỗi (không nuốt)', () => {
  test.each(cases)('%s: db hỏng → ném lỗi', async (_n, run) => {
    await expect(run(failDb())).rejects.toThrow();
  });
  test.each(cases)('%s: db ổn → chạy xong không lỗi', async (_n, run) => {
    await expect(run(okDb())).resolves.not.toThrow();
  });
});

describe('problemWrites — biên rỗng là no-op (không gọi execute)', () => {
  test('insertImportedProblems([])', async () => {
    const db = okDb(); await insertImportedProblems(db, []);
    expect(db.execute).not.toHaveBeenCalled();
  });
  test('softDeleteMany([])', async () => {
    const db = okDb(); await softDeleteMany(db, []);
    expect(db.execute).not.toHaveBeenCalled();
  });
});

test('insertProblem: db ổn thì có chèn vào bảng problems', async () => {
  const db = okDb(); await insertProblem(db, sample);
  const sqls = db.execute.mock.calls.map((c) => c[0]);
  expect(sqls.some((s) => /INSERT OR REPLACE INTO problems/.test(s))).toBe(true);
});
```

- [ ] Bước 2: Chạy đúng file này — kỳ vọng ĐỎ
      Run: `npm test -- --watchAll=false problemWrites`
      You should see: **FAIL** kèm dòng kiểu *"Cannot find module './problemWrites'"*. **Đỏ ở đây là ĐÚNG** — vì Task 3 mới tạo file đó.

**Nếu trục trặc:** nếu nó lại XANH (không nên) → nghĩa là đã có file `problemWrites.js` từ trước; dừng và báo tôi.

---

### Task 3: Tạo `problemWrites.js` — chuyển SQL xuống, ném lỗi khi hỏng → test XANH

**What you'll have when this is done:** Tầng ghi CSDL tách riêng, đã được test chứng minh "hỏng thì báo lỗi". Đây là phần lõi.

- [ ] Bước 1: Tạo file `src/utils/problemWrites.js`. Nội dung là **SQL bê nguyên từ `useProblems.js`** (không đổi câu lệnh, chỉ đổi chỗ), gói thành hàm nhận `db` và **không** bọc try/catch:

```js
// Tầng ghi CSDL thuần: nhận `db` đã mở, chạy lệnh, NÉM LỖI khi hỏng (không nuốt).
// Tách khỏi React hook để kiểm được bằng "db giả".

// Lưu phân loại 1 bài vào 3 bảng nối theo kiểu XÓA-RỒI-GHI.
export const saveClassification = async (db, problemId, cls = {}) => {
  await db.execute('DELETE FROM problem_categories WHERE problem_id = $1', [problemId]);
  await db.execute('DELETE FROM problem_difficulties WHERE problem_id = $1', [problemId]);
  await db.execute('DELETE FROM problem_grades WHERE problem_id = $1', [problemId]);
  for (const cid of (cls.categoryIds || [])) {
    await db.execute('INSERT INTO problem_categories (problem_id, category_id) VALUES ($1, $2)', [problemId, cid]);
  }
  for (const [heId, diffId] of Object.entries(cls.difficultyByHe || {})) {
    if (diffId) await db.execute('INSERT INTO problem_difficulties (problem_id, he_id, difficulty_id) VALUES ($1, $2, $3)', [problemId, heId, diffId]);
  }
  for (const gid of (cls.gradeIds || [])) {
    await db.execute('INSERT INTO problem_grades (problem_id, grade_id) VALUES ($1, $2)', [problemId, gid]);
  }
};

export const insertProblem = async (db, p) => {
  const optionsStr = JSON.stringify(p.options || []);
  await db.execute(
    `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, timesUsed, type, shortAnswer, options, metadata, figStatement, figSolution)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [ p.id, p.statement || '', p.solution || '', p.topic || 'Chưa phân loại',
      parseInt(p.level) || 1, p.tags || '', p.dateAdded || new Date().toISOString(),
      p.timesUsed || 0, p.type || 'Tự luận', p.shortAnswer || '', optionsStr,
      "{}", p.figStatement || '', p.figSolution || '' ]
  );
  await saveClassification(db, p.id, p);
};

export const updateProblemRow = async (db, p) => {
  const optionsStr = JSON.stringify(p.options || []);
  await db.execute(
    `UPDATE problems SET statement = $1, solution = $2, topic = $3, level = $4, tags = $5, type = $6, shortAnswer = $7, options = $8, figStatement = $9, figSolution = $10 WHERE id = $11`,
    [ p.statement, p.solution || '', p.topic, p.level, p.tags || '', p.type || 'Tự luận',
      p.shortAnswer || '', optionsStr, p.figStatement || '', p.figSolution || '', p.id ]
  );
  await saveClassification(db, p.id, p);
};

export const insertImportedProblems = async (db, list) => {
  if (!list || list.length === 0) return;
  const chunkSize = 50;
  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize);
    const chunkPlaceholders = chunk.map((_, index) => {
      const offset = index * 12;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`;
    }).join(', ');
    const query = `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, timesUsed, type, shortAnswer, options, metadata) VALUES ${chunkPlaceholders}`;
    const bindValues = [];
    for (const prob of chunk) {
      const optionsStr = JSON.stringify(prob.options || []);
      bindValues.push(
        prob.id, prob.statement || '', prob.solution || '', prob.topic || 'Chưa phân loại',
        parseInt(prob.level) || 1, prob.tags || '', prob.dateAdded || new Date().toISOString(),
        prob.timesUsed || 0, prob.type || 'Tự luận', prob.shortAnswer || '', optionsStr, "{}"
      );
    }
    await db.execute(query, bindValues);
  }
  for (const prob of list) await saveClassification(db, prob.id, prob);
};

export const softDeleteProblem = async (db, id) => {
  await db.execute('UPDATE problems SET deletedAt = $1 WHERE id = $2', [new Date().toISOString(), id]);
};

export const softDeleteMany = async (db, ids) => {
  if (!ids || ids.length === 0) return;
  const now = new Date().toISOString();
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  await db.execute(`UPDATE problems SET deletedAt = $1 WHERE id IN (${placeholders})`, [now, ...ids]);
};

export const restoreProblemRow = async (db, id) => {
  await db.execute('UPDATE problems SET deletedAt = NULL WHERE id = $1', [id]);
};

export const purgeProblemRow = async (db, id) => {
  await db.execute('DELETE FROM problems WHERE id = $1', [id]);
  await db.execute('DELETE FROM problem_categories WHERE problem_id = $1', [id]);
  await db.execute('DELETE FROM problem_difficulties WHERE problem_id = $1', [id]);
  await db.execute('DELETE FROM problem_grades WHERE problem_id = $1', [id]);
};

export const emptyTrashRows = async (db) => {
  const rows = await db.select('SELECT id FROM problems WHERE deletedAt IS NOT NULL');
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return;
  const ph = ids.map((_, i) => `$${i + 1}`).join(', ');
  await db.execute(`DELETE FROM problem_categories WHERE problem_id IN (${ph})`, ids);
  await db.execute(`DELETE FROM problem_difficulties WHERE problem_id IN (${ph})`, ids);
  await db.execute(`DELETE FROM problem_grades WHERE problem_id IN (${ph})`, ids);
  await db.execute('DELETE FROM problems WHERE deletedAt IS NOT NULL');
};
```

- [ ] Bước 2: Chạy lại test file này — kỳ vọng XANH
      Run: `npm test -- --watchAll=false problemWrites`
      You should see: **PASS** hết (cả nhóm "db hỏng → ném lỗi" lẫn "db ổn → chạy xong").

- [ ] Bước 3: Lưu tiến độ
      Run: `git add . && git commit -m "feat(reliability): tach tang ghi CSDL problemWrites + test"`

**Nếu trục trặc:** test đỏ → đọc tên hàm đỏ, đối chiếu SQL với `useProblems.js` xem có chép sót dấu phẩy/tham số không. Đừng đổi nội dung câu SQL.

---

### Task 4: Nối `useProblems.js` vào tầng ghi — 8 hàm trả `true/false`

**What you'll have when this is done:** Tầng hook không còn nuốt lỗi: mỗi thao tác trả về **thành công/thất bại**, và danh sách trên màn chỉ đổi khi CSDL đã ghi xong.

- [ ] Bước 1: Ở đầu `src/hooks/useProblems.js`, **thêm import** tầng ghi và **xoá** hàm `saveClassification` private cũ (đã chuyển sang file mới):

```js
import { getDb } from '../utils/db';
import { findDuplicates } from '../utils/findDuplicates';
import {
  insertProblem, updateProblemRow, insertImportedProblems,
  softDeleteProblem, softDeleteMany, restoreProblemRow, purgeProblemRow, emptyTrashRows,
} from '../utils/problemWrites';
// (Xoá khối `const saveClassification = async (db, ...) => {...}` cũ ở đầu file)
```

- [ ] Bước 2: Viết lại **8 hàm** theo đúng khuôn "chờ ghi xong → `return true`; hỏng → `console.error` + `return false`". Ví dụ `addProblem`:

```js
const addProblem = async (newProblem) => {
  try {
    if (!newProblem || !newProblem.id) throw new Error("Bài tập thiếu ID");
    const db = await getDb();
    await insertProblem(db, newProblem);
    setProblems(prev => [newProblem, ...prev.filter(p => p.id !== newProblem.id)]); // chỉ đổi khi ĐÃ ghi xong
    return true;
  } catch (error) {
    console.error("Lỗi thêm bài:", error);
    return false;
  }
};
```

Áp dụng cùng khuôn cho: `updateProblem` (dùng `updateProblemRow`, cập nhật state rồi `return true`), `saveImportedProblems` (dùng `insertImportedProblems`; **rỗng → `return true`**), `deleteProblem` (`softDeleteProblem` → `await loadProblems()` → `return true`), `bulkDeleteProblems` (`softDeleteMany`; **rỗng → `return true`**), `restoreProblem` (`restoreProblemRow`), `purgeProblem` (`purgeProblemRow`), `emptyTrash` (`emptyTrashRows`). Nhóm xoá/khôi phục giữ `await loadProblems()` **trong** try, trước `return true`. **Giữ nguyên** `loadProblems`, `checkDuplicate`.

- [ ] Bước 3: Chạy toàn bộ test — không được vỡ gì
      Run: `npm test -- --watchAll=false`
      You should see: mọi suite XANH, **golden `buildContentFile` 3/3 KHÔNG đổi** (ta không đụng đường xuất).

- [ ] Bước 4: Kiểm build sạch (0 cảnh báo = mọi hàm/biến đều được dùng, không nối sót)
      Run: `$env:CI='true'; npm run build`
      You should see: `Compiled successfully` với **0 warning**.

- [ ] Bước 5: Lưu tiến độ
      Run: `git add . && git commit -m "feat(reliability): useProblems tra thanh/bai thay vi nuot loi"`

**Nếu trục trặc:** build cảnh báo `'insertProblem' is defined but never used`… → nghĩa là còn hàm chưa nối; nối nốt. Đừng bỏ qua cảnh báo.

---

### Task 5: `App.jsx` — 3 đường LƯU (thêm / sửa / nhập): chờ rồi rẽ nhánh

**What you'll have when this is done:** Thêm/Sửa/Nhập chỉ báo xanh khi đã lưu thật; lưu hỏng thì **toast đỏ và cửa sổ vẫn mở** để Thầy thử lại (không mất nội dung đã gõ).

- [ ] Bước 1: Thêm `error` vào dòng lấy toast (khoảng dòng 49):
      `const { success, error, info, undoToast } = useToast();`

- [ ] Bước 2: Sửa **4 điểm gọi lưu/sửa** (2 chỗ Thêm: `handleConfirmDuplicateSave` + `AddProblemModal.onSave`; 2 chỗ Sửa: `handleConfirmDuplicateSave` + `EditProblemModal.onSave`) sang dạng `await` + rẽ nhánh. Mẫu cho `AddProblemModal.onSave`:

```jsx
onSave={async (prob) => {
  const dups = checkDuplicate(prob.statement, prob.solution);
  if (dups.length) { setPendingSave({ type: 'add', problem: prob, duplicates: dups }); return; }
  if (await addProblem(prob)) {
    ui.setShowAddModal(false);
    success('Đã thêm bài tập!');
    ui.setSelectedPreview(prob);
  } else {
    error('Chưa lưu được — ổ đĩa hoặc CSDL đang trục trặc. Bài CHƯA được lưu, Thầy thử lại nhé.');
  }
}}
```
Trong `handleConfirmDuplicateSave`: nếu lưu **hỏng** thì `setPendingSave(null)` (đóng cảnh báo trùng) nhưng **không** đóng modal Thêm/Sửa; hiện `error(...)`. Sửa dùng câu *"Chưa lưu được thay đổi — CSDL đang trục trặc. Thầy thử lại nhé."*

- [ ] Bước 3: Sửa **Nhập** (`SmartImportModal.onSave`): `if (await saveImportedProblems(newProbs)) { success('Cập nhật N bài…'); đóng modal } else { error('Chưa nhập được — CSDL đang trục trặc. Thầy thử lại nhé.'); }` (giữ modal khi hỏng).

- [ ] Bước 4: Kiểm build sạch
      Run: `$env:CI='true'; npm run build`
      You should see: `Compiled successfully`, 0 warning.

- [ ] Bước 5: Lưu tiến độ
      Run: `git add . && git commit -m "feat(reliability): App cho ghi xong moi bao thanh cong (them/sua/nhap)"`

> Chi tiết câu chữ + hành vi từng chỗ: xem bảng **mục 5.3** trong spec.

---

### Task 6: `App.jsx` — nhóm XOÁ / KHÔI PHỤC: bỏ hiệu ứng giả khi hỏng

**What you'll have when this is done:** Xoá mềm / xoá hàng loạt / khôi phục / xoá hẳn / dọn rác: hỏng thì báo đỏ và **không** giả vờ đã xong (không hiện nút Hoàn tác, không gỡ khỏi giỏ khi thực ra chưa xoá).

- [ ] Bước 1: Sửa **Xoá mềm 1 bài** (`onDelete`) — chỉ chạy hiệu ứng khi thành công:

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

- [ ] Bước 2: Sửa **Xoá hàng loạt** (`handleBulkDelete`): `if (await bulkDeleteProblems(ids)) { gỡ khỏi giỏ + clear chọn/preview + success } else { error('Chưa xoá được — thử lại nhé.'); }`

- [ ] Bước 3: Sửa **Khôi phục / Xoá hẳn / Dọn rác** (TrashPage `onRestore`/`onPurge`/`onEmptyAll`): mỗi cái `if (await …) success(...) else error(...)` — câu lỗi tương ứng *"Chưa khôi phục được / Chưa xoá hẳn được / Chưa dọn được — thử lại nhé."*

- [ ] Bước 4: Kiểm build sạch
      Run: `$env:CI='true'; npm run build`
      You should see: `Compiled successfully`, 0 warning.

- [ ] Bước 5: Lưu tiến độ
      Run: `git add . && git commit -m "feat(reliability): App bo hieu ung gia khi xoa/khoi phuc that bai"`

---

### Task 7: Nghiệm thu thật trong app + kiểm an toàn LaTeX/xuất

**What you'll have when this is done:** Bằng chứng tận mắt: thao tác bình thường vẫn chạy, **đường xuất `.tex` không hư**, và kho cũ còn nguyên.

- [ ] Bước 1: Mở app
      Run: `npx tauri dev`

- [ ] Bước 2: **Kiểm an toàn LaTeX (BẮT BUỘC).** Thêm 1 bài mới có công thức `$x^2 + y^2 = z^2$` ở đề → thấy toast xanh, bài hiện ra. Cho bài này vào Giỏ → Xuất `.tex`. Mở file `.tex` vừa xuất, xác nhận dòng `$x^2 + y^2 = z^2$` **hiện đúng nguyên vẹn**.
      *(Đây là chốt chặn quan trọng nhất: sửa tầng lưu mà nội dung công thức đi xuyên qua vẫn sạch.)*

- [ ] Bước 3: **Kho cũ còn nguyên.** Đối chiếu số bài trong feed vẫn khớp như trước khi sửa (khoảng ~73 bài), không bài nào biến mất.

- [ ] Bước 4: **Thử nhanh các thao tác** — mỗi cái đều báo xanh và có tác dụng thật: Sửa 1 bài; Nhập vài bài; Xoá mềm (thấy nút *Hoàn tác*) → Khôi phục; vào Thùng rác Xoá hẳn / Dọn rác.

- [ ] Bước 5 *(tuỳ chọn — xem thử nhánh LỖI):* đóng app, đổi thư mục chứa `problem_bank.db` sang **chỉ-đọc** (read-only), mở lại app rồi thử Thêm 1 bài → phải thấy **toast đỏ "Chưa lưu được…"** và cửa sổ **vẫn mở**. Xong nhớ **bỏ chỉ-đọc** lại.
      *(Nếu ngại thao tác này thì bỏ qua — bài test đơn vị ở Task 3 đã là bằng chứng cho nhánh lỗi.)*

- [ ] Bước 6: Chạy lại kiểm tự động lần cuối
      Run: `npm test -- --watchAll=false` (tất cả XANH, golden 3/3) và `$env:CI='true'; npm run build` (0 warning).

- [ ] Bước 7: Lưu tiến độ (nếu Task 5–6 đã commit rồi thì bước này chỉ commit phần còn sót)
      Run: `git add . && git commit -m "feat(reliability): nghiem thu chong mat du lieu am tham"`

**Nếu trục trặc:** bất kỳ bước nào lệch kỳ vọng (công thức xuất sai, bài biến mất, toast không đúng màu) → **dừng**, mô tả đúng thứ Thầy thấy cho tôi; đừng sửa mò.

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Đọc lướt cả plan một lượt trước khi bắt đầu
2. Làm lần lượt từng Task — không nhảy cóc
3. Xong bước "Check it works / kỳ vọng thấy…" mới sang Task kế
4. Nếu có gì lệch kỳ vọng, **dừng** và mô tả thứ Thầy thấy — đừng thử sửa lung tung

Nói **"bắt đầu build"** khi Thầy sẵn sàng làm Task 1. (Sau khi xong hết, ta gộp nhánh `feat-chong-mat-du-lieu` vào `master` + đóng gói **v1.2** ở mục Đợt A kế tiếp.)
