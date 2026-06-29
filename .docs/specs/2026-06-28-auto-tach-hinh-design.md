# Tự tách hình + Badge "Có hình" — Design Spec

**Ngày:** 28/06/2026
**Trạng thái:** Thiết kế đã chốt (Thầy duyệt 28/06/2026). Antigravity build → Claude check.
**Là phần nâng cấp của** tính năng Hình vẽ (`2026-06-28-hinh-ve-va-can-le-xuat`).

## Mục tiêu
1. **Tự tách hình (#1):** thay vì 2 ô hình thủ công, app **tự phát hiện & tách** mã hình (TikZ/ảnh) khỏi mã LaTeX dán vào — giống như đang tự tách đề/lời giải. Tốt nhất khi **import nhiều**.
2. **Badge "Có hình" (#2):** chỉ báo trực quan trên **thẻ bài** và **"Xem đầy đủ"** để biết ngay bài nào kèm hình.

## Điểm cốt lõi về an toàn
**KHÔNG đụng đường xuất:** `buildProblemTex` giữ nguyên, **không đổi schema** (2 cột `figStatement`/`figSolution` đã có từ đợt trước). Chỉ thay đổi **đường NHẬP** (lúc tách bài từ mã LaTeX) + thêm **badge** đọc 2 cột sẵn có. ⇒ Rủi ro thấp hơn đợt trước; **golden test xuất giữ nguyên**.

---

## #1 — Tự tách hình

### Trải nghiệm
- Form Thêm/Sửa: **bỏ 2 ô hình thủ công**, quay lại **một ô "Mã LaTeX"** duy nhất. Thầy dán cả bài (hình inline, có/không bọc `\begin{center}`).
- Khi **Lưu**: app tự tách `rawLatex` → đề bài / lời giải / `figStatement` / `figSolution`.
- Khi **Sửa**: app **ghép hình trở lại** vào ô Mã LaTeX (ở vị trí canonical) cho Thầy xem & sửa.
- Áp dụng ở **mọi nơi tạo bài**: Thêm, Sửa, **Smart Import** (`handleFinalSave`).

### Quy tắc tách (util `extractFigures(text)` → `{ clean, figures }`)
Chạy trên **từng phần** (đề và lời giải) SAU khi đã tách đề/lời giải:
1. `\begin{center}…\end{center}` **có chứa** `\begin{tikzpicture}` hoặc `\includegraphics` → lấy phần bên trong (trim), **bỏ lớp center**, xoá cả khối khỏi text. (Center KHÔNG chứa hình → giữ nguyên.)
2. `\begin{tikzpicture}…\end{tikzpicture}` để trần còn sót → tách.
3. `\includegraphics[...]{…}` để trần còn sót → tách.
- Nhiều hình trong một phần → **nối bằng xuống dòng**. Phần chữ còn lại (dọn dòng trống thừa) → đề/lời giải sạch.
- **Bài không có hình → không tách gì** → đề/lời giải y nguyên.

### Util dùng chung (DRY, thay logic tách đang lặp ở 3 nơi)
- `parseProblemLatex(raw)` → `{ statement, solution, figStatement, figSolution }`: bỏ `\begin{bt}`/`\end{bt}` → tách `\loigiai{}` (regex sẵn có) → `extractFigures` cho từng phần. Dùng ở **AddProblemModal**, **EditProblemModal** (sau bước chuẩn hoá `\angle`→`\widehat`), **SmartImportModal.handleFinalSave**.
- `reconstructProblemLatex(problem)` → ghép `\begin{bt}\n{statement}\n{figStatement}\n\loigiai{\n{figSolution}\n{solution}\n}\n\end{bt}` (hình ở vị trí canonical). Dùng ở **EditProblemModal** lúc nạp bài vào form.

### Round-trip (sửa đi sửa lại vẫn ổn)
Hình được **chuẩn hoá**: lưu dạng trần (đã bỏ center) + đặt ở vị trí canonical. `parseProblemLatex(reconstructProblemLatex(p))` trả lại đúng `p` (idempotent) — có **test khoá**. Ngoại lệ hiếm: đề có chữ literal `\includegraphics`/`tikzpicture` KHÔNG phải để vẽ hình sẽ bị bắt nhầm (gần như không xảy ra trong Toán).

---

## #2 — Badge "Có hình"
- Điều kiện: `problem.figStatement` HOẶC `problem.figSolution` có nội dung.
- **Thẻ bài** (`ProblemCard`): chip nhỏ "📐 Có hình" ở dòng meta (VÙNG 3a, cạnh Loại/Lớp/tag).
- **Xem đầy đủ** (`PreviewPanel`): thêm vào dòng meta ở header (cạnh phân loại • độ khó • lớp • loại).

---

## Xuất ra (.tex)
**KHÔNG đổi** — `buildProblemTex` giữ nguyên: hình đề sau đề bài, hình lời giải đầu `\loigiai`, đều bọc `\begin{center}`, thụt lề TAB. Vì lưu hình dạng trần nên export bọc center một lần (không double).

## Mức can thiệp Code
- **MỚI:** `src/utils/extractFigures.js` (chứa `extractFigures` + `parseProblemLatex` + `reconstructProblemLatex`) + `src/utils/extractFigures.test.js`.
- `src/components/Modals/AddProblemModal.jsx` — bỏ 2 ô hình; dùng `parseProblemLatex` trong `handleSubmit`.
- `src/components/Modals/EditProblemModal.jsx` — bỏ 2 ô hình; nạp form bằng `reconstructProblemLatex`; lưu bằng `parseProblemLatex`.
- `src/components/Modals/SmartImportModal.jsx` — `handleFinalSave` dùng `parseProblemLatex`.
- `src/components/ProblemCard.jsx` — badge.
- `src/components/PreviewPanel.jsx` — badge.
- **KHÔNG** đụng `buildProblemTex.js`, `db.js`, schema, `useProblems.js` (cột đã có; `...p` tự mang vào).

## An toàn / Kiểm thử
- **Unit test mới** (`extractFigures.test.js`): (a) center bọc tikz → tách & bỏ center; (b) includegraphics trần; (c) tikz trần; (d) bài không hình → không đổi; (e) **round-trip** `parse(reconstruct(p)) === p`.
- **Golden test xuất GIỮ NGUYÊN** (3/3) — đường xuất không đổi.
- Bài cũ tạo bằng 2-ô-thủ-công (đợt trước) vẫn sống: Sửa → `reconstruct` ghép hình inline → `parse` tách lại (idempotent), không mất.

## Rủi ro
- Bắt nhầm `\includegraphics`/`tikzpicture` xuất hiện như chữ literal trong đề (hiếm).
- `\begin{figure}` KHÔNG hỗ trợ (Thầy không dùng) — nếu sau này cần thì thêm.
- Round-trip phụ thuộc idempotency của extract/reconstruct → có test khoá.

## Nghiệm thu
- **Claude check:** chỉ các file trên đổi (KHÔNG buildProblemTex/db/schema); `npm run build` 0 warning; **test mới pass** + **golden 3/3 không đổi**.
- **Thầy (GUI):** dán 1 bài có `\begin{center}\begin{tikzpicture}…` trong đề + `\includegraphics` trong lời giải → Lưu → mở Sửa thấy hình ghép lại đúng → Xuất → PDF ra hình đúng; thẻ + Xem đầy đủ hiện badge "Có hình".
