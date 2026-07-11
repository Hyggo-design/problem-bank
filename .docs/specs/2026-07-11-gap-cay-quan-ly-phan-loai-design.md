# Thiết kế: Gập/mở nhánh cây trong "Quản lý phân loại"

- **Ngày:** 2026-07-11
- **Trạng thái:** ĐÃ DUYỆT thiết kế (qua brainstorm) — Thầy chọn bỏ qua duyệt spec/plan, chỉ nghiệm thu bước cuối
- **Người duyệt:** Thầy Sơn
- **Liên quan:** `CategoryManagerModal.jsx` (màn Cài đặt › Quản lý phân loại); tái dùng pattern gập/mở của `FilterSidebar.jsx` (phần Bài)

---

## 1. Mục tiêu

Trong màn **Quản lý phân loại**, cây chuyên đề ở cột trái hiện **luôn bung hết** — mọi hệ và mọi nhánh con đều hiện cùng lúc. Khi cây to lên thì rối và khó soát.

Thêm khả năng **thu gọn/mở rộng từng nhánh** (nút mũi tên ▸/▾) giống hệt cây ở phần Bài, để Thầy **dễ quan sát và quản lý**.

---

## 2. Quyết định đã chốt (từ phiên brainstorm)

| # | Hạng mục | Quyết định |
|---|---|---|
| 1 | **Mũi tên gập/mở** | Mỗi nhánh CÓ con hiện nút ▸ (gập) / ▾ (mở). Nhánh không con → chừa khoảng trống để tên thẳng hàng. Y như `FilterSidebar`. |
| 2 | **Trạng thái mặc định khi mở màn** | **Gập hết — chỉ thấy các Hệ.** Bấm mũi tên để bung từng nhánh. |
| 3 | **Nút gập nhanh** | Thêm **2 nút "Mở tất cả" / "Gập tất cả"** ở đầu cột cây. |
| 4 | **Reset khi đóng/mở lại màn** | Trạng thái gập/mở **không lưu** — mở màn lên là gập gọn (giống `FilterSidebar`, vì modal remount mỗi lần mở). |
| 5 | **Tự bung khi thêm nhánh con** | Bấm "Thêm nhánh con" vào một nhánh đang gập → nhánh đó **tự bung** để thấy ô nhập + các con hiện có. |
| 6 | **Không đổi hành vi cũ** | Bấm **tên hệ** vẫn mở bảng độ khó bên phải; các nút sửa/xoá/di chuyển/đổi vị trí/thêm hệ giữ nguyên. Mũi tên là control TÁCH RIÊNG với tên. |

---

## 3. Ràng buộc & Guardrail

- **Chỉ sửa 1 file:** `src/components/Modals/CategoryManagerModal.jsx`. Thuần giao diện (React state).
- **KHÔNG đụng:** cơ sở dữ liệu / schema (`db.js`), dữ liệu phân loại (`useTaxonomy`), đường xuất `.tex` (`buildProblemTex.js`, `buildContentFile.js`, `ExportModal.jsx`), Rust. → **golden-file test giữ nguyên 3/3, đường xuất byte-identical.**
- **Không thêm thư viện.** Icon `ChevronRight`/`ChevronDown` **đã được import sẵn** trong file.
- Không thêm state toàn cục — trạng thái gập/mở là state cục bộ của modal.

---

## 4. Hiện trạng (đã đối chiếu code 2026-07-11)

- `CategoryNode` (định nghĩa NGOÀI modal, nhận mọi thứ qua `ctx`) đệ quy vẽ node: dòng [bullet ■/•][tên][nút hover]; rồi ô "di chuyển"; rồi ô "thêm nhánh con"; rồi `children.map(...)` — **luôn vẽ con, không có điều kiện gập.**
- `CategoryManagerModal` giữ `childrenMap` (parent_id→con, key `'ROOT'` cho gốc) + `roots`.
- `FilterSidebar` (mẫu tham chiếu) dùng `const [expanded, setExpanded] = useState({})`; nút chevron `setExpanded(e => ({...e, [id]: !e[id]}))`; chỉ vẽ con khi `open`; node không con → `<span>` chừa chỗ.

---

## 5. Thiết kế chi tiết

### 5.1. State & hàm mới (trong `CategoryManagerModal`)
- `const [expanded, setExpanded] = useState({})` — `{ [catId]: true }`. Mặc định `{}` = **gập hết**.
- `expandAll()` — duyệt `categories`, đánh dấu `true` cho mọi nhánh **có con** (dùng `childrenMap`).
- `collapseAll()` — `setExpanded({})`.
- Đưa vào `ctx`: `expanded`, `toggleExpand: (id) => setExpanded(e => ({...e, [id]: !e[id]}))`.
- Sửa `ctx.startAdd`: nếu có `parentId` thì `setExpanded(e => ({...e, [parentId]: true}))` trước khi mở ô nhập (tự bung).

### 5.2. Trong `CategoryNode`
- Tính `hasChildren = children.length > 0` và `open = !!ctx.expanded[node.id]`.
- **Trước** bullet ■/•: nếu `hasChildren` → nút mũi tên (`ChevronDown` khi mở, `ChevronRight` khi gập) gọi `ctx.toggleExpand(node.id)`; nếu không → `<span>` rộng ~15px giữ thẳng hàng.
- Đổi `children.map(...)` → **`open && children.map(...)`** (chỉ vẽ con khi mở). Ô "di chuyển" và "thêm nhánh con" GIỮ NGUYÊN (không gán điều kiện `open` — vì `startAdd` đã tự bung).

### 5.3. Hai nút "Mở tất cả / Gập tất cả"
- Đặt ở **đầu cột cây**, cạnh nhãn "Cây chuyên đề" (bên trái), giữ nút "Thêm hệ" bên phải. Header cho phép `flexWrap` để không tràn khi hẹp.
- Kiểu nút nhỏ, viền mảnh, chữ mờ (`miniBtn`).

---

## 6. Điểm sửa (một file)

| File | Thay đổi |
|---|---|
| `src/components/Modals/CategoryManagerModal.jsx` | (a) thêm style `miniBtn`; (b) state `expanded` + `expandAll`/`collapseAll`; (c) `ctx.expanded` + `ctx.toggleExpand` + sửa `ctx.startAdd` tự bung; (d) `CategoryNode`: nút chevron/khoảng trống + gate `open && children.map`; (e) header cột cây thêm 2 nút. |

**Tuyệt đối không sửa:** mọi file khác (đặc biệt đường xuất `.tex`, `db.js`, Rust).

---

## 7. Kiểm thử & nghiệm thu

- **Đơn vị:** thay đổi thuần UI-state, không có hàm thuần mới → **không thêm test**. Chạy `npm test` để chắc **các test cũ vẫn xanh** (golden export 3/3 KHÔNG đổi — đường xuất không bị chạm).
- **Build:** `CI=true npm run build` → **0 warning** (gộp state + hàm hợp lý, tránh `no-unused-vars`).
- **GUI (Thầy nghiệm thu qua `npx tauri dev`):**
  1. Mở Cài đặt › Quản lý phân loại → cây **gập hết, chỉ thấy các hệ**, mỗi hệ có mũi tên ▸.
  2. Bấm mũi tên một hệ → bung các chuyên đề; bấm lại → gập.
  3. Bấm **"Mở tất cả"** → bung cả cây; **"Gập tất cả"** → gập về chỉ còn hệ.
  4. Bấm **tên** một hệ → bảng độ khó bên phải vẫn mở đúng (không lẫn với mũi tên).
  5. Bấm "Thêm nhánh con" vào một hệ đang gập → hệ tự bung, thấy ô nhập; thêm xong thấy nhánh mới.
  6. Sửa/xoá/di chuyển/đổi vị trí nhánh vẫn hoạt động như cũ.
- *(Như các màn phụ thuộc `useTaxonomy`: chỉ chạy được trong Tauri thật; Claude không tự kiểm GUI được.)*

---

## 8. Ngoài phạm vi (backlog)

- Nhớ trạng thái gập/mở giữa các lần mở màn (persist) — v1 cố ý reset cho gọn.
- Đồng bộ trạng thái gập giữa cây ở Quản lý phân loại và cây ở phần Bài — không cần, hai ngữ cảnh khác nhau.
- Đếm số nhánh con / số bài trên mỗi nhánh gập — để sau nếu cần.

---

## 9. Vì sao thiết kế thế này (Teach Me Why)

- **Tái dùng đúng pattern `FilterSidebar`** → nhất quán với phần Bài (Thầy đã quen), rủi ro thấp, ít code.
- **Mặc định gập hết** → đúng mục tiêu "dễ quan sát": mở màn ra là gọn, chủ động bung cái cần xem.
- **Mũi tên tách khỏi tên hệ** → không phá thao tác "bấm hệ để xem độ khó" đang có.
- **Tự bung khi thêm con** → tránh cảnh thêm nhánh con vào chỗ đang gập rồi "không thấy đâu".
- **Chỉ đụng 1 file UI** → không chạm phần "thiêng" (xuất `.tex`/CSDL), golden-file khỏi lo.
