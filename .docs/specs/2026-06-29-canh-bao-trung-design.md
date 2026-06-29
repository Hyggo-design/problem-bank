# Cải thiện cảnh báo trùng lặp — Design Spec

**Ngày:** 29/06/2026
**Trạng thái:** Thiết kế đã chốt (Thầy duyệt 29/06/2026; brainstorm ghi ở [nhật ký 20](../20_2026_06_28.md) §3). Antigravity build → Claude check.

## Mục tiêu
Nâng cấp cảnh báo trùng **khi-thêm** (Thêm / Sửa / Import) — KHÔNG làm quét-toàn-kho/audit hàng loạt. 4 cải tiến:
1. **Hiện NHIỀU bài giống** — thay vì 1 bài gần nhất, hiện *danh sách* mọi bài vượt ngưỡng (xếp % giảm dần, tối đa ~5 + "+N bài nữa").
2. **So cả lời giải** — gắn cờ nếu *(đề ≥ ngưỡng) **HOẶC** (lời giải ≥ ngưỡng)*; modal hiện **cả 2 %** ("Đề: x% · Lời giải: y%").
3. **Ngưỡng chỉnh được** — thêm mục Cài đặt (thanh kéo 70–95%), lưu `localStorage['pb-dup-threshold']`, mặc định 85%.
4. **Kiểm trùng khi Import** — ở bước rà soát của Smart Import, mỗi bài đối chiếu kho hiện có; bài trùng có dấu cảnh báo + cho biết giống bài nào (%).

## Điểm cốt lõi về an toàn
**KHÔNG đụng đường xuất** (`buildProblemTex`, `db.js`, schema, bảng). Chỉ **đọc** đề/lời giải sẵn có + thêm **1 thiết lập** localStorage. ⇒ Golden test xuất giữ nguyên (3/3). Logic so trùng được **tách ra util thuần** `src/utils/findDuplicates.js` để **viết test khoá** (giống cách `extractFigures.js` đã làm).

---

## Hàm thuần & cấu trúc dữ liệu

### `src/utils/findDuplicates.js` (MỚI)
- `calculateSimilarity(a, b)` — **chuyển từ `useProblems.js` sang đây** (nguyên văn, Sorensen-Dice trên bigram ký tự). `useProblems` sẽ import lại từ util.
- `findDuplicates(problems, newStatement, newSolution, threshold = 0.85, currentId = null)` → **mảng** `{ problem, statementSimilarity, solutionSimilarity }`:
  - bỏ qua `prob.id === currentId` (chính nó khi Sửa);
  - tính cả `statementSimilarity` và `solutionSimilarity`;
  - **gắn cờ theo OR**: `statementSimilarity >= threshold || solutionSimilarity >= threshold`;
  - **xếp giảm dần** theo `max(statementSimilarity, solutionSimilarity)`;
  - không trùng → mảng rỗng `[]`.

### `checkDuplicate` trong `useProblems.js` (đổi chữ ký)
Cũ: `(newStatement, currentId, threshold=0.85)` → trả `{problem, similarity}|null`.
Mới: **`(newStatement, newSolution, currentId = null)`** → trả **mảng** (rỗng nếu không trùng). Là lớp mỏng:
- giữ hành vi cũ: nếu đang Sửa mà **đề giữ nguyên** so với bản gốc → trả `[]` (không nhắc lại);
- đọc ngưỡng: `pct = parseInt(localStorage['pb-dup-threshold'] ?? '85'); threshold = pct/100`;
- gọi `findDuplicates(problems, newStatement, newSolution, threshold, currentId)`.

## #1 + #2 — Modal danh sách + so lời giải (`DuplicateWarningModal.jsx`, viết lại)
- Nhận `pendingSave = { type, problem, duplicates }` (App đổi `duplicateInfo` → `duplicates`).
- Header: "Cảnh báo: Tìm thấy **N** bài tương tự".
- Thân: 1 khối "Câu hỏi đang soạn" (đề) → **danh sách** tối đa 5 khối "bài đã lưu", mỗi khối có badge **"Đề: x% · Lời giải: y%"** + đề bài (`MathText`). Dư thì "+N bài nữa".
- Footer giữ nguyên: "Quay lại chỉnh sửa" / "Vẫn tiếp tục lưu".
- **App.jsx** (2 chỗ Add/Edit): gọi `checkDuplicate(prob.statement, prob.solution[, prob.id])`; `if (dups.length) setPendingSave({type, problem: prob, duplicates: dups})`. `handleConfirmDuplicateSave` không đổi (chỉ dùng `type`, `problem`).

## #3 — Ngưỡng chỉnh được (`SettingsPage.jsx`)
Thêm 1 Row "Ngưỡng cảnh báo trùng" (icon `AlertTriangle`): thanh kéo `min=70 max=95 step=1`, hiện `{value}%`; `onChange` lưu `localStorage['pb-dup-threshold']` + toast. State khởi tạo từ localStorage (mặc định 85). KHÔNG cần reload (mỗi lần Thêm/Sửa/Import đọc lại localStorage).

## #4 — Kiểm trùng khi Import (`SmartImportModal.jsx`)
- Nhận thêm prop **`checkDuplicate`** (App truyền xuống).
- Trong `handleProcess`, **ngay trước `setStep('review')`**: với mỗi bài vừa bóc, `parseProblemLatex(rawLatex)` → `checkDuplicate(statement, solution)`; nếu có, gắn `dup = dups[0]` (bài giống nhất) vào item. (Đặt ở đây nên dùng chung màn "đang xử lý"; không lag gõ phím, không vướng cảnh báo eslint deps.)
- Thẻ rà soát: nếu `res.dup` → hiện chip cảnh báo amber "⚠ Có thể trùng — Đề: x% · Lời giải: y%". Phạm vi: vs **kho đã lưu** (trùng nội-mẻ-import để sau). Import **không chặn lưu** — chỉ cảnh báo.

## Mức can thiệp Code
- **MỚI:** `src/utils/findDuplicates.js` + `src/utils/findDuplicates.test.js`.
- `src/hooks/useProblems.js` — bỏ `calculateSimilarity` cục bộ (import từ util); viết lại `checkDuplicate` (chữ ký + đọc ngưỡng + trả mảng).
- `src/components/Modals/DuplicateWarningModal.jsx` — viết lại theo danh sách + 2 %.
- `src/App.jsx` — 2 call site `checkDuplicate(...statement, ...solution...)`; đổi `duplicateInfo` → `duplicates`; truyền `checkDuplicate` cho SmartImportModal.
- `src/components/SettingsPage.jsx` — Row ngưỡng + import `AlertTriangle`.
- `src/components/Modals/SmartImportModal.jsx` — prop `checkDuplicate`, gắn `dup` trong `handleProcess`, chip cảnh báo + import `AlertTriangle`.
- **KHÔNG** đụng `buildProblemTex.js`, `db.js`, schema, đường xuất.

## An toàn / Kiểm thử
- **Unit test mới** (`findDuplicates.test.js`): (a) chỉ đề giống → cờ qua OR; (b) chỉ lời giải giống → cờ qua OR; (c) không gì vượt ngưỡng → `[]`; (d) trả **danh sách xếp giảm dần**; (e) bỏ qua chính nó theo `currentId`; (f) `calculateSimilarity` chuỗi giống hệt → 1.0.
- **Golden test xuất GIỮ NGUYÊN** (3/3) — đường xuất không đổi.
- Toàn bộ: **14 passed** = 6 mới + 8 cũ (extractFigures 5 + buildContentFile 3).

## Rủi ro
- `checkDuplicate` đổi chữ ký → phải sửa **đủ 2 call site** trong App (không còn nơi khác gọi — đã grep).
- Kho lớn × mẻ import lớn: kiểm trùng import chạy 1 lần ở bước xử lý (không mỗi phím) → chấp nhận.
- Ngưỡng quá thấp → nhiều cảnh báo nhiễu; để Thầy tự chỉnh (mặc định 85% như cũ).

## Nghiệm thu
- **Claude check:** chỉ các file trên đổi (KHÔNG buildProblemTex/db/schema); `npm run build` 0 warning; **test mới pass** + **golden 3/3 không đổi**; App còn đúng 2 call site `checkDuplicate`.
- **Thầy (GUI):** Thêm 1 bài gần giống ≥2 bài có sẵn → modal hiện **danh sách** + "Đề/Lời giải %"; chỉnh ngưỡng trong Cài đặt thấy số bài cảnh báo đổi theo; Import 1 mẻ có bài trùng → thẻ rà soát hiện chip cảnh báo đúng bài.
