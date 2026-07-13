# Điều hướng bàn phím + chọn dải trong feed — Build Plan

**What we're building:** Duyệt và chọn bài trong feed bằng **phím** (↑/↓ chạy khung sáng, Space tick, Shift+↑/↓ chọn loạt, Ctrl+Shift+A chọn hết, Enter xem) và **Shift+bấm** để chọn cả một dải.

**Why:** Chọn/gom bài để thêm vào giỏ hay xoá hàng loạt **nhanh hơn nhiều**, ít rê chuột.

**Approach:** Tách phần "tính toán chọn" ra một file thuần `feedSelection.js` (test được bằng mảng). `DataGrid` giữ "khung sáng" (`activeIndex`) + xử lý phím trên một khung có tiêu điểm, dùng ref của `Virtuoso` để tự cuộn. `ProblemCard` thêm nhấn thị giác cho thẻ đang ngắm và cho biết có giữ Shift khi bấm. Không đụng lưu trữ hay đường xuất `.tex`.

**Spec đã duyệt:** [`.docs/specs/2026-07-13-dieu-huong-ban-phim-design.md`](../specs/2026-07-13-dieu-huong-ban-phim-design.md)

**Files we'll create or change:**
- `src/utils/feedSelection.js` — **MỚI**: logic chọn thuần (`rangeIds`, `unionSelection`, `clampIndex`)
- `src/utils/feedSelection.test.js` — **MỚI**: test 3 hàm trên
- `src/components/DataGrid.jsx` — khung sáng + phím + chọn dải + chọn tất cả
- `src/components/ProblemCard.jsx` — nhấn thị giác "đang ngắm" + click truyền sự kiện
- `src/hooks/useKeyboardShortcuts.js` — bỏ phím `ctrl+shift+a` rỗng
- `src/App.jsx` — thêm `onSetSelection`, bỏ `onSelectAll` rỗng

**KHÔNG đụng:** `buildProblemTex.js`, `buildContentFile.js`, `ExportModal.jsx`, `db.js`, Rust → golden-file test giữ nguyên. *(Tính năng thuần giao diện, không đổi cách lưu/xuất.)*

---

### Task 1: Chuẩn bị — nhánh mới + baseline

**What you'll have when this is done:** Một nhánh riêng, con số test "trước khi sửa" để đối chiếu. *(Không cần sao lưu CSDL — tính năng này không đụng dữ liệu.)*

- [ ] Bước 1: Tạo nhánh
      Run: `git checkout -b feat-dieu-huong-ban-phim`
      You should see: `Switched to a new branch 'feat-dieu-huong-ban-phim'`

- [ ] Bước 2: Baseline test
      Run: `npm test -- --watchAll=false`
      You should see: mọi suite **PASS** (golden `buildContentFile` **3/3**). Ghi lại tổng số test.

- [ ] Bước 3: Lưu spec vào nhánh
      Run: `git add ".docs/specs/2026-07-13-dieu-huong-ban-phim-design.md" && git commit -m "docs: spec dieu huong ban phim + chon dai (Dot A)"`

**Nếu trục trặc:** test chưa xanh sẵn → dừng, báo tôi.

---

### Task 2: Viết test logic chọn TRƯỚC (kỳ vọng ĐỎ)

**What you'll have when this is done:** File test mô tả đúng 3 hàm chọn. Chạy giờ sẽ ĐỎ vì chưa có file — **đúng ý**.

- [ ] Bước 1: Tạo `src/utils/feedSelection.test.js`:

```js
import { rangeIds, unionSelection, clampIndex } from './feedSelection';

const ids = ['a', 'b', 'c', 'd', 'e'];

describe('rangeIds — dải id giữa 2 mốc (bao gồm 2 đầu)', () => {
  test('xuôi', () => expect(rangeIds(ids, 1, 3)).toEqual(['b', 'c', 'd']));
  test('ngược cho kết quả như xuôi', () => expect(rangeIds(ids, 3, 1)).toEqual(['b', 'c', 'd']));
  test('một phần tử', () => expect(rangeIds(ids, 2, 2)).toEqual(['c']));
  test('cả hai đầu', () => expect(rangeIds(ids, 0, 4)).toEqual(['a', 'b', 'c', 'd', 'e']));
  test('index âm -> rỗng', () => expect(rangeIds(ids, -1, 3)).toEqual([]));
});

describe('unionSelection — gộp không trùng, giữ thứ tự cũ', () => {
  test('thêm mới nối sau cũ', () => expect(unionSelection(['a', 'b'], ['b', 'c', 'd'])).toEqual(['a', 'b', 'c', 'd']));
  test('thêm vào rỗng', () => expect(unionSelection([], ['x', 'y'])).toEqual(['x', 'y']));
  test('add rỗng giữ nguyên', () => expect(unionSelection(['a'], [])).toEqual(['a']));
  test('add trùng hết -> không đổi', () => expect(unionSelection(['a', 'b'], ['a', 'b'])).toEqual(['a', 'b']));
});

describe('clampIndex — kẹp trong [0, len-1]', () => {
  test('trong biên', () => expect(clampIndex(2, 5)).toBe(2));
  test('tràn trên', () => expect(clampIndex(9, 5)).toBe(4));
  test('tràn dưới', () => expect(clampIndex(-3, 5)).toBe(0));
  test('len 0 -> -1', () => expect(clampIndex(0, 0)).toBe(-1));
});
```

- [ ] Bước 2: Chạy — kỳ vọng ĐỎ
      Run: `npm test -- --watchAll=false feedSelection`
      You should see: **FAIL** — *"Cannot find module './feedSelection'"*. Đỏ ở đây là ĐÚNG.

---

### Task 3: Tạo `feedSelection.js` → test XANH

**What you'll have when this is done:** Logic chọn đã được test chứng minh đúng.

- [ ] Bước 1: Tạo `src/utils/feedSelection.js`:

```js
// Logic chọn thuần cho feed — tách khỏi React để test không cần GUI.

// Mảng id từ min(i,j)..max(i,j), bao gồm 2 đầu. i hoặc j < 0 -> [].
export const rangeIds = (orderedIds, i, j) => {
  if (i < 0 || j < 0) return [];
  const lo = Math.min(i, j);
  const hi = Math.max(i, j);
  return orderedIds.slice(lo, hi + 1);
};

// Gộp addIds vào selectedIds: không trùng, giữ thứ tự cũ rồi thêm mới.
export const unionSelection = (selectedIds, addIds) => {
  const seen = new Set(selectedIds);
  const result = [...selectedIds];
  for (const id of addIds) {
    if (!seen.has(id)) { seen.add(id); result.push(id); }
  }
  return result;
};

// Kẹp idx trong [0, len-1]. len <= 0 -> -1.
export const clampIndex = (idx, len) => {
  if (len <= 0) return -1;
  if (idx < 0) return 0;
  if (idx > len - 1) return len - 1;
  return idx;
};
```

- [ ] Bước 2: Chạy lại — kỳ vọng XANH
      Run: `npm test -- --watchAll=false feedSelection`
      You should see: **PASS** hết.

- [ ] Bước 3: Lưu tiến độ
      Run: `git add src/utils/feedSelection.js src/utils/feedSelection.test.js && git commit -m "feat(feed): logic chon thuan feedSelection + test"`

---

### Task 4: Nền tảng chuột — thẻ "đang ngắm" + Shift+bấm chọn dải

**What you'll have when this is done:** Bấm thẻ vẫn tick như cũ; **Shift+bấm** chọn cả dải; thẻ vừa bấm có **nhấn thị giác "đang ngắm"**. (Phím bàn phím làm ở Task 5.)

- [ ] Bước 1: `ProblemCard.jsx` — nhận thêm prop `active` và cho click truyền sự kiện:
      - Thêm `active` vào danh sách props (dòng `const ProblemCard = ({ ..., selected, active, ... })`).
      - Đổi `onToggleSelect` → `onSelect`; sửa `onClick={onToggleSelect}` thành `onClick={(e) => onSelect(e)}`.
      - Thêm nhấn "đang ngắm" (khác "đã chọn"): trong `style` của thẻ, thêm khi `active`:
        `outline: active ? '2px solid var(--color-cobalt)' : 'none'`, `outlineOffset: '-2px'`.
      (Giữ nguyên `selected` = viền accent + dấu ✓.)

- [ ] Bước 2: `DataGrid.jsx` — thêm state khung sáng + mốc, và prop `onSetSelection`:
      - Import: `import { rangeIds, unionSelection, clampIndex } from '../utils/feedSelection';` và `useState, useRef, useEffect` từ React.
      - Thêm props nhận vào: `onSetSelection`.
      - Trong component: `const [activeIndex, setActiveIndex] = useState(-1);` và `const [anchorIndex, setAnchorIndex] = useState(-1);`
      - `const ids = filteredAndSorted.map((p) => p.id);` (đặt sau `filteredAndSorted`).

- [ ] Bước 3: `DataGrid.jsx` — hàm bấm thẻ (toggle hoặc chọn dải):

```jsx
const handleCardClick = (index, e) => {
  if (e.shiftKey && anchorIndex >= 0) {
    onSetSelection(unionSelection(selectedIds, rangeIds(ids, anchorIndex, index)));
    setActiveIndex(index);
  } else {
    onSelectChange(ids[index]);        // toggle 1 thẻ (như cũ)
    setAnchorIndex(index);
    setActiveIndex(index);
  }
};
```
      Trong `itemContent`, truyền xuống thẻ: `active={index === activeIndex}` và `onSelect={(e) => handleCardClick(index, e)}` (thay cho `onToggleSelect`).

- [ ] Bước 4: `DataGrid.jsx` — đưa khung sáng về đầu khi danh sách đổi:

```jsx
useEffect(() => {
  setActiveIndex(filteredAndSorted.length ? 0 : -1);
  setAnchorIndex(-1);
}, [filteredAndSorted]);
```

- [ ] Bước 5: `App.jsx` — truyền `onSetSelection`:
      Trong chỗ render `<DataGrid ... />`, thêm: `onSetSelection={ui.setSelectedIds}`.

- [ ] Bước 6: Kiểm build sạch
      Run: `$env:CI='true'; npm run build`
      You should see: `Compiled successfully`, **0 warning**.

- [ ] Bước 7: Lưu tiến độ
      Run: `git add src/components/ProblemCard.jsx src/components/DataGrid.jsx src/App.jsx && git commit -m "feat(feed): shift-click chon dai + the dang ngam"`

**Nếu trục trặc:** build báo `'onToggleSelect' is not defined` → còn sót chỗ dùng tên cũ trong `ProblemCard`; đổi hết sang `onSelect`.

---

### Task 5: Bàn phím — ↑/↓, Space, Shift+↑/↓, Enter, Ctrl+Shift+A

**What you'll have when this is done:** Duyệt và chọn hoàn toàn bằng phím; feed tự cuộn theo khung sáng.

- [ ] Bước 1: `DataGrid.jsx` — thêm ref cho Virtuoso + khung nhận phím. Thêm:
      `const virtuosoRef = useRef(null);` và `const feedWrapRef = useRef(null);`
      Cho `<Virtuoso ref={virtuosoRef} .../>`.
      Tự cuộn khi khung sáng đổi:

```jsx
useEffect(() => {
  if (activeIndex >= 0) virtuosoRef.current?.scrollIntoView({ index: activeIndex });
}, [activeIndex]);
```

- [ ] Bước 2: `DataGrid.jsx` — hàm xử lý phím:

```jsx
const onKeyDown = (e) => {
  const n = ids.length;
  if (n === 0) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const next = clampIndex((activeIndex < 0 ? 0 : activeIndex) + (e.key === 'ArrowDown' ? 1 : -1), n);
    if (e.shiftKey && anchorIndex >= 0) {
      onSetSelection(unionSelection(selectedIds, rangeIds(ids, anchorIndex, next)));
    }
    setActiveIndex(next);
  } else if (e.key === ' ') {
    e.preventDefault();
    if (activeIndex >= 0) { onSelectChange(ids[activeIndex]); setAnchorIndex(activeIndex); }
  } else if (e.key === 'Enter') {
    if (activeIndex >= 0) onPreviewClick(filteredAndSorted[activeIndex]);
  } else if (e.key.toLowerCase() === 'a' && e.ctrlKey && e.shiftKey) {
    e.preventDefault();
    onSetSelection([...ids]);   // chọn tất cả bài đang hiện
  }
};
```

- [ ] Bước 3: `DataGrid.jsx` — bọc feed bằng khung nhận tiêu điểm. Đổi thẻ `<Virtuoso .../>` để nằm trong:

```jsx
<div ref={feedWrapRef} tabIndex={0} onKeyDown={onKeyDown} style={{ flex: 1, minHeight: 0, outline: 'none' }}>
  <Virtuoso ref={virtuosoRef} style={{ height: '100%' }} data={filteredAndSorted} ... />
</div>
```
      (Chuyển `style={{ flex: 1 }}` từ Virtuoso ra khung ngoài; Virtuoso để `height: '100%'`.)

- [ ] Bước 4: `DataGrid.jsx` — tự lấy tiêu điểm khi vào feed + khi bấm thẻ:
      Thêm `useEffect(() => { feedWrapRef.current?.focus(); }, []);`
      Trong `handleCardClick` (Task 4), thêm ở cuối: `feedWrapRef.current?.focus();` (để gõ phím tiếp được sau khi bấm).

- [ ] Bước 5: Gỡ phím rỗng cũ. Trong `useKeyboardShortcuts.js`: xoá `onSelectAll` khỏi tham số, khỏi dòng `hotkeys('ctrl+shift+a', ...)`, khỏi `hotkeys.unbind('ctrl+shift+a')`, và khỏi mảng dependency. Trong `App.jsx`: xoá dòng `onSelectAll: () => {},`.

- [ ] Bước 6: Kiểm build sạch
      Run: `$env:CI='true'; npm run build`
      You should see: `Compiled successfully`, **0 warning** (0-warning cũng xác nhận đã gỡ sạch `onSelectAll`, không còn biến thừa).

- [ ] Bước 7: Lưu tiến độ
      Run: `git add src/components/DataGrid.jsx src/hooks/useKeyboardShortcuts.js src/App.jsx && git commit -m "feat(feed): dieu huong ban phim + chon tat ca trong feed"`

**Nếu trục trặc:** ↑/↓ không cuộn → kiểm `virtuosoRef` đã gắn vào `<Virtuoso>` chưa; phím không ăn → kiểm khung ngoài có `tabIndex={0}` và đã `focus()` chưa.

---

### Task 6: Nghiệm thu trong app (Thầy)

**What you'll have when this is done:** Bằng chứng tận mắt mọi phím + chuột chạy đúng, và LaTeX vẫn hiển thị/sao chép sạch.

- [ ] Bước 1: Mở app
      Run: `npx tauri dev`

- [ ] Bước 2: **Bàn phím** — vào feed, thử: ↑/↓ (khung sáng chạy + **tự cuộn**, khác rõ "đã tick"); Space (tick/bỏ); Shift+↑/↓ (chọn loạt); **Ctrl+Shift+A** (chọn hết bài đang hiện — đổi bộ lọc rồi thử lại thấy đúng số); Ctrl+Shift+N / Esc (bỏ chọn); **Enter** (mở "Xem đầy đủ").

- [ ] Bước 3: **Chuột** — bấm 1 thẻ, rồi **Shift+bấm** thẻ xa hơn → chọn cả dải; bấm thường vẫn tick/bỏ 1 thẻ.

- [ ] Bước 4: **Đổi bộ lọc / gõ tìm kiếm** → khung sáng về đầu; và khi con trỏ đang trong **ô Tìm kiếm**, bấm ↑/↓ thì **feed không nhảy** (con trỏ chữ di chuyển bình thường).

- [ ] Bước 5: **LaTeX vẫn sạch** — mở "Xem đầy đủ" một bài có công thức (vd `$x^2+y^2=z^2$`) thấy hiển thị đúng; bấm "Mã LaTeX" chép ra vẫn đúng. *(Tính năng này không đụng xuất, nhưng kiểm cho chắc.)*

- [ ] Bước 6: Kiểm tự động lần cuối
      Run: `npm test -- --watchAll=false` (tất cả XANH, golden 3/3) và `$env:CI='true'; npm run build` (0 warning).

**Nếu trục trặc:** bất kỳ bước nào lệch → dừng, mô tả đúng thứ Thầy thấy; đừng sửa mò.

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Đọc lướt cả plan một lượt trước khi bắt đầu
2. Làm lần lượt từng Task — không nhảy cóc
3. Xong bước "kỳ vọng thấy…" mới sang Task kế
4. Nếu có gì lệch kỳ vọng, **dừng** và mô tả thứ Thầy thấy — đừng thử sửa lung tung

Nói **"bắt đầu build"** khi Thầy sẵn sàng làm Task 1. (Xong hết → gộp nhánh vào `master` + Nhật ký 29.)
