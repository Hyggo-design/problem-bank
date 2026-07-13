# Thiết kế: Điều hướng bàn phím + chọn dải trong feed (Đợt A 🎨)

- **Ngày:** 2026-07-13
- **Trạng thái:** CHỜ DUYỆT (đã brainstorm; Enter=Xem đầy đủ đã chốt)
- **Người duyệt:** Thầy Sơn
- **Roadmap:** [`ROADMAP.md`](../ROADMAP.md) › Đợt A
- **Liên quan:** `DataGrid.jsx` (feed), `ProblemCard.jsx` (thẻ), `useKeyboardShortcuts.js` (phím tắt), `App.jsx` (wiring); **file mới** `src/utils/feedSelection.js` (+ test)

---

## 1. Mục tiêu

Chọn và duyệt bài trong feed **nhanh hơn, ít rê chuột hơn**:
- **Chọn dải** bằng `Shift + bấm` (thay vì bấm từng thẻ).
- **Điều hướng bằng phím** (↑/↓ chạy "khung sáng", Space tick chọn, Shift+↑/↓ chọn loạt).
- Lấp **`onSelectAll` đang rỗng** → `Ctrl+Shift+A` chọn tất cả bài đang hiện.

---

## 2. Quyết định đã chốt (từ brainstorm)

| # | Hạng mục | Quyết định |
|---|---|---|
| 1 | **Chọn dải bằng chuột** | `Shift + bấm` một thẻ → **cộng thêm** cả dải từ "mốc" (thẻ tương tác gần nhất) đến thẻ này vào vùng đang chọn (KHÔNG xoá lựa chọn cũ). Bấm thường vẫn tick/bỏ 1 thẻ như hiện tại. |
| 2 | **Khung sáng ("thẻ đang ngắm")** | Một viền/nền nhấn **khác màu** với "đã tick chọn". ↑/↓ di chuyển nó, tự cuộn vào tầm nhìn. Chỉ là tiêu điểm để thao tác — **không** tự thay đổi vùng chọn. |
| 3 | **Space** | Tick chọn/bỏ thẻ đang ngắm; đặt thẻ đó làm "mốc". |
| 4 | **Shift + ↑/↓** | Vừa di chuyển khung sáng vừa **gộp dải** mốc→hiện tại vào vùng chọn (chọn loạt bằng phím). |
| 5 | **Enter** | Mở **"Xem đầy đủ"** (PreviewModal) của thẻ đang ngắm. *(Thầy đã chọn)* |
| 6 | **Ctrl+Shift+A** | Chọn **tất cả bài đang hiện trong feed** (đúng bộ lọc/tìm kiếm) — không phải toàn kho. |
| 7 | **Ctrl+Shift+N / Esc** | Bỏ chọn hết *(đã chạy sẵn — giữ nguyên)*. |
| 8 | **Đổi bộ lọc/tìm/sắp xếp** | Khung sáng **về đầu danh sách** (tránh trỏ vào chỗ không còn tồn tại). |
| 9 | **Del/Backspace** | **Giữ nguyên** = xoá *các bài đã tick* (không đổi thành xoá thẻ đang ngắm — tránh bất ngờ). |

---

## 3. Ràng buộc & Guardrail

- **Thuần tương tác giao diện.** KHÔNG đụng lưu trữ/CSDL, KHÔNG đụng đường xuất `.tex` (`buildProblemTex.js`, `buildContentFile.js`, `ExportModal.jsx`, `db.js`, Rust) → **golden-file test giữ 3/3, byte-identical**.
- **Không thêm thư viện** — dùng `hotkeys-js` (đã có) + ref của `Virtuoso` (đã có).
- **Không phá thao tác cũ:** bấm thẻ vẫn tick chọn; các nút trên thẻ vẫn `stopPropagation`.
- **Không hijack phím khi đang gõ:** trong ô Tìm kiếm, ↑/↓ vẫn di chuyển con trỏ chữ, không nhảy feed.

---

## 4. Hiện trạng (đã đối chiếu code 2026-07-13)

- **`DataGrid.jsx`**: feed = `<Virtuoso data={filteredAndSorted} .../>`; `filteredAndSorted` tính **trong** DataGrid (App không có). Thẻ nhận `selected={selectedIds.includes(id)}`, `onToggleSelect={() => onSelectChange(problem.id)}`. Chưa có ref Virtuoso, chưa có khái niệm "đang ngắm".
- **`ProblemCard.jsx`**: `onClick={onToggleSelect}` (bấm thân = toggle). `selected` → viền `--color-accent` + dấu ✓ `CheckCircle2`. Nút footer đều `stopPropagation`.
- **`useKeyboardShortcuts.js`** (hotkeys-js): đã gán `ctrl+shift+a → onSelectAll` (**rỗng**), `ctrl+shift+n → onDeselectAll`, `escape → onEscape`, `del/backspace → onDelete`. `hotkeys.filter` chặn phím khi con trỏ trong `INPUT/SELECT/TEXTAREA` (trừ Esc).
- **`App.jsx`**: `onSelectAll: () => {}` (L75); `onDeselectAll` → `setSelectedIds([])`; `onSelectChange(id)` toggle; preview là `PreviewModal` (overlay). `selectedIds` ở `useUIState`.

---

## 5. Thiết kế chi tiết

### 5.1. File mới `src/utils/feedSelection.js` — logic chọn thuần (test được)
- `rangeIds(orderedIds, i, j)` → mảng id từ `min(i,j)`..`max(i,j)` (bao gồm 2 đầu); `i` hoặc `j` < 0 → `[]`.
- `unionSelection(selectedIds, addIds)` → gộp không trùng, **giữ thứ tự cũ rồi thêm mới**.
- `clampIndex(idx, len)` → kẹp trong `[0, len-1]`; `len === 0` → `-1`.

### 5.2. `DataGrid.jsx`
- **State cục bộ:** `activeIndex` (số; `-1` = chưa ngắm), `anchorIndex` (mốc cho dải).
- **`virtuosoRef = useRef()`** → khi `activeIndex` đổi, gọi `virtuosoRef.current.scrollIntoView({ index: activeIndex })` (đưa thẻ đang ngắm vào tầm nhìn).
- **Khung bọc feed có `tabIndex={0}` + `onKeyDown`** (tự nhận tiêu điểm khi vào màn feed):
  - `ArrowDown/ArrowUp` → `activeIndex = clampIndex(activeIndex ± 1, n)`; cuộn vào tầm nhìn. (không đổi vùng chọn)
  - `Space` (preventDefault) → `onSelectChange(id[activeIndex])`; `anchorIndex = activeIndex`.
  - `Shift+ArrowDown/Up` → dời active như trên **rồi** `onSetSelection(unionSelection(selectedIds, rangeIds(ids, anchorIndex, activeIndex)))`.
  - `Enter` → `onPreviewClick(problems[activeIndex])`.
  - `Ctrl+Shift+A` (preventDefault) → `onSetSelection([...filteredIds])` (chọn hết theo lọc).
- **Reset:** `useEffect` theo `filteredAndSorted` → `activeIndex = filteredAndSorted.length ? 0 : -1`, `anchorIndex = -1`.
- Truyền `active={index === activeIndex}` xuống `ProblemCard`.
- **Bấm thẻ (đổi để biết Shift):** `onSelect={(e) => handleCardClick(index, e)}`:
  - `e.shiftKey && anchorIndex >= 0` → `onSetSelection(unionSelection(selectedIds, rangeIds(ids, anchorIndex, index)))`, đặt `activeIndex = index`.
  - ngược lại → `onSelectChange(id)` (toggle) + đặt `anchorIndex = activeIndex = index`.
- **Prop mới cần từ App:** `onSetSelection(ids)` — thay cả mảng chọn (dùng cho dải & chọn-tất-cả).

### 5.3. `ProblemCard.jsx`
- Nhận thêm prop **`active`**: khi `true` → thêm nhấn thị giác **khác** `selected` (vd `outline: 2px solid var(--color-cobalt)` + nền rất nhạt), dùng **token màu** (đúng cả dark mode).
- `onClick={onToggleSelect}` → `onClick={(e) => onSelect(e)}` (truyền event để DataGrid đọc `shiftKey`). Giữ `stopPropagation` các nút.

### 5.4. `useKeyboardShortcuts.js` + `App.jsx`
- **Bỏ** phím `ctrl+shift+a → onSelectAll` khỏi hook (và `onSelectAll: () => {}` ở App) — vì chọn-tất-cả giờ do feed xử lý (cần đúng danh sách đang lọc; hook toàn cục không có). Giữ `ctrl+shift+n`, `escape`, `del/backspace` như cũ.
- `App.jsx`: thêm `onSetSelection={ui.setSelectedIds}` cho `DataGrid`.

---

## 6. Điểm sửa (files)

| File | Thay đổi |
|---|---|
| `src/utils/feedSelection.js` | **MỚI** — `rangeIds`, `unionSelection`, `clampIndex` |
| `src/utils/feedSelection.test.js` | **MỚI** — test 3 hàm trên bằng mảng |
| `src/components/DataGrid.jsx` | active/anchor state, `virtuosoRef` + scroll, khung `tabIndex`+`onKeyDown`, shift-click, `onSetSelection` |
| `src/components/ProblemCard.jsx` | prop `active` (nhấn thị giác) + click truyền event |
| `src/hooks/useKeyboardShortcuts.js` | bỏ binding `ctrl+shift+a` rỗng |
| `src/App.jsx` | thêm `onSetSelection`; bỏ `onSelectAll` rỗng |

**Tuyệt đối không sửa:** đường xuất `.tex`, `db.js`, Rust.

---

## 7. Kiểm thử & nghiệm thu

- **Đơn vị (mới):** `feedSelection.test.js` — `rangeIds` (xuôi, ngược, 1 phần tử, index `-1` → rỗng); `unionSelection` (không trùng, giữ thứ tự cũ + thêm mới); `clampIndex` (trong biên, tràn trên/dưới, `len=0` → `-1`).
- **Bộ cũ giữ xanh:** `npm test` — **golden `buildContentFile` 3/3 KHÔNG đổi**; mọi suite pass.
- **Build:** `CI=true npm run build` → **0 warning** (chứng minh không sót biến/hàm).
- **GUI (Thầy nghiệm thu qua `npx tauri dev`):**
  1. ↑/↓ → khung sáng chạy & **tự cuộn** theo; khung sáng khác rõ với "đã tick".
  2. Space → tick/bỏ thẻ đang ngắm.
  3. Shift+↑/↓ → chọn loạt liên tiếp.
  4. Shift+**bấm** một thẻ xa → chọn cả dải từ thẻ trước đó.
  5. Ctrl+Shift+A → chọn **hết bài đang hiện** (đổi bộ lọc rồi thử lại thấy đúng số).
  6. Ctrl+Shift+N / Esc → bỏ chọn.
  7. Enter → mở "Xem đầy đủ" thẻ đang ngắm.
  8. Đổi bộ lọc/tìm kiếm → khung sáng về đầu.
  9. Bấm vào ô **Tìm kiếm** rồi bấm ↑/↓ → con trỏ chữ di chuyển, **feed không nhảy**.

---

## 8. Ngoài phạm vi (backlog)

- Đi tới/lui bài ngay **trong** cửa sổ "Xem đầy đủ" (prev/next trong PreviewModal).
- Nhớ vị trí khung sáng khi rời feed rồi quay lại.
- `Del` xoá thẳng thẻ đang ngắm (hiện giữ = xoá bài đã tick).
- Chọn dải kiểu "thay thế" (Windows Explorer) — bản này chọn kiểu "cộng thêm" cho hợp thói quen toggle sẵn có.

---

## 9. Vì sao thiết kế thế này (Teach Me Why)

- **Tách "đang ngắm" khỏi "đã chọn"** → duyệt bằng phím mà không phá vùng chọn đang có; đúng mô hình quản lý file/Gmail Thầy quen.
- **Chọn dải "cộng thêm"** → nhất quán với hành vi bấm-thẻ-để-toggle sẵn có (đang là đa chọn tích luỹ).
- **Tách `feedSelection.js` thuần** → test logic chọn **không cần GUI**, đúng gu 10 file test hiện có; phần cuộn/tiêu điểm để nghiệm thu tay.
- **Chọn-tất-cả nằm trong feed** (không ở hook toàn cục) → vì chỉ feed mới biết danh sách đang lọc; tránh nhân đôi trạng thái.
- **Không đụng lưu trữ/xuất** → phần "thiêng" khỏi lo, golden-file giữ nguyên.
