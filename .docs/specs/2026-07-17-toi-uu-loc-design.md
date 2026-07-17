# Thiết kế: Tối ưu phần lọc (đóng Đợt C)

- **Ngày:** 2026-07-17
- **Trạng thái:** ĐÃ DUYỆT thiết kế (qua brainstorm) — chờ Thầy duyệt spec này trước khi lập plan
- **Người duyệt:** Thầy Sơn
- **Liên quan:** `src/components/DataGrid.jsx` (đường lọc feed), `src/utils/classification.js` (hàm thuần dùng chung), `src/utils/classification.test.js`. Mục cuối **Đợt C** trong `.docs/ROADMAP.md`.

---

## 1. Mục tiêu

Mỗi lần lọc/tìm/sắp xếp trong feed, để biết "nhánh này thuộc **hệ** nào" app phải **leo ngược cây phân loại** (`getRootHeId`) — và nó leo lại **cho từng nhánh của từng bài, mỗi lần lọc**. Việc leo cây đó lặp vô ích: quan hệ "nhánh → hệ gốc" **không đổi** trừ khi Thầy sửa cây phân loại.

Tối ưu: **tính sẵn bảng tra "nhánh → hệ gốc" đúng MỘT LẦN** (chỉ tính lại khi cây phân loại đổi). Khi lọc, app **đọc đáp án có sẵn** thay vì leo cây.

**Đây là việc "làm gọn + sẵn sàng cho kho lớn", KHÔNG phải sửa lag Thầy đang thấy.** Ở ~73 bài (và cả ~2000 bài trong 5 năm tới) lọc đã tức thời — thay đổi này **vô hình** hôm nay, chỉ có ý nghĩa khi kho lên hàng chục nghìn bài. (Thầy đã chọn phương án "tối ưu gọn, đóng Đợt C" — KHÔNG kèm test tải/dữ liệu giả.)

---

## 2. Quyết định đã chốt (từ phiên brainstorm)

| # | Hạng mục | Quyết định |
|---|---|---|
| 1 | **Phạm vi** | Chỉ tối ưu **đường lọc feed** (`DataGrid`) — đúng mục roadmap. KHÔNG đụng các nơi khác dùng `getRootHeId` (ClassificationPicker chạy trong form, không phải mỗi phím gõ). |
| 2 | **Kỹ thuật** | Tính sẵn `rootHeByCatId` (bảng `{ [catId]: heIdGốc }`) **một lần** qua hàm thuần mới `buildRootHeMap(parentMap)`; nhớ lại bằng `useMemo` theo `[parentMap]`. Lọc đọc bảng thay vì gọi `getRootHeId`. |
| 3 | **Nhà của hàm mới** | `src/utils/classification.js` — vốn là **util thuần** (không import React/DB, "để test được"), đã được `DataGrid` import (`groupClassificationByHe`), và **đã có sẵn** hàm leo cây riêng `rootHeId` → `buildRootHeMap` tái dùng, DRY trong cùng file. |
| 4 | **Kết quả không đổi** | Kết quả lọc **y hệt từng bài**, màn hình y hệt, **xuất `.tex` y hệt từng byte**. Bảo toàn cả ca id mồ côi (xem §5.3). |
| 5 | **Mức đầu tư** | "Gọn": 1 hàm thuần nhỏ + test, sửa vài dòng `DataGrid`. KHÔNG dữ liệu giả, KHÔNG đo benchmark, KHÔNG đổi giao diện. |

---

## 3. Ràng buộc & Guardrail

- **Chỉ sửa 3 file:** `src/utils/classification.js` (thêm 1 hàm thuần), `src/utils/classification.test.js` (thêm test), `src/components/DataGrid.jsx` (dùng bảng tra).
- **KHÔNG đụng:** CSDL/schema (`db.js`), dữ liệu phân loại (`useTaxonomy` — giữ nguyên `getRootHeId`/`getDescendantIds`, chỉ **thôi import** `getRootHeId` vào DataGrid), đường xuất `.tex` (`buildProblemTex.js`, `buildContentFile.js`, `ExportModal.jsx`), Rust. → **golden-file test giữ nguyên 3/3, đường xuất byte-identical.**
- **Không thêm thư viện. Không đổi giao diện. Không thêm state toàn cục.**
- **Không đổi hành vi lọc** — mọi bộ lọc (hệ / nhánh + nhánh con / lớp / độ khó / tag / tìm / chưa-phân-loại / chỉ-chưa-dùng) trả **đúng tập bài như cũ**.

---

## 4. Hiện trạng (đã đối chiếu code 2026-07-17)

- **`DataGrid.jsx:59-60`** — bên trong `filteredAndSorted = useMemo(...)`, với mỗi bài:
  ```js
  if (!unclassifiedMode && selectedHe &&
      !(p.categoryIds || []).some((cid) => getRootHeId(cid, parentMap) === selectedHe)) return false;
  ```
  `getRootHeId` leo `while (parentMap[cur]) cur = parentMap[cur]` — **gọi cho mỗi cid của mỗi bài, mỗi lần useMemo chạy lại** (đổi bộ lọc / gõ tìm / đổi sắp xếp).
- **`DataGrid.jsx:4`** — `import { useTaxonomy, getDescendantIds, getRootHeId } from '../hooks/useTaxonomy';` (`getRootHeId` **chỉ** dùng ở dòng 60; `getDescendantIds` dùng ở dòng 43 — GIỮ).
- **`DataGrid.jsx:27`** — `parentMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.parent_id])), [categories])` → **đã có sẵn**, chứa mọi id nhánh làm khoá.
- **`classification.js:9-13`** — private `rootHeId(catId, parentMap)` leo cây **y hệt** `getRootHeId` (đã trùng lặp logic). `buildRootHeMap` sẽ tái dùng.
- **`useTaxonomy.jsx:210`** — `getRootHeId` vẫn được `ClassificationPicker.jsx` dùng → **giữ export**, không xoá.
- **Test** (Vitest, `globals:true`): `classification.test.js` đã có fixture cây nhỏ `Toán Chuyên > Số học > {Đồng dư thức, Số nguyên tố}` + `parentMap` — tái dùng cho test hàm mới.

---

## 5. Thiết kế chi tiết

### 5.1. Hàm thuần mới — `src/utils/classification.js`
```js
// Bảng tra "nhánh -> hệ gốc" tính sẵn MỘT LẦN cho cả cây, để đường lọc
// khỏi leo ngược parentMap cho từng bài mỗi lần lọc.
//   parentMap: { [catId]: parent_id }  (mọi id nhánh làm khoá)
// Trả về: { [catId]: heIdGốc }. Hàm THUẦN — dùng lại `rootHeId` nội tuyến ở trên.
export const buildRootHeMap = (parentMap) => {
  const map = {};
  for (const id of Object.keys(parentMap)) map[id] = rootHeId(id, parentMap);
  return map;
};
```
- Đặt ngay dưới `rootHeId` (đã có, private) trong file. `rootHeId` không đổi.
- Chi phí xây bảng: O(số nhánh × độ sâu) — vài chục nhánh, chạy **một lần khi cây đổi**, không phải mỗi lần lọc.

### 5.2. `DataGrid.jsx`
- **Dòng 4** — bỏ `getRootHeId` khỏi import hook (tránh `no-unused-vars` khi `CI=true npm run build`):
  ```js
  import { useTaxonomy, getDescendantIds } from '../hooks/useTaxonomy';
  ```
- **Dòng 5** — thêm `buildRootHeMap` vào import classification:
  ```js
  import { groupClassificationByHe, buildRootHeMap } from '../utils/classification';
  ```
- **Thêm memo** (cạnh các memo tra cứu, sau `parentMap`):
  ```js
  // Bảng tra "nhánh -> hệ gốc" tính sẵn, để lọc theo hệ khỏi leo cây mỗi lần.
  const rootHeByCatId = useMemo(() => buildRootHeMap(parentMap), [parentMap]);
  ```
- **Dòng 59-60** — đổi lời gọi leo cây thành đọc bảng:
  ```js
  if (!unclassifiedMode && selectedHe &&
      !(p.categoryIds || []).some((cid) => (rootHeByCatId[cid] ?? cid) === selectedHe)) return false;
  ```
- **Mảng phụ thuộc của `filteredAndSorted` useMemo (dòng 78)** — thêm `rootHeByCatId` (thay cho `parentMap` nếu `parentMap` không còn dùng trực tiếp trong hàm lọc; **giữ cả hai cho an toàn** nếu `parentMap` vẫn xuất hiện — kiểm lúc build). *(Ghi chú: `parentMap` không còn được tham chiếu bên trong hàm lọc sau khi đổi; sẽ thêm `rootHeByCatId` và bỏ `parentMap` khỏi deps để tránh cảnh báo `react-hooks/exhaustive-deps` — xác nhận bằng build 0 warning.)*

### 5.3. Vì sao "y hệt từng bài" — chứng minh tương đương (kể cả id mồ côi)
Cũ: `getRootHeId(cid, parentMap) === selectedHe`. Mới: `(rootHeByCatId[cid] ?? cid) === selectedHe`.

| Ca | Cũ | Mới | Bằng nhau? |
|---|---|---|---|
| `cid` là nhánh thường (leo tới hệ `R`) | `R` | `rootHeByCatId[cid]` = `R` (cùng phép leo, cùng `parentMap`) | ✓ |
| `cid` là chính hệ gốc (không cha) | `cid` | `rootHeByCatId[cid]` = `cid` | ✓ |
| `cid` **mồ côi** (nhánh đã xoá, không có trong cây) | `cid` (vì `parentMap[cid]` undefined) | không có khoá → `undefined ?? cid` = `cid` | ✓ |

`selectedHe` luôn là id một hệ thật ⇒ id mồ côi không khớp ở cả hai bản (cùng bị loại). **Cùng dùng chung `parentMap`** ⇒ mọi phép leo giống hệt. Không có ca nào lệch.

---

## 6. Điểm sửa (3 file)

| File | Thay đổi |
|---|---|
| `src/utils/classification.js` | Thêm hàm thuần `buildRootHeMap(parentMap)` (dưới `rootHeId`). |
| `src/utils/classification.test.js` | Thêm khối test `buildRootHeMap`: nhánh lá→hệ, nhánh giữa→hệ, hệ→chính nó, id mồ côi→trả chính id. |
| `src/components/DataGrid.jsx` | (a) bỏ `getRootHeId` khỏi import hook; (b) thêm `buildRootHeMap` vào import classification; (c) memo `rootHeByCatId`; (d) đổi dòng lọc dùng bảng tra; (e) chỉnh mảng phụ thuộc useMemo. |

**Tuyệt đối không sửa:** mọi file khác (đặc biệt `buildProblemTex.js`, `buildContentFile.js`, `ExportModal.jsx`, `db.js`, Rust, `useTaxonomy.jsx`).

---

## 7. Kiểm thử & nghiệm thu

- **Đơn vị (mới):** thêm test cho `buildRootHeMap` trong `classification.test.js` (tái dùng fixture cây có sẵn) — phủ 4 ca ở §6. *(Cũng là test đầu tiên khoá logic "nhánh → hệ gốc".)*
- **Hồi quy:** `npm test` (Vitest) → **toàn bộ test cũ vẫn xanh**; **golden `buildContentFile` KHÔNG đổi** (đường xuất không bị chạm) → `.tex` byte-identical.
- **Build:** `CI=true npm run build` (hoặc `npm run build`) → **0 warning** (đã bỏ import thừa + chỉnh deps).
- **GUI (Thầy nghiệm thu qua `npx tauri dev`):** so **đúng số bài** trước/sau ở mỗi bộ lọc —
  1. Khoá từng **hệ** → feed hiện đúng các bài của hệ đó (như cũ).
  2. Bấm một **nhánh** (gồm nhánh con) → đúng tập bài.
  3. Lọc **lớp** / **độ khó** / **tag** (VÀ/HOẶC) → đúng.
  4. **Tìm kiếm** + phối hợp bộ lọc → đúng.
  5. **Chưa phân loại** (bấm số) + **Chỉ hiện chưa dùng** → đúng.
  6. Đổi **sắp xếp** → thứ tự đúng, không lỗi.
  - *(DataGrid cần `useTaxonomy` (SQL Tauri) → chỉ chạy trong Tauri thật; Claude không tự kiểm GUI được, giống các màn khác.)*

---

## 8. Ngoài phạm vi (backlog)

- Tối ưu các nơi khác dùng `getRootHeId` (ClassificationPicker/Dashboard/Matrix) — không cần, không phải đường nóng.
- Gộp `rootHeId` trùng lặp giữa `classification.js` và `useTaxonomy.jsx` về một chỗ — dọn DRY, để sau; lần này **không đụng** `useTaxonomy` cho an toàn.
- Tính sẵn cả **hệ theo từng bài** (`heByProblemId`) để bỏ luôn vòng `.some(...)` — thừa ở quy mô này (YAGNI).
- Xây `buildRootHeMap` bằng leo-cây-có-nhớ để đạt O(n) — không cần (vài chục nhánh).

---

## 9. Vì sao thiết kế thế này (Teach Me Why)

- **Tính sẵn bảng tra một lần** đúng là bản chất vấn đề roadmap nêu ("`getRootHeId` chạy cho mỗi bài × mỗi lần lọc"): dời việc leo cây từ **mỗi lần lọc** sang **một lần khi cây đổi**.
- **Đặt ở `classification.js`** (util thuần đã test được) thay vì `useTaxonomy.jsx` (có React/DB): test nhẹ, không kéo context/DB vào môi trường test; lại **tái dùng** `rootHeId` đã có → DRY, không đẻ thêm bản leo cây thứ ba.
- **Fallback `?? cid`** giữ **tương đương tuyệt đối** với `getRootHeId` cũ, kể cả id mồ côi — đổi hiệu năng, **không đổi hành vi**.
- **Bỏ import `getRootHeId` thừa** để `CI=true` build 0 warning (bài học lặp lại của dự án: import/biến thừa làm gãy build).
- **Chỉ 3 file, không chạm phần "thiêng"** (xuất `.tex`/CSDL/Rust) → golden-file khỏi lo, rủi ro thấp — đúng tinh thần "gọn, đóng Đợt C".
```
