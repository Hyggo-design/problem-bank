# Thiết kế: Chống mất dữ liệu âm thầm — báo lỗi khi lưu/xuất (Đợt A #1)

- **Ngày:** 2026-07-13
- **Trạng thái:** ĐÃ DUYỆT thiết kế (qua brainstorm) — Thầy Sơn
- **Roadmap:** [`ROADMAP.md`](../ROADMAP.md) › Đợt A, Ưu tiên #1
- **Liên quan:** `src/hooks/useProblems.js` (tầng lưu), `src/App.jsx` (bên gọi + toast), `src/hooks/useToast.js` (đã có sẵn `error()`); **file mới** `src/utils/problemWrites.js` (tầng ghi CSDL tách ra để kiểm được)

---

## 1. Mục tiêu

Khi lưu/nhập/xoá **thất bại** (ổ D rớt, CSDL bị khoá, đĩa đầy…), app hiện **vẫn báo "thành công"** rồi âm thầm nuốt lỗi → Thầy tin đã lưu nhưng mở lại thì **bài biến mất**. Đây là rủi ro mất dữ liệu thật nhất khi đang nhập kho.

**Sửa:** chỉ báo *"thành công"* **sau khi** ghi CSDL xong thật; nếu hỏng thì **báo lỗi rõ (toast đỏ)** và **không làm mất** thứ Thầy vừa gõ.

---

## 2. Nguồn gốc bệnh (2 lỗi cộng dồn)

1. **Nuốt lỗi:** trong `useProblems.js`, mọi hàm đổi dữ liệu bọc `try { … } catch (error) { console.error(…) }` — hỏng thì **chỉ ghi console**, không báo ra ngoài, không trả kết quả.
2. **Không chờ:** trong `App.jsx`, bên gọi **không `await`** — gọi hàm (async) xong hiện toast "thành công" **ngay lập tức**, trước cả khi CSDL kịp ghi.

→ Phải sửa **cả hai**: (a) hàm lưu **báo thành/bại**, (b) bên gọi **chờ rồi rẽ nhánh**.

**Thuận lợi:** `useToast.js` **đã có sẵn** `error()` (toast đỏ 3s) — chỉ chưa được `App.jsx` dùng. Không phải dựng gì mới.

---

## 3. Quyết định đã chốt (từ phiên brainstorm)

| # | Hạng mục | Quyết định |
|---|---|---|
| 1 | **Phạm vi** | **Cả 8 hàm** đổi dữ liệu: thêm / sửa / nhập / xoá mềm / xoá hàng loạt / khôi phục / xoá hẳn / dọn thùng rác. App thành thật hoàn toàn. |
| 2 | **Cơ chế báo kết quả** | Mỗi hàm trả về **`true` = ghi xong** / **`false` = hỏng** (giữ `console.error` để tra cứu). Bên gọi `await` rồi rẽ nhánh: xong → toast xanh; hỏng → **toast đỏ**. |
| 3 | **Lưu hỏng không mất công gõ** | Thêm/Sửa/Nhập: hỏng → **giữ nguyên cửa sổ đang mở**, không set preview. Nội dung còn để thử lại. |
| 4 | **Bỏ hiệu ứng giả khi hỏng** | Xoá/Khôi phục/…: hỏng → **không** chạy hiệu ứng "như đã thành công" (vd không hiện nút *Hoàn tác*, không gỡ khỏi giỏ, không xoá preview). |
| 5 | **Cách kiểm** | **Tách tầng ghi CSDL** ra `src/utils/problemWrites.js` (hàm thuần, **ném lỗi** khi hỏng — không nuốt). Test file này bằng "db giả". **Không thêm thư viện.** |
| 6 | **Không đụng đường xuất `.tex`** | Chỉ chạm tầng lưu + toast. Golden-file test giữ **3/3** không đổi. |
| 7 | **Transaction (all-or-nothing)** | **NGOÀI phạm vi** — đẩy sang **Đợt C** (đã ghi trong roadmap). Fix này *phát hiện & báo* lỗi; chưa đảm bảo ghi trọn gói. |

---

## 4. Hiện trạng (đã đối chiếu code 2026-07-13)

### `src/hooks/useProblems.js`
- `saveClassification(db, id, cls)` — **hàm private mức module** (L18–32): xoá-rồi-ghi 3 bảng nối phân loại.
- 8 hàm đổi dữ liệu, tất cả cùng khuôn *try → console.error*, **không trả gì** khi lỗi:
  - `addProblem` (L86–120): `INSERT OR REPLACE` + `saveClassification`; cập nhật state ở **cuối try**. Lỗi → `console.error` L119.
  - `updateProblem` (L123–144): `UPDATE` + `saveClassification`; state cuối try. Lỗi → L143.
  - `saveImportedProblems` (L206–255): bulk insert theo **chunk 50** + `saveClassification` từng bài; state cuối try. Lỗi → L253.
  - `deleteProblem` (L147–153) · `bulkDeleteProblems` (L156–166) · `restoreProblem` (L169–175) · `purgeProblem` (L178–187) · `emptyTrash` (L190–203): mỗi hàm `await db.execute(...)` rồi `await loadProblems()` trong try; lỗi → console.error.
- `loadProblems` (L40–81) là **đọc**, không phải ghi → **ngoài phạm vi** (đọc hỏng không gây mất dữ liệu, không có toast "thành công" giả).

### `src/App.jsx` — mọi điểm gọi (đã rà: chỉ nằm ở đây; 3 modal chỉ nhắc tên trong comment)
- `useToast`: đang lấy `{ success, info, undoToast }` (L49) — **thiếu `error`**.
- **Thêm** (2 chỗ): `handleConfirmDuplicateSave` type 'add' (L124) + `AddProblemModal.onSave` (L285). Đều: gọi xong `setShowAddModal(false)`, `success('Đã thêm bài tập!')`, `setSelectedPreview(prob)` — **không await**.
- **Sửa** (2 chỗ): `handleConfirmDuplicateSave` type 'edit' (L129) + `EditProblemModal.onSave` (L303).
- **Nhập**: `SmartImportModal.onSave` (L317): `saveImportedProblems(newProbs)`; `success('Cập nhật N bài…')`; đóng modal.
- **Xoá mềm 1 bài**: `onDelete` (L227–232): xoá → `removeFromCart`, xoá preview, `undoToast('Đã chuyển vào thùng rác', () => restoreProblem(id))`.
- **Xoá hàng loạt**: `handleBulkDelete` (L93–103, **đã `async`**): `bulkDeleteProblems(ids)` → gỡ khỏi giỏ, clear chọn, clear preview, `success`.
- **Khôi phục**: trong `undoToast` (L231) + `TrashPage.onRestore` (L267).
- **Xoá hẳn**: `TrashPage.onPurge` (L268). **Dọn rác**: `TrashPage.onEmptyAll` (L269).

### `src/hooks/useToast.js`
- `error(message)` — toast đỏ, 3000ms, top-right (L12–17). **Sẵn sàng, chỉ cần nối vào.**

---

## 5. Thiết kế chi tiết

### 5.1. File mới `src/utils/problemWrites.js` — tầng ghi CSDL thuần (kiểm được)

Hàm **thuần dữ liệu**: nhận `db` (đối tượng đã mở), `await db.execute(...)`, **KHÔNG bọc try/catch** → hỏng thì **ném lỗi** cho tầng trên bắt. Chuyển `saveClassification` xuống đây (export). Danh sách:

| Hàm | Việc | Ghi chú |
|---|---|---|
| `saveClassification(db, id, cls)` | xoá-rồi-ghi 3 bảng nối | chuyển từ `useProblems.js` xuống (export) |
| `insertProblem(db, p)` | `INSERT OR REPLACE` bảng `problems` + `saveClassification` | dùng cho thêm mới |
| `updateProblemRow(db, p)` | `UPDATE problems …` + `saveClassification` | dùng cho sửa |
| `insertImportedProblems(db, list)` | bulk insert chunk-50 + `saveClassification` từng bài | rỗng → no-op |
| `softDeleteProblem(db, id)` | `UPDATE deletedAt = now` | |
| `softDeleteMany(db, ids)` | `UPDATE … WHERE id IN (…)` | **rỗng → return sớm** (tránh `IN ()`) |
| `restoreProblemRow(db, id)` | `UPDATE deletedAt = NULL` | |
| `purgeProblemRow(db, id)` | `DELETE` bản ghi + 3 bảng nối | |
| `emptyTrashRows(db)` | select id đã xoá → xoá bảng nối + `problems` | rỗng → no-op |

> Nội dung SQL **bê nguyên** từ code hiện tại (không đổi câu lệnh, không đổi thứ tự tham số) — chỉ **di chuyển vị trí**. Rủi ro thấp.

### 5.2. `useProblems.js` — bọc tầng trên, quy ra thành/bại

Import các hàm trên. Mỗi mutation theo khuôn:

```js
const addProblem = async (newProblem) => {
  try {
    if (!newProblem || !newProblem.id) throw new Error("Bài tập thiếu ID");
    const db = await getDb();
    await insertProblem(db, newProblem);
    setProblems(prev => [newProblem, ...prev.filter(p => p.id !== newProblem.id)]); // chỉ cập nhật khi ĐÃ ghi xong
    return true;
  } catch (error) {
    console.error("Lỗi thêm bài:", error);
    return false;   // ← thay vì nuốt lặng
  }
};
```

- **Điểm mấu chốt:** `setProblems(...)` / `loadProblems()` chỉ chạy **trong try, sau `await` ghi** → hỏng thì danh sách **không** dính bài ma.
- Các hàm xoá/khôi phục/dọn: `await …Row(db, …)` → `await loadProblems()` → `return true`; catch → `return false`.
- `checkDuplicate`, `loadProblems`: **giữ nguyên** (ngoài phạm vi).

### 5.3. `App.jsx` — chờ rồi rẽ nhánh (thành công vs lỗi)

Thêm `error` vào `useToast` (L49). Mỗi điểm gọi: `await` hàm, `if (ok) {…thành công cũ…} else { error(...) }`.

| Thao tác | Thành công (giữ như cũ) | **Thất bại (mới)** |
|---|---|---|
| Thêm (L124, L285) | đóng modal, `success('Đã thêm bài tập!')`, set preview | **giữ modal Thêm**, `error(msgLuu)`, **không** set preview (ở nhánh dup: `setPendingSave(null)` để đóng cảnh báo trùng nhưng **không** đóng modal Thêm) |
| Sửa (L129, L303) | đóng modal, `success('Cập nhật thành công!')`, cập nhật preview | **giữ modal Sửa**, `error(msgLuu)`, không đổi preview |
| Nhập (L317) | đóng modal, `success('Cập nhật N bài…')` | **giữ modal Nhập**, `error(msgNhap)` |
| Xoá mềm (L227–232) | `removeFromCart`, xoá preview, `undoToast(...)` | `error(msgXoa)`; **bỏ** removeFromCart/xoá preview/undoToast |
| Xoá hàng loạt (L97) | gỡ khỏi giỏ, clear chọn/preview, `success` | `error(msgXoa)`; **bỏ** các bước dọn |
| Khôi phục (L231, L267) | `success('Đã khôi phục bài')` | `error(msgKhoiPhuc)` |
| Xoá hẳn (L268) | `success('Đã xoá hẳn')` | `error(msgXoaHan)` |
| Dọn rác (L269) | `success('Đã dọn sạch thùng rác')` | `error(msgDonRac)` |

**Câu chữ toast lỗi (chốt ở bước plan, hướng như sau):**
- `msgLuu` = "Chưa lưu được — ổ đĩa hoặc cơ sở dữ liệu đang trục trặc. Bài **CHƯA** được lưu, Thầy thử lại nhé."
- `msgNhap` = "Chưa nhập được — CSDL đang trục trặc. Thầy thử lại nhé."
- `msgXoa`/`msgKhoiPhuc`/`msgXoaHan`/`msgDonRac` = "Chưa {xoá/khôi phục/xoá hẳn/dọn} được — thử lại nhé."

> `undoToast` (L231) có `onUndo` gọi `restoreProblem` → đổi thành `async () => { if (!(await restoreProblem(id))) error(msgKhoiPhuc); }`.

---

## 6. Điểm sửa (tóm tắt)

| File | Thay đổi |
|---|---|
| `src/utils/problemWrites.js` | **MỚI** — 9 hàm ghi thuần (mục 5.1), ném lỗi khi hỏng |
| `src/utils/problemWrites.test.js` | **MỚI** — test "db giả": ok → resolve; lỗi → **reject** (không nuốt) |
| `src/hooks/useProblems.js` | Bỏ `saveClassification` private (chuyển đi); import tầng ghi; 8 hàm → `return true/false`; state chỉ đổi khi ghi xong |
| `src/App.jsx` | Thêm `error` vào `useToast`; 9 điểm gọi → `await` + rẽ nhánh xanh/đỏ (bảng mục 5.3) |

**Tuyệt đối không sửa:** `buildProblemTex.js`, `buildContentFile.js`, `ExportModal.jsx`, `db.js`, schema, Rust.

---

## 7. Kiểm thử & nghiệm thu

- **Đơn vị (mới):** `src/utils/problemWrites.test.js` — dựng **db giả**:
  - `okDb` = `{ execute: jest.fn().mockResolvedValue(...), select: jest.fn().mockResolvedValue([]) }` → mỗi hàm **resolve**, `execute` được gọi đúng (spot-check SQL/tham số).
  - `failDb` = `{ execute: jest.fn().mockRejectedValue(new Error('disk full')) }` → mỗi hàm **`rejects.toThrow`** (chứng minh **không nuốt lỗi**).
  - Biên: `insertImportedProblems(db, [])` và `softDeleteMany(db, [])` → no-op, resolve.
- **Bộ cũ giữ xanh:** `npm test` — **golden export `buildContentFile` 3/3 KHÔNG đổi** (không chạm đường xuất); mọi suite cũ pass.
- **Build:** `CI=true npm run build` → **0 warning** (hàm/biến mới đều được dùng).
- **GUI (Thầy nghiệm thu qua `npx tauri dev`) — happy-path còn nguyên:**
  1. Thêm/Sửa/Nhập bài → toast xanh, bài hiện, mở lại app còn đủ.
  2. Xoá mềm → có nút Hoàn tác; Khôi phục/Xoá hẳn/Dọn rác chạy đúng.
  3. Không có toast lỗi lạ khi thao tác bình thường.
- *(Nhánh **lỗi** khó dựng tay trong Tauri thật (giả lập đĩa đầy) → **bài test đơn vị là bằng chứng** cho nhánh lỗi; GUI chỉ xác nhận happy-path không hư.)*

---

## 8. Ngoài phạm vi (backlog)

- **Ghi "trọn gói" (transaction / all-or-nothing)** → **Đợt C** (đã ghi trong `ROADMAP.md`). Fix này chưa đảm bảo atomic: nếu ghi bảng `problems` xong mà bước phân loại hỏng → dở dang; bù lại **bấm lưu lại tự sửa** (`INSERT OR REPLACE` + xoá-rồi-ghi). Vướng: plugin SQL Tauri dùng pool kết nối nên `BEGIN/COMMIT` thủ công không chắc ăn.
- **Nút "Thử lại" trong toast lỗi** — v1 chỉ giữ modal để Thầy tự bấm Lưu lại; nút retry để sau nếu cần.
- **Đọc hỏng (`loadProblems`)** — hiện đã log; nếu muốn báo banner "không tải được kho" thì là mini-project riêng.

---

## 9. Vì sao thiết kế thế này (Teach Me Why)

- **Tách tầng ghi ra file thuần** → kiểm được nhánh lỗi **không cần GUI, không thêm thư viện**, đúng gu 9 file test hiện có; lại đặt sẵn chỗ để gắn transaction ở Đợt C và dễ chuyển khi CRA→Vite.
- **Trả `true/false` + `await`** → sửa đúng **cả hai** gốc bệnh (nuốt lỗi *và* không chờ); chỉ khoe thành công khi CSDL đã ghi xong thật.
- **State chỉ đổi khi ghi xong** → màn hình không bao giờ hiện "bài ma" chưa nằm trong CSDL.
- **Giữ modal khi hỏng** → mất kết nối/đĩa đầy vẫn không mất công Thầy gõ; sửa xong bấm lại là được.
- **Không đụng đường xuất `.tex`** → phần "thiêng" nhất khỏi lo, golden-file giữ nguyên.
