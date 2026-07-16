# Thiết Kế: Ghi "Trọn Gói" (Transaction All-or-Nothing) — Problem Bank

## 1. Thông tin chung
- **Ngày**: 16/07/2026
- **Trạng thái**: Đã brainstorm (2 câu hỏi chốt: *mức làm* = transaction thật xuống Rust; *phạm vi* = cả 7 đường ghi nhiều-lệnh). Chờ Thầy DUYỆT thiết kế → chuyển sang Plan.
- **Đợt**: Roadmap **Đợt C** (`.docs/ROADMAP.md`) — mục "⚙️ Ghi 'trọn gói' (transaction) cho thao tác lưu". Là **mục Đợt C đầu tiên** Thầy chọn (NK34 để ngỏ, phiên này chốt).
- **Nối tiếp Đợt A #1** ("Chống mất dữ liệu âm thầm", NK28): Đợt A #1 đã làm cho thao tác lưu **báo lỗi thật** (trả `true/false`, không nuốt lỗi, không báo "thành công" giả). Đợt này làm nốt phần còn thiếu: **bảo đảm all-or-nothing** — hỏng giữa chừng không để lại dữ liệu dở dang.
- **Phạm vi**: bọc **transaction (BEGIN…COMMIT/ROLLBACK)** quanh **7 đường ghi gồm NHIỀU lệnh** trong `src/utils/problemWrites.js`, bằng cách **đưa việc chạy cả cụm lệnh xuống lõi Rust** (chạy trên **một** kết nối).
- **KHÔNG trong phạm vi đợt này**: đổi schema/thêm cột/migration; đụng đường xuất `.tex`; đổi journal mode sang WAL; bọc transaction cho 3 đường ghi **một-lệnh** (đã atomic sẵn); đóng gói `.msi` chính thức (là bước riêng, xem §8).

### Bối cảnh (vì sao làm việc này)
- Mỗi thao tác lưu hiện là **nhiều lệnh `db.execute` tách rời** qua `@tauri-apps/plugin-sql`. Ví dụ `insertProblem` = 1 lệnh ghi bảng `problems` + `saveClassification` (3 DELETE + N INSERT trên 3 bảng nối) = ~4+N lệnh. `insertImportedProblems` (Nhập hàng loạt) còn nhiều hơn: chèn `problems` theo **chunk 50**, **rồi** lặp `saveClassification` cho **từng** bài.
- Plugin dùng **pool kết nối** (sqlx). Mỗi `db.execute` **mượn một kết nối bất kỳ** rồi trả lại → `BEGIN`/`INSERT`/`COMMIT` gọi rời nhau có thể rơi vào **các kết nối khác nhau** ⇒ `BEGIN` một nơi, `INSERT` tự-commit nơi khác, `COMMIT` vô nghĩa. **Từ JS không ghim được 1 kết nối.** Vì vậy transaction thủ công phía JS **không chắc ăn** — đây chính là điểm nghẽn roadmap đã ghi.
- Rủi ro thực tế: đĩa đầy / DB khoá / mất điện / app crash **giữa chừng** → **ghi dở dang**. Nặng nhất là **Nhập hàng loạt**: hỏng ở chunk thứ 3 để lại "vào được nửa số bài, phân loại nham nhở". (Bù lại hiện có: bấm lưu/nhập lại **tự chữa** nhờ `INSERT OR REPLACE` + xoá-rồi-ghi — nhưng chỉ khi Thầy *biết* mà làm lại.)

## 2. Mục tiêu
- **All-or-nothing**: mỗi thao tác lưu **hoặc xong trọn vẹn, hoặc không đổi gì**. Hỏng bất kỳ lệnh nào ở giữa → **ROLLBACK**, kho y nguyên như trước khi bấm.
- **Không đổi trải nghiệm khi chạy trơn**: thêm/sửa/nhập bài y hệt hiện tại; chỉ khác lúc **có sự cố** (được huỷ sạch + báo lỗi rõ).
- **Giữ an toàn tuyệt đối cho đường xuất `.tex`** và **cấu trúc DB** (không migration, không đổi byte lưu ra).
- **Test chặt hơn**: tách phần dựng lệnh thành **hàm thuần** → khẳng định được đúng thứ tự từng lệnh (tốt hơn kiểu "db giả" hiện tại).

## 3. Hiện trạng (điểm xuất phát trong code)
- **Tầng ghi thuần** — `src/utils/problemWrites.js`: mỗi hàm nhận `db` đã mở, gọi `db.execute` nhiều lần, **ném lỗi** khi hỏng (Đợt A #1). Chỉ **`useProblems.js`** import tầng này (đã kiểm: không nơi nào khác) ⇒ refactor gọn.
- **Hook** — `src/hooks/useProblems.js`: mỗi hàm ghi `try { … } catch { return false }`, đổi state **sau khi** ghi xong. Đường đọc (`loadProblems`, các `select`) **giữ nguyên qua plugin**.
- **Caller** — `src/App.jsx`: đã có nếp `if (await addProblem(...)) success(...) else error(...)` cho `add`/`update`/`purge`(dòng 308)/`emptyTrash`(309)/`saveImportedProblems`(362); `renameTag`/`deleteTag` truyền vào màn Quản lý tag. ⇒ **Đường báo lỗi UX đã có sẵn**, đợt này không cần thêm.
- **Phía Rust** — `src-tauri/src/lib.rs`: đã có nếp lệnh custom (`ensure_dir`, `copy_file`, `read_text_file`…) đăng ký trong `invoke_handler`. Thêm 1 lệnh nữa là đúng khuôn.
- **Đường mở DB** — `src/utils/db.js`: nạp DB từ ổ D (`D:\0. Problems Bank\app-data\problem_bank.db`), lỗi thì **quay về ổ C** (`Database.load('sqlite:problem_bank.db')` — đường tương đối do plugin tự giải). Khoá `localStorage['pb-db-path-active']` **chỉ** được đặt ở nhánh ổ D.
- **Phiên bản** (Cargo.lock): `tauri-plugin-sql 2.4.0` · `sqlx 0.8.6` · `sqlx-sqlite 0.8.6` · **`libsqlite3-sys 0.30.1`**. Chưa có `rusqlite`.

## 4. Cơ chế kỹ thuật (quyết định của Claude — Thầy không cần chọn)

### 4.1 Vì sao dùng `rusqlite` (không mò ruột plugin)
- Thêm **`rusqlite = { version = "0.32", features = ["bundled"] }`** làm dependency Rust. rusqlite 0.32 **dùng đúng `libsqlite3-sys 0.30`** — **trùng** với sqlx-sqlite 0.8.6 ⇒ Cargo **gộp làm một** bản `libsqlite3-sys` (feature `bundled`), **không phát sinh hai bản SQLite**, **không đụng độ ký hiệu (symbol clash)** khi link. *(Bước Plan sẽ chạy `cargo tree -i libsqlite3-sys` xác nhận đúng **một** bản trước khi build tiếp.)*
- **Vì sao KHÔNG dùng sqlx trực tiếp**: đường DB là `D:\0. Problems Bank\...` (có **dấu cách + backslash + ổ đĩa**). `rusqlite::Connection::open(path)` nhận **đường dẫn hệ thống tệp thuần** → chắc ăn trên Windows. sqlx nhận **connection-string kiểu URI** (`sqlite:…`) — vốn khó nhằn với path Windows nhiều dấu cách. ⇒ rusqlite an toàn hơn. *(Dự phòng: nếu vì lý do nào đó có symbol clash, chuyển sang mở `SqliteConnection` đơn của sqlx — cùng bản đã có trong cây phụ thuộc.)*
- **Hai kết nối tới cùng file có sao không?** Không. Đây là app **một người dùng**, ghi **tuần tự** theo cú bấm. SQLite nối tiếp các writer bằng khoá tệp; `rusqlite` sẽ đặt `busy_timeout` (5s) để nhường khi kẹt tạm thời. Sau khi rusqlite `COMMIT`, các `select` qua plugin đọc **đúng dữ liệu mới** (SQLite luôn đọc bản đã commit từ file). **Không đổi journal mode** (giữ mặc định, tránh ảnh hưởng sao lưu/copy file).

### 4.2 Xác định ĐÚNG đường file DB (điểm mấu chốt về đúng đắn)
`execute_tx` mở DB **theo đường dẫn tuyệt đối** JS truyền xuống. Nếu đoán sai đường (nhất là nhánh **fallback ổ C** dùng path tương đối) → rusqlite mở **nhầm file** ⇒ ghi lạc chỗ. Giải pháp **không phụ thuộc phiên bản plugin**:
- Ngay sau khi `Database.load(...)` thành công trong `db.js`, hỏi chính SQLite đường thật:
  ```js
  const rows = await db.select('PRAGMA database_list'); // [{ seq, name, file }]
  const abs = (rows.find(r => r.name === 'main') || {}).file; // đường tuyệt đối plugin đang mở
  if (abs) localStorage.setItem('pb-db-path-active', abs);
  ```
  ⇒ `pb-db-path-active` **luôn** là path tuyệt đối **đúng y** file plugin đang dùng, cho **cả** nhánh ổ D lẫn fallback ổ C. `runTx` đọc khoá này (thiếu thì tự truy vấn `PRAGMA` một lần).

## 5. Thiết kế chi tiết

### 5.1 Lệnh Rust mới — `execute_tx` (`src-tauri/src/lib.rs`)
```rust
#[derive(serde::Deserialize)]
struct TxStatement { sql: String, params: Vec<serde_json::Value> }

#[tauri::command]
fn execute_tx(db_path: String, statements: Vec<TxStatement>) -> Result<usize, String> {
    let mut conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.busy_timeout(std::time::Duration::from_millis(5000)).map_err(|e| e.to_string())?;
    let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
                 .map_err(|e| e.to_string())?;
    let mut affected = 0usize;
    for st in &statements {
        let vals = json_to_sql_params(&st.params)?;         // Vec<rusqlite::types::Value>
        affected += tx.execute(&st.sql, rusqlite::params_from_iter(vals))
                      .map_err(|e| format!("{e}\n↳ SQL: {}", st.sql))?; // lỗi ở đâu → ? → tx drop → ROLLBACK
    }
    tx.commit().map_err(|e| e.to_string())?;                // chỉ commit khi TẤT CẢ xong
    Ok(affected)
}
```
- **Ánh xạ tham số** `serde_json::Value → rusqlite::types::Value`: `Null→Null`; `Bool→Integer(0/1)`; số nguyên→`Integer(i64)`; số thực→`Real(f64)`; chuỗi→`Text`; (phòng hờ) mảng/đối tượng→`Text` (chuỗi hoá) — thực tế JS đã `JSON.stringify` cột `options`/`metadata` thành chuỗi trước rồi.
- **Tự huỷ**: bất kỳ `?` nào lỗi → `tx` bị drop mà chưa `commit` → rusqlite tự `ROLLBACK`. Trả `Err(String)` để JS bắt.
- **`BEGIN IMMEDIATE`**: lấy khoá ghi ngay từ đầu, tránh nâng-khoá giữa chừng gây kẹt.
- Đăng ký thêm `execute_tx` vào `tauri::generate_handler![…]`.

### 5.2 Tầng ghi thành HÀM THUẦN — `src/utils/problemWrites.js`
Đổi từ *"nhận `db`, gọi `db.execute` nhiều lần"* sang *"trả **danh sách lệnh** `{ sql, params }`"* (không chạm DB, dễ test). SQL & thứ tự tham số **bê nguyên** hiện tại — chỉ đổi nơi *chạy*.

| Builder mới | Trả về (danh sách lệnh, đúng thứ tự) |
|---|---|
| `buildClassificationStmts(problemId, cls)` | 3 `DELETE` (categories/difficulties/grades) + các `INSERT` theo `categoryIds`/`difficultyByHe`/`gradeIds` |
| `buildInsertProblem(p)` | `[ INSERT OR REPLACE problems, ...buildClassificationStmts(p.id, p) ]` |
| `buildUpdateProblem(p)` | `[ UPDATE problems, ...buildClassificationStmts(p.id, p) ]` |
| `buildInsertImported(list)` | `[ ...các INSERT OR REPLACE theo chunk 50, ...(mỗi bài) buildClassificationStmts ]`; `list` rỗng → `[]` |
| `buildRenameTag(problems, oldTag, newTag)` | `UPDATE problems SET tags` cho **chỉ** những bài đổi chuỗi; không bài nào đổi → `[]` |
| `buildDeleteTag(problems, tag)` | tương tự trên |
| `buildPurge(id)` | 4 `DELETE` (problems + 3 bảng nối) |
| `buildEmptyTrash()` | 3 `DELETE … WHERE problem_id IN (SELECT id FROM problems WHERE deletedAt IS NOT NULL)` + `DELETE FROM problems WHERE deletedAt IS NOT NULL` — **dùng subquery, bỏ bước SELECT trước** ⇒ trọn trong transaction |

### 5.3 Bộ chạy transaction — `runTx` (trong `src/utils/db.js`)
```js
import { invoke } from '@tauri-apps/api/core';

export const getActiveDbPath = async () => {
  let p = localStorage.getItem('pb-db-path-active');
  if (p) return p;
  const db = await getDb();
  const rows = await db.select('PRAGMA database_list');
  p = (rows.find(r => r.name === 'main') || {}).file || '';
  if (p) localStorage.setItem('pb-db-path-active', p);
  return p;
};

// Chạy cả cụm lệnh trong 1 transaction dưới Rust. Rỗng = no-op. Lỗi → ném (hook bắt → toast).
export const runTx = async (statements) => {
  if (!statements || statements.length === 0) return true;
  const dbPath = await getActiveDbPath();
  await invoke('execute_tx', { dbPath, statements });
  return true;
};
```

### 5.4 Nối vào hook — `src/hooks/useProblems.js`
Mỗi hàm ghi đổi từ gọi `insertProblem(db, …)` sang `await runTx(buildInsertProblem(newProblem))`, giữ nguyên `try/catch → return true/false` và thứ tự "ghi xong mới đổi state". Ví dụ:
```js
const addProblem = async (newProblem) => {
  try {
    if (!newProblem || !newProblem.id) throw new Error('Bài tập thiếu ID');
    await runTx(buildInsertProblem(newProblem));
    setProblems(prev => [newProblem, ...prev.filter(p => p.id !== newProblem.id)]);
    return true;
  } catch (e) { console.error('Lỗi thêm bài:', e); return false; }
};
```
- `renameTag`/`deleteTag`: đổi vòng lặp `updateProblemTags` thành **một** `runTx(buildRenameTag(problems, …))` (giờ **cả loạt đổi tag là trọn gói** — trước đây hỏng giữa chừng để lại nửa đổi).
- **Giữ nguyên qua plugin (KHÔNG bọc)**: `softDeleteProblem`, `softDeleteMany`, `restoreProblemRow` — **mỗi cái 1 lệnh**, SQLite đã atomic từng lệnh; bọc thừa. (Vẫn dùng `db.execute` như cũ.)

### 5.5 Độ tin cậy (bám Đợt A #1)
- Lỗi từ `execute_tx` → `invoke` reject → `runTx` ném → hook `catch` trả `false` → App hiện **toast lỗi thật** (đường đã có). **Không báo "thành công" giả.**
- Vì đã ROLLBACK, sau lỗi **state màn hình vẫn khớp DB** (state chỉ đổi khi `runTx` **không** ném).

## 6. Guardrail (an toàn)
- ❌ **KHÔNG đổi schema DB**, không thêm/bớt bảng-cột, **không migration**.
- ❌ **KHÔNG đụng đường xuất `.tex`**: `buildProblemTex.js`/`buildContentFile.js` giữ nguyên byte-for-byte ⇒ **golden-file test KHÔNG đổi**.
- ❌ **KHÔNG đổi câu SQL / thứ tự tham số** của các lệnh ghi — chỉ **đổi chỗ chạy** (JS `db.execute` → Rust transaction). Nội dung lưu ra **giống hệt từng byte**.
- ❌ **KHÔNG đổi journal mode** (giữ mặc định).
- ✅ Chỉ **thêm 1 dependency Rust** (`rusqlite`, bundled) đã kiểm gộp chung `libsqlite3-sys` với sqlx (không clash).
- ✅ Đường **đọc** (`select`, `loadProblems`) và 3 đường ghi **một-lệnh** giữ nguyên qua plugin.
- ✅ `execute_tx` mở **đúng file** DB nhờ `PRAGMA database_list` (không đoán path).

## 7. Kiểm thử (theo nếp TDD)
- **JS — `problemWrites.test.js` viết lại cho builder thuần** (bỏ "db giả", test **danh sách lệnh**):
  - `buildInsertProblem`: lệnh đầu là `INSERT OR REPLACE INTO problems`, **không** nhắc `timesUsed`; kế đó **3 DELETE** rồi các INSERT phân loại đúng số lượng theo `categoryIds`/`difficultyByHe`/`gradeIds`.
  - `buildUpdateProblem`: lệnh đầu `UPDATE problems … WHERE id`; phần phân loại như trên.
  - `buildInsertImported`: `[]` rỗng → **mảng rỗng** (no-op); 60 bài → **2** câu INSERT chunk (50+10) rồi 60 cụm phân loại; không nhắc `timesUsed`.
  - `buildRenameTag`/`buildDeleteTag`: chỉ sinh lệnh cho **bài thực sự đổi** chuỗi tags; không đổi → `[]`.
  - `buildPurge`: đúng **4 DELETE**. `buildEmptyTrash`: 3 DELETE bảng nối **dạng subquery** + 1 DELETE `problems`.
  - **Ánh xạ tham số**: mỗi lệnh `params` đúng thứ tự/độ dài như SQL cũ.
- **JS — `runTx`** (mock `@tauri-apps/api/core`): danh sách rỗng → **không** gọi `invoke`; `invoke` reject → `runTx` **ném** (để hook trả `false`).
- **Rust — test `execute_tx`** (rusqlite, file DB tạm trong `tempdir`):
  - Chuỗi lệnh hợp lệ → COMMIT: dữ liệu có mặt, trả tổng `rowsAffected`.
  - **Chèn 1 lệnh hỏng ở giữa** (vd sai bảng/thiếu cột) → trả `Err` **và** DB **không đổi** (chứng minh ROLLBACK: các lệnh trước đó *không* lưu lại).
  - Ánh xạ tham số Null/số/chuỗi đúng kiểu.
- **Regression**: full `npm test`; `buildContentFile` golden **KHÔNG đổi**; `CI=true npm run build` **0 warning**; `cargo build` (src-tauri) sạch; `cargo tree -i libsqlite3-sys` chỉ **một** bản.
- **GUI** (cần Tauri + SQL ⇒ **Thầy nghiệm thu** trong `npx tauri dev`), checklist:
  - Thêm / sửa / **Nhập hàng loạt** vài chục bài → chạy trơn như cũ; tải lại thấy đủ + đúng phân loại.
  - **Ép lỗi giả** (tạm thêm 1 lệnh sai vào giữa 1 builder) → thấy **toast lỗi**, và dữ liệu **y nguyên** (không bài dở, không phân loại nham nhở) → gỡ lệnh giả.
  - Đổi tên / xoá tag toàn kho, xoá hẳn, dọn thùng rác → đúng; hỏng (nếu ép) → không đổi.
  - Xuất `.tex` một đề bất kỳ sau các thao tác → công thức nguyên vẹn (đường xuất không dính).

## 8. Việc kèm theo (ngoài phạm vi code)
- Sửa Rust ⇒ **phải build lại**. `npx tauri dev` tự build → **dùng được ngay** để nghiệm thu.
- Để vào **bản cài `.msi`** thì cần **đóng gói lại** (gộp với việc "Đóng gói v1.2" còn treo ở Đợt A). **Là bước riêng**, làm sau khi code + test xong.

## 9. Những gì KHÔNG làm đợt này (chốt để tránh phình)
- Bọc transaction cho 3 đường **một-lệnh** (đã atomic sẵn).
- Đổi sang WAL; gộp nhiều thao tác người dùng vào **một** transaction lớn (mỗi thao tác vẫn là một transaction riêng — đủ "trọn gói").
- Chống **backup copy** đọc file DB đúng lúc đang ghi (vấn đề riêng của auto-backup, không thuộc đợt này).
- Đóng gói `.msi` chính thức (§8).

## 10. Backlog / mở rộng sau
- Đưa **cả** đường ghi (kể cả một-lệnh) qua `runTx` cho nhất quán, nếu muốn một cửa ghi duy nhất.
- Cân nhắc WAL để đọc-ghi song song mượt hơn khi kho phình to (kèm rà soát auto-backup copy `-wal/-shm`).
- Gói "Đóng gói v1.2" (Đợt A còn treo) để phát hành bản cài mới.

---
*Thầy đã DUYỆT thiết kế (chọn: transaction thật xuống Rust · phạm vi cả 7 đường ghi). Plan: `.docs/plans/2026-07-16-ghi-tron-goi-transaction.md`. Build XONG Task 1–5 (JS builder+test, runTx+PRAGMA, Rust execute_tx+test ROLLBACK, nối hook) — toàn bộ test JS (104) + Rust (1) + build production đều xanh; `libsqlite3-sys` một bản; mối nối IPC `dbPath`→`db_path` xác nhận theo quy ước Tauri v2. Còn Task 6: Thầy nghiệm thu trong `npx tauri dev`.*
