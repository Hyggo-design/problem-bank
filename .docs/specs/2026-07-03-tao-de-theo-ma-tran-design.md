# Thiết kế: Tạo đề theo Ma trận (Khởi tạo đề thi tự động)

- **Ngày:** 2026-07-03
- **Trạng thái:** ĐÃ DUYỆT thiết kế (qua brainstorm) — chờ viết build plan
- **Người duyệt:** Thầy Sơn
- **Liên quan:** hệ phân loại (`useTaxonomy`), Giỏ đề (`useCart`), Lịch sử xuất (`useExportHistory`, `usageStats`), xuất `.tex` (KHÔNG đụng)

---

## 1. Mục tiêu

Cho phép Thầy khai báo một **ma trận đề** — bảng nói rõ *mỗi chủ đề cần bao nhiêu câu, ở mỗi mức độ* — rồi app **tự động lục kho, bốc đủ số câu khớp từng ô**, cho Thầy xem lại/đổi, và **đổ vào Giỏ đề** để Xuất như hiện nay.

Đây là một **cách mới để rót bài vào Giỏ** (bên cạnh chọn tay). Toàn bộ đường Xuất (`buildProblemTex` → `buildContentFile` → template + Save As) **giữ nguyên, không đụng một dòng**.

---

## 2. Quyết định đã chốt (từ phiên brainstorm)

| # | Hạng mục | Quyết định |
|---|---|---|
| 1 | **Trung tâm** | Giỏ đề. Tính năng mới chỉ *rót bài vào Giỏ*; Xuất giữ nguyên. |
| 2 | **Phạm vi 1 ma trận** | Khoá **1 Hệ** (bắt buộc — vì thang mức độ khó gắn theo hệ). **Lớp** = bộ lọc **tuỳ chọn** (chọn 1 lớp để khoá, hoặc để trống = mọi lớp trong hệ). |
| 3 | **Hai chiều của ma trận** | **Dòng = chủ đề** (một nhánh trong cây, tính gồm cả nhánh con). **Cột = các mức độ** của hệ đó. |
| 4 | **Mỗi ô** | Ô nhập **số câu** cần lấy + nhãn nhỏ *"còn X khả dụng"*. |
| 5 | **Cách bốc câu** | Ngẫu nhiên nhưng **ưu tiên câu lâu chưa dùng** (né câu đã xuất trong 30 ngày, dùng `usageStats`); **không lặp** câu trong cùng một đề. |
| 6 | **Bước xem lại** | Sau khi bốc, hiện các câu **nhóm theo từng ô**; mỗi câu có *Đổi câu khác* / *Bỏ*; có *Bốc lại toàn bộ*. Ô **thiếu** (kho không đủ) → **cảnh báo vàng**, **KHÔNG chặn**. |
| 7 | **Chốt** | Nút *"Đưa vào Giỏ đề"* → mọi câu đã chọn nhảy vào Giỏ (như Thêm giỏ tay) → toast → chuyển sang Giỏ. |
| 8 | **Chỗ đặt** | **Mục riêng trên nav rail: "Tạo đề"** (trang riêng, cạnh Bài · Giỏ). |
| 9 | **v1 KHÔNG có** | Lưu mẫu ma trận (làm mới mỗi lần); **không thêm bảng/cột CSDL nào**. |

---

## 3. Ràng buộc & Guardrail

- **KHÔNG đụng** `src/utils/buildProblemTex.js`, `src/utils/buildContentFile.js`, `ExportModal` (đường xuất), `db.js` (schema), Rust. → **golden-file test giữ nguyên, đường xuất byte-identical.**
- **KHÔNG thêm trường cho bài, KHÔNG thêm bảng/cột.** "Động cơ chọn bài" là **JS thuần** chạy trên dữ liệu đã nạp (`problems`) + lịch sử xuất (`historyItems`).
- Quy tắc dự án: **KHÔNG dùng `window.confirm/alert`** — dùng `useConfirm()` / toast nếu cần.
- Hiệu năng: kho tầm ~2000 câu, lọc JS mỗi ô là tức thời — không cần tối ưu gì thêm.

---

## 4. Dữ liệu sẵn có (đã đối chiếu code 2026-07-03)

Không cần schema mới. Mọi thứ cần đã có trong bộ nhớ:

- **`problems`** (từ `useProblems`, đã loại bài trong Thùng rác): mỗi bài mang sẵn
  - `categoryIds: string[]` — các nhánh đã gắn (mọi hệ)
  - `difficultyByHe: { [heId]: difficultyId }` — **một** mức độ cho mỗi hệ
  - `gradeIds: string[]` — các lớp đã gắn
  - `id, statement, solution, tags, type, shortAnswer, options, figStatement, figSolution, …` (đủ để đổ thẳng vào Giỏ & Xuất)
- **`useTaxonomy`** (context, load 1 lần): `categories` `[{id,name,parent_id,position}]`, `difficulties` `[{id,he_id,name,position}]`, `grades`. Tiện ích thuần đã export: `getRootHeId(catId, parentMap)`, `getDescendantIds(rootId, childrenMap)`.
  - **Hệ** = `categories` có `parent_id == null`.
  - **Mức độ của một hệ** = `difficulties.filter(d => d.he_id === heId)` (theo `position`).
- **`useExportHistory.loadHistory()`** → `historyItems` (đã parse `problem_ids` thành mảng).
- **`usageStats.getRecentUsageByProblemId(historyItems, now, 30)`** → map `{ [problemId]: {...} }`. **Tập "đã dùng gần đây" = `new Set(Object.keys(map))`.**
- **`useCart.addToCart(problem)`** — nhận **nguyên object bài**, tự chống trùng theo `id`.
- **`useUIState.currentView`** (`'dashboard' | 'feed' | 'cart' | 'settings' | 'trash'`) + `setCurrentView`.

---

## 5. Động cơ chọn bài (util thuần mới — có test)

**File mới:** `src/utils/examMatrix.js` — thuần, không import DB/React, **có test tất định** (nhận `rng` + `recentUsageIds` qua tham số).

### 5.1. Khớp ứng viên cho một ô `(categoryId, difficultyId)`
Một bài `p` là ứng viên khi **thoả tất cả**:
1. `p.difficultyByHe[heId] === difficultyId` (đúng mức độ trong hệ đang khoá);
2. `p.categoryIds` **giao** với `getDescendantIds(categoryId, childrenMap)` khác rỗng (thuộc nhánh **hoặc nhánh con**);
3. nếu có `gradeId`: `p.gradeIds.includes(gradeId)` (không chọn lớp thì bỏ qua điều kiện này);
4. chưa bị dùng ở ô khác trong **cùng lần tạo** (`!usedIds.has(p.id)`).

*(Bài trong Thùng rác đã bị loại từ `problems` nên không cần lọc thêm.)*

### 5.2. Xếp hạng & bốc trong một ô
```
candidates = problems.filter(khớp 5.1)
fresh   = candidates.filter(p => !recentUsageIds.has(p.id))   // lâu chưa dùng → ưu tiên
recent  = candidates.filter(p =>  recentUsageIds.has(p.id))   // đã dùng ≤30 ngày → dự bị
xếp     = [ ...shuffle(fresh, rng), ...shuffle(recent, rng) ] // Fisher–Yates dùng rng tiêm vào
picked  = xếp.slice(0, count)
usedIds.add(mỗi picked.id)   // chống lặp toàn đề
shortfall = count - picked.length   // >0 nếu kho thiếu
```

### 5.3. API dự kiến của `examMatrix.js`
```js
// Bốc cả ma trận
generateExamMatrix({
  problems, categories, heId, gradeId,          // gradeId có thể null
  rows,                                          // [{ rowId, categoryId, counts: { [difficultyId]: number } }]
  recentUsageIds,                                // Set<string>
  rng = Math.random,
}) => {
  cells: [{ rowId, categoryId, difficultyId, requested, picked: Problem[], shortfall }],
  pickedProblems: Problem[],                     // gộp mọi ô, đã dedupe (thứ tự theo dòng→cột)
  totalRequested, totalPicked,
}

// Đếm "còn X khả dụng" cho nhãn dưới ô (độc lập từng ô — xem 6.3)
countAvailableForCell({ problems, categories, heId, gradeId, categoryId, difficultyId }) => number

// Đổi 1 câu khác trong 1 ô (loại mọi id đang hiển thị trên toàn đề)
pickReplacementProblem({
  problems, categories, heId, gradeId, categoryId, difficultyId,
  excludeIds,                                    // Set các id đang hiển thị khắp đề
  recentUsageIds, rng = Math.random,
}) => Problem | null                             // null = hết câu khác để đổi
```

### 5.4. Test (`examMatrix.test.js`)
- Bốc đúng số lượng mỗi ô.
- **Ưu tiên fresh trước recent** (dựng `recentUsageIds` + rng cố định, kiểm thứ tự).
- **Thiếu kho** → `shortfall > 0`, `picked.length` = số có thật.
- **Không lặp** giữa 2 ô cùng cột dùng chung ứng viên.
- **Lọc lớp** đúng; bỏ lớp thì lấy mọi lớp.
- **Nhánh con** được tính vào dòng cha (`getDescendantIds`).
- `pickReplacementProblem` loại đúng `excludeIds`; hết câu → `null`.

---

## 6. Giao diện — trang `MatrixPage.jsx` (mới)

Trang riêng (như `DashboardPage`/`TrashPage`), hiện khi `currentView === 'matrix'`. Hai chế độ trong cùng trang: **Dựng ma trận** → **Xem lại**.

### 6.1. Thanh trên
- Tiêu đề **"Tạo đề theo ma trận"**.
- Chọn **Hệ** (bắt buộc) — dải tab/dropdown các hệ (root categories). Mặc định = `selectedHe` nếu đang khoá hệ, không thì hệ đầu.
- Chọn **Lớp** (tuỳ chọn) — dropdown `grades`, mặc định *"Tất cả lớp"*.
- Đổi Hệ → **xoá các dòng chủ đề cũ** (chúng thuộc hệ cũ) và **đổi lại cột mức độ**.

### 6.2. Bảng ma trận (chế độ Dựng)
- **Cột:** các mức độ của hệ (theo `position`). Nếu hệ **chưa có mức độ** → gợi ý nhẹ *"Hệ này chưa có mức độ khó — thêm trong Cài đặt › Quản lý phân loại."*
- **Dòng:** mỗi dòng = một **chủ đề** (nhánh). Thêm dòng bằng:
  - nút **"+ Thêm chủ đề"** → chọn một nhánh của hệ (dropdown liệt kê các nhánh không phải gốc, thụt lề theo đường dẫn cây); **không cho trùng dòng**;
  - nút nhanh **"Thêm tất cả nhánh cấp 1"** (mọi con trực tiếp của hệ).
  - mỗi dòng có nút **✕ bỏ dòng**.
- **Mỗi ô** = ô nhập số (rỗng/0 = không lấy). Dưới ô: nhãn mờ **"còn X"** = `countAvailableForCell(...)`.
- Chân bảng: **Tổng: N câu**. Nút **"Tạo đề"** (mờ khi N = 0).

### 6.3. Ghi chú về nhãn "còn X"
Đếm **độc lập từng ô** (không trừ ô khác) → là con số **tối đa lạc quan** để Thầy ước lượng. Việc chống-lặp thật diễn ra lúc *Tạo đề*; nếu vì dùng chung ứng viên mà một ô bị hụt, **bước Xem lại sẽ báo thiếu**. (Không cố tính trừ chéo ở bước dựng cho đỡ rối.)

### 6.4. Chế độ Xem lại (sau khi bấm "Tạo đề")
- Gọi `generateExamMatrix(...)`; lưu kết quả vào state trang.
- Hiện theo **từng ô**: tiêu đề *"‹đường dẫn chủ đề› — ‹mức độ› (đã lấy k/N)"*; nếu `shortfall > 0` → **badge/khung vàng** *"cần N, chỉ có k"*.
- Dưới mỗi ô: danh sách câu đã bốc, mỗi câu hiện **đề rút gọn** (tái dùng `MathText`/`LatexBlockRenderer`, render LaTeX) + hai nút:
  - **"Đổi câu khác"** → `pickReplacementProblem` (loại mọi id đang hiển thị toàn đề); thay tại chỗ; hết câu → toast *"Không còn câu khác để đổi."*
  - **"Bỏ"** → gỡ câu khỏi ô (giảm số đã lấy; có thể khiến ô thành thiếu — cập nhật badge).
- Nút toàn trang:
  - **"Bốc lại toàn bộ"** → chạy lại `generateExamMatrix` với rng mới.
  - **"Sửa ma trận"** → quay về chế độ Dựng, **giữ nguyên** các dòng & số đã nhập.
  - **"Đưa vào Giỏ đề (M câu)"** → lặp `addToCart` cho từng câu đang hiển thị → `toast("Đã thêm M câu vào Giỏ")` → `setCurrentView('cart')`. (Câu đã có sẵn trong Giỏ được `addToCart` tự bỏ qua; toast có thể ghi rõ *"(k câu đã có sẵn)"* nếu muốn — tuỳ chọn nhỏ.)

### 6.5. Trạng thái rỗng / ca biên
- Hệ chưa có nhánh chủ đề nào → gợi ý thêm nhánh trong Quản lý phân loại.
- Mọi ô đều thiếu (kho trống cho các tiêu chí) → bảng Xem lại toàn cảnh báo vàng; Thầy vẫn Đưa-vào-Giỏ phần bốc được (nếu có), hoặc Sửa ma trận.
- `count` âm/không phải số → coi như 0 (chặn ở ô nhập).

---

## 7. Điểm nối vào app (thay đổi tối thiểu)

| File | Thay đổi |
|---|---|
| `src/utils/examMatrix.js` | **MỚI** — động cơ chọn bài (mục 5). |
| `src/utils/examMatrix.test.js` | **MỚI** — test tất định (mục 5.4). |
| `src/components/MatrixPage.jsx` | **MỚI** — trang UI (mục 6). |
| `src/components/NavRail.jsx` | Thêm 1 mục **"Tạo đề"** (icon lưới, vd `Grid3x3`) → `onNavigate('matrix')`, đánh dấu `on` khi `currentView === 'matrix'`. |
| `src/hooks/useUIState.js` | Thêm `'matrix'` vào chú thích union của `currentView` (không cần state mới). |
| `src/App.jsx` | Render `<MatrixPage/>` khi `currentView === 'matrix'`; truyền `problems`, `addToCart`, `setCurrentView`, toast. Trang tự gọi `useTaxonomy()` + `useExportHistory()` (load lịch sử khi mở để có `recentUsageIds`). |

**Tuyệt đối không sửa:** `buildProblemTex.js`, `buildContentFile.js`, `buildContentFile.test.js`, `ExportModal.jsx` (đường xuất), `db.js`, Rust/`capabilities`.

---

## 8. Kiểm thử & nghiệm thu

- **Đơn vị:** `examMatrix.test.js` xanh; **các test cũ giữ nguyên** (golden 3/3, v.v. không đổi).
- **Build:** `CI=true npm run build` → **0 warning** (gộp state + hàm + JSX của trang mới hợp lý để tránh `no-unused-vars`).
- **GUI (Thầy nghiệm thu qua `npx tauri dev`):**
  1. Chọn Hệ có data → cột mức độ hiện đúng; thêm vài chủ đề; nhãn "còn X" hợp lý.
  2. Điền số, bấm Tạo đề → mỗi ô lấy đúng số (hoặc báo thiếu đúng).
  3. Bốc lại toàn bộ → bộ câu đổi; câu vừa xuất gần đây hiếm khi lên đầu.
  4. Đổi câu khác / Bỏ hoạt động; badge thiếu cập nhật.
  5. Đưa vào Giỏ → sang Giỏ thấy đủ câu; Xuất ra `.tex` → `\input` vào `main.tex` → PDF bình thường (chứng tỏ đường xuất không đổi).
- *(Như các màn phụ thuộc `useTaxonomy`: chỉ chạy được trong Tauri thật; Claude không tự kiểm GUI được.)*

---

## 9. Ngoài phạm vi v1 (backlog)

- **Lưu mẫu ma trận** đã đặt tên (dùng lại mỗi kỳ) — thêm sau, sạch, không phải làm lại (mô hình dòng/ô đã rõ).
- **Điểm số** cho mỗi câu/ô, **tổng điểm** đề.
- Ma trận theo **loại câu** (Trắc nghiệm / Tự luận) — thêm chiều lọc `type`.
- **Xuất kèm bảng ma trận** (bảng đặc tả) cùng đề.
- Lối tắt "bốc ngẫu nhiên nhanh" riêng — *đã bao trong ma trận 1 ô*, chỉ làm nếu muốn nút tắt.

---

## 10. Vì sao thiết kế thế này (Teach Me Why)

- **Giỏ làm trung tâm** → tái dùng 100% đường Xuất đã tin cậy; phần mới chỉ là "máy rót bài", rủi ro thấp nhất, không chạm phần "thiêng".
- **Bốc né-30-ngày** tận dụng đúng `export_history` — dữ liệu app đã có sẵn mà app khác không có; tránh ra lại câu học sinh vừa gặp.
- **Không lưu ma trận ở v1** → tránh thêm bảng/độ phức tạp khi mục tiêu trước mắt là *chạy đúng* + kịp đóng gói; mô hình đủ sạch để thêm "lưu mẫu" sau mà không đập đi làm lại.
- **Cảnh báo thiếu, không chặn** → Thầy luôn kiểm soát; app không tự ý hạ mức độ hay lấy bừa cho đủ.
