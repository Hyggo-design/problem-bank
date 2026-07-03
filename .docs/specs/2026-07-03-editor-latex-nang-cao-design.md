# Editor LaTeX nâng cao (ô nhập thành "IDE thu nhỏ") — Design Spec

**Ngày:** 03/07/2026
**Trạng thái:** Thiết kế đã chốt (Thầy duyệt 03/07/2026). Chờ lập plan → build.
**Quy trình:** Claude brainstorm + spec + plan → Antigravity build → Claude check lại.
**Bối cảnh:** Nhật ký [NK25](../25_2026_07_03.md). Cải thiện trải nghiệm gõ LaTeX ở các ô nhập bài.

## Mục tiêu
Biến ô nhập LaTeX (đang là `<textarea>` thuần, chữ đen một màu) thành một **trình soạn thảo code thu nhỏ** dựa trên **CodeMirror 6**, với:
1. **Tô màu cú pháp (syntax highlighting)** cho LaTeX — *nỗi đau chính Thầy chọn*: khối chữ đen khó đọc, mỏi mắt, khó dò công thức/cấu trúc.
2. **Tự đóng cặp ngoặc** `{}` `[]` `()` `$…$` và **tự cặp môi trường** `\begin{...}` → `\end{...}`.
3. **Đánh dấu ngoặc khớp** + **số dòng** để cảm giác "IDE thu nhỏ" và bắt lỗi thiếu/thừa ngoặc sớm.

Áp dụng cho **cả 3 ô** có nhập LaTeX: Thêm bài, Sửa bài, và Smart Import.

## Quyết định đã chốt (qua brainstorm)
1. **Trọng tâm = tô màu cú pháp** (Thầy chỉ chọn nỗi đau "khối LaTeX toàn chữ đen khó đọc"). Tự đóng ngoặc/môi trường giữ lại vì rẻ và giúp file xuất ít lỗi biên dịch hơn.
2. **Công nghệ nền = CodeMirror 6** (không dùng Monaco/VS Code: quá nặng, khó cấu hình worker trong CRA). Không dùng bản-nhẹ Prism vì tự-đóng-ngoặc phải viết tay, kém chắc.
3. **Phạm vi = cả 3 ô** (Add, Edit, Smart Import) — cùng 1 component nên chi phí thêm không đáng kể.
4. **Gác lại (YAGNI)**: KHÔNG làm live-preview kiểu Overleaf, KHÔNG autocomplete gõ-gợi-ý lệnh trong đợt này (Thầy không chọn là ưu tiên). CodeMirror để mở đường thêm sau vẫn dễ.

### Đính chính quan trọng về "ổn định khi xuất file"
Thầy kỳ vọng editor xịn hơn ⇒ file `.tex` xuất ra ổn định hơn về **cú pháp + tách dòng + căn lề tab**. Đã xác minh trong code:
- `buildProblemTex.js` **đã tự căn lề tab** mỗi dòng (`indent(..., 1/2)`), **tự dựng khung** `\begin{bt}…\end{bt}`, tự bọc hình `\begin{center}`, tự đặt `\loigiai{…}` — **bất kể** ô nhập gõ lộn xộn hay ngay ngắn.
- ⇒ **Căn lề tab + khung ngoài của file xuất VỐN ĐÃ ổn định**, không phụ thuộc editor. Editor mới **không** đổi phần này (và **không được** đổi).
- Editor giúp thật ở: (a) **ít lỗi ngoặc/môi trường** (tự đóng) ⇒ file xuất **ít lỗi biên dịch**; (b) **nhìn ra lỗi sớm** nhờ màu (thiếu `$`, sai `\frac`…).

## Bối cảnh kỹ thuật (đã xác minh)
- **3 ô nhập LaTeX** cùng hợp đồng `value` (string) / `onChange`:
  - `AddProblemModal.jsx` — `formData.rawLatex`, `rows=8`.
  - `EditProblemModal.jsx` — `formData.rawLatex`, `rows=10`; khi Lưu có chuẩn hóa `\angle → \widehat` **trên chuỗi** (không liên quan editor).
  - `SmartImportModal.jsx` — `res.rawLatex` (mỗi bài AI nhập 1 ô), textarea **tự giãn cao** theo nội dung.
- Nội dung theo chuẩn gói **ex_test** (Việt): `\begin{bt} … \loigiai{…} … \end{bt}`; lệnh tùy biến (`\loigiai`, `\choice`, `\True`) — với stex mọi `\lệnh` đều được tô như nhau nên vẫn lên màu tốt.
- **Stack**: React 18 + `react-scripts` 5.0.1 (CRA, webpack 5 — nuốt ESM node_modules OK, **không cần eject**) trong Tauri 2. Font sẵn `@fontsource/jetbrains-mono`.
- **Palette (Ocean Tint)** trong `src/index.css` có đủ biến cho **cả Sáng lẫn Tối** (`--color-surface-muted`, `--color-text`, `--color-cobalt`, `--color-amber-text`, `--color-text-faint`, `--color-cobalt-bg`, `--color-text-subtle`…). Dùng `var(--…)` thẳng trong theme CodeMirror ⇒ **tự đổi theo Sáng/Tối, không cần theme riêng cho dark**.

## Kiến trúc: 1 component dùng chung `LatexEditor`
Tạo **`src/components/LatexEditor.jsx`** — bọc `@uiw/react-codemirror`. Hợp đồng **y hệt textarea** để thay drop-in:

```
<LatexEditor
  value={rawLatex}
  onChange={(val) => ...}      // nhận string, giống e.target.value
  placeholder="\begin{bt}…"
  minHeight="…" | rows={…}      // giữ chiều cao tương đương ô cũ
  autoGrow={false|true}         // true cho Smart Import (giữ cảm giác tự giãn)
/>
```

- **Ra/vào chỉ là một chuỗi văn bản thuần** — không ký tự ẩn, không tự định dạng lại. ⇒ `parseProblemLatex`, chuẩn hóa `\angle`, và xuất `buildProblemTex` **không đổi một dòng**.
- Dùng chung ở cả 3 modal (Add, Edit, Smart Import) — không lặp cấu hình.

## Tính năng editor (các extension CodeMirror)
- **Tô màu LaTeX**: `StreamLanguage.define(stex)` (từ `@codemirror/legacy-modes/mode/stex`) + `syntaxHighlighting` với `HighlightStyle` ánh xạ ra biến màu Ocean Tint (bảng dưới).
- **Tự đóng ngoặc**: `closeBrackets()` cho `{}` `[]` `()`; bổ sung `$` qua `languageData.closeBrackets` của stex. Gõ `{` → `{|}` (con trỏ giữa); gõ ngoặc đóng ngay trước ngoặc đóng cùng loại → "nuốt" (không đẻ thừa).
- **Tự cặp môi trường** `\begin{env}` → chèn `\end{env}`: một **extension nhỏ tự viết** (input handler bắt thời điểm gõ xong `}` của `\begin{...}`, chèn `\n\end{...}` xuống dưới, con trỏ nằm giữa). Chi tiết để bước plan/build.
- **Đánh dấu ngoặc khớp**: `bracketMatching()` — con trỏ cạnh `{` thì `}` tương ứng sáng lên.
- **Số dòng**: `lineNumbers()` (gutter mờ nhạt). *Nếu Thầy thấy rối, bỏ 1 dòng cấu hình là xong.*
- **Placeholder**: giữ gợi ý mẫu `\begin{bt}…` như hiện tại.
- **Phím Tab = nhảy ra khỏi ô** (KHÔNG bind `indentWithTab`): tránh kẹt focus trong form, tránh chèn tab rác vào nội dung lưu.
- **Font**: JetBrains Mono, cỡ 14px, khớp ô cũ.
- **Xuống dòng mềm** (line wrapping) bật để câu dài không tràn ngang.

## Theme màu (ánh xạ biến CSS — tự thích ứng Sáng/Tối)
| Thành phần | Biến CSS dùng |
|---|---|
| Nền editor | `--color-surface-muted` (nền ô input chuẩn) |
| Chữ thường | `--color-text` |
| Lệnh `\begin` `\frac` `\loigiai`… | `--color-cobalt` |
| Ngoặc/dấu phân cách `{}` `[]` `$` | `--color-text-subtle` |
| Nội dung toán trong `$…$` | `--color-amber-text` |
| Ghi chú `%…` | `--color-text-faint` |
| Dòng đang sửa / vùng chọn | `--color-cobalt-bg` |
| Ngoặc khớp (highlight) | nền `--color-cobalt-bg` |
| Viền + focus ô | `--color-border` / `--color-accent` (khớp `*:focus-visible` của app) |

*Màu cụ thể sẽ tinh chỉnh khi build (có thể dùng kỹ năng color-expert để cân tương phản AA).*

## KHÓA AN TOÀN — file xuất bất khả xâm phạm
- **KHÔNG đụng** `buildProblemTex.js`, `buildContentFile.js`, `parseProblemLatex`/`extractFigures.js`, schema/bảng DB. Editor **chỉ là lớp UI**, hợp đồng `value`/`onChange` y hệt textarea.
- **Golden test xuất `.tex` giữ nguyên** (byte-identical). Bổ sung 1 test chứng minh: một chuỗi rawLatex mẫu → (giả lập gõ qua editor, `value` không đổi) → `buildProblemTex` cho **kết quả y hệt** trước.
- Editor **chỉ thêm ký tự khi Thầy đang gõ** (auto-close), **không tự sửa** chữ đã có, **không reflow** nội dung.

## Thư viện thêm (package.json)
- `@uiw/react-codemirror` (wrapper React, kèm basic-setup: lineNumbers, closeBrackets, bracketMatching, history…).
- `@codemirror/legacy-modes` (mode `stex` cho LaTeX) + `@codemirror/language` (`StreamLanguage`, `HighlightStyle`, `syntaxHighlighting`).
- (Các gói `@codemirror/*` lõi đi kèm theo `codemirror` mà wrapper phụ thuộc — không cần thêm tay.)

## Mức độ can thiệp Code
| Chỗ | Thay đổi |
|---|---|
| `src/components/LatexEditor.jsx` | **MỚI** — component CodeMirror dùng chung (value/onChange, theme Ocean Tint, các extension, auto `\begin\end`) |
| `src/components/LatexEditor.test.js` *(hoặc thêm case vào `buildProblemTex.test.js`)* | **MỚI/BỔ SUNG** — round-trip: value editor → `buildProblemTex` byte-identical |
| `src/components/Modals/AddProblemModal.jsx` | thay `<textarea rawLatex>` → `<LatexEditor>` (giữ nhãn, validate, luồng lưu) |
| `src/components/Modals/EditProblemModal.jsx` | thay `<textarea rawLatex>` → `<LatexEditor>` (giữ chuẩn hóa `\angle`, luồng lưu) |
| `src/components/Modals/SmartImportModal.jsx` | thay `<textarea res.rawLatex>` → `<LatexEditor autoGrow>` (giữ min-height/tự giãn) |
| `package.json` | thêm deps CodeMirror |
| `src/index.css` *(nếu cần)* | vài dòng bọc `.cm-editor` cho khớp bo góc/viền/focus với ô cũ |

## Rủi ro & cách xử lý
- **CRA nuốt ESM CodeMirror**: rủi ro thấp (CRA5 = webpack5). Verify `npm run build` sạch; nếu vướng source-map-loader chỉ là **warning**, không chặn. **Không eject.**
- **Kẹt focus trong modal**: đã xử lý — KHÔNG bind Tab để indent ⇒ Tab thoát ô như textarea.
- **Auto-close gây ký tự thừa** khi dán/sửa: `closeBrackets` chỉ chèn khi *gõ*; thao tác dán không tự nhân ngoặc. Test lại gõ tay 1 bài đủ ngoặc.
- **Hiệu năng Smart Import nhiều ô**: mở ~20 kết quả = 20 editor. CodeMirror nhẹ, vẫn mượt; nếu cần, chỉ khởi tạo editor cho ô đang xem (để bước build cân nhắc, chưa tối ưu sớm).
- **Màu tương phản chưa đạt AA**: tinh chỉnh khi build, đối chiếu palette (color-expert).
- **Không đổi hành vi lưu**: chuỗi ra giống hệt ⇒ không rủi ro cho parse/xuất.

## Ngoài phạm vi (YAGNI)
- KHÔNG live-preview render công thức cạnh ô gõ (Overleaf-style).
- KHÔNG autocomplete gõ-gợi-ý lệnh (`\fr` → `\frac{}{}`), KHÔNG snippet.
- KHÔNG lint/nút "định dạng lại" (prettify) nội dung — vì xuất đã tự căn lề; tránh mọi thứ có thể sửa chữ của Thầy.
- KHÔNG đổi cấu trúc lưu, schema, hay đường xuất `.tex`.

## Tiêu chí nghiệm thu (cho bước Claude check lại)
- Ô nhập ở **cả 3 modal** là editor CodeMirror: lệnh/ngoặc/toán/ghi chú **lên màu**; đổi **Sáng↔Tối** màu editor đổi theo.
- Gõ `{` → `{|}`; gõ `\begin{center}` → tự có `\end{center}`; con trỏ đặt đúng chỗ.
- Con trỏ cạnh `{`/`}` → ngoặc khớp sáng; có **số dòng** bên trái.
- **Tab nhảy ra khỏi ô**, không chèn tab vào nội dung.
- Dán 1 bài cũ vào Add/Edit → **Lưu** → `buildProblemTex` cho `.tex` **byte-identical** như trước (**golden test xanh**).
- Smart Import: mỗi ô kết quả là editor màu, sửa được, lưu đúng; mở nhiều kết quả vẫn mượt.
- `npm test` xanh (kể cả test round-trip mới); `npm run build` không lỗi chặn; app chạy trong Tauri **không lỗi worker/ESM**.
