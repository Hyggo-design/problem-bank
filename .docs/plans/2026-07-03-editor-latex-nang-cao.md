# Editor LaTeX nâng cao (CodeMirror) — Build Plan

**What we're building:** Thay ô nhập LaTeX (đang là `<textarea>` chữ đen một màu) ở 3 màn hình (Thêm bài, Sửa bài, Smart Import) bằng một ô soạn thảo CodeMirror có **tô màu cú pháp**, **tự đóng ngoặc `{} [] $`** và **tự cặp `\begin...\end`**.

**Why:** Khối LaTeX hết "đen thui" khó đọc; Thầy dò công thức/cấu trúc nhanh hơn và ít gõ sai ngoặc → file `.tex` xuất ra ít lỗi biên dịch hơn.

**Approach:** Tạo **một component dùng chung `LatexEditor`** giữ **đúng hợp đồng `value`/`onChange` như textarea** (ra/vào chỉ là một chuỗi văn bản) → luồng bóc tách và xuất `.tex` **không đổi một dòng**. Tách phần logic dễ sai (`\begin` → `\end`, cấu hình ngoặc `$`) ra một **file thuần test được**, làm và kiểm nó trước. Sau đó lắp editor vào từng modal, mỗi lần lắp xong kiểm ngay trong app. KHÔNG đụng `buildProblemTex`/`parseProblemLatex`/schema.

**Spec:** [.docs/specs/2026-07-03-editor-latex-nang-cao-design.md](../specs/2026-07-03-editor-latex-nang-cao-design.md)

**Files we'll create or change:**
- `package.json` — thêm thư viện CodeMirror (npm tự sửa khi cài)
- `src/utils/latexEditorHelpers.js` — **MỚI**: logic thuần (nhận diện `\begin{...}`, dựng chuỗi `\end`, cấu hình ngoặc `$`)
- `src/utils/latexEditorHelpers.test.js` — **MỚI**: bộ kiểm cho file trên
- `src/components/LatexEditor.jsx` — **MỚI**: ô soạn thảo CodeMirror dùng chung (màu Ocean Tint, tự đóng ngoặc, tự cặp môi trường)
- `src/components/Modals/AddProblemModal.jsx` — thay `<textarea>` → `<LatexEditor>`
- `src/components/Modals/EditProblemModal.jsx` — thay `<textarea>` → `<LatexEditor>`
- `src/components/Modals/SmartImportModal.jsx` — thay `<textarea>` → `<LatexEditor>` (bỏ đoạn tự-giãn cũ)

**Giải nghĩa vài từ:** *CodeMirror* = thư viện làm "ô soạn thảo code" (tô màu, số dòng…); *component* = một mảnh giao diện React tái dùng được; *extension* = một "mảnh tính năng" gắn vào CodeMirror (vd tô màu, tự đóng ngoặc); *syntax highlighting* = tô màu cú pháp; *util thuần* = hàm chỉ tính toán, không đụng màn hình/mạng nên kiểm (test) rất dễ; *basicSetup* = gói cấu hình sẵn của CodeMirror (số dòng, tự đóng ngoặc, đánh dấu ngoặc khớp…).

---

### Task 1: Cài thư viện CodeMirror + xác nhận app vẫn chạy

**What you'll have when this is done:** Các thư viện CodeMirror đã nằm trong dự án và app vẫn biên dịch bình thường — chưa đổi giao diện gì.

- [ ] Bước 1: Cài thư viện (chạy ở thư mục gốc dự án `D:\0. Problems Bank`)
      Run: `npm install @uiw/react-codemirror @codemirror/language @codemirror/legacy-modes @codemirror/view @codemirror/state @lezer/highlight`
      You should see: cài xong không có dòng `npm error`; file `package.json` xuất hiện 6 mục mới trong `dependencies`. (Cảnh báo `deprecated`/`funding` là bình thường.)

- [ ] Bước 2: Xác nhận app vẫn biên dịch được (chưa dùng thư viện, chỉ kiểm việc cài không làm vỡ gì)
      Run: `npm run build`
      You should see: kết thúc bằng `Compiled successfully.` (hoặc chỉ có cảnh báo, KHÔNG có `Failed to compile`).
      Nếu `Failed to compile` → DỪNG, chép nguyên thông báo lỗi ra, đừng sửa lung tung.

- [ ] Bước 3: Lưu tiến độ
      Run: `git add package.json package-lock.json && git commit -m "chore(editor): cai thu vien CodeMirror"`

---

### Task 2: Viết logic thuần cho editor + bộ kiểm (làm phần dễ sai trước)

**What you'll have when this is done:** Hai hàm nhỏ đã được kiểm kỹ — biết chính xác khi nào một dòng kết thúc bằng `\begin{...}` và dựng đúng chuỗi `\end{...}` — mà chưa cần đụng tới CodeMirror.

- [ ] Bước 1: Tạo file mới `src/utils/latexEditorHelpers.js` với đúng nội dung sau:

```js
// Logic THUẦN cho ô soạn thảo LaTeX — KHÔNG import CodeMirror để Jest chạy được.
// (CRA mặc định không biên dịch ESM trong node_modules; tách ra đây thì test an toàn.)
// Dùng bởi: src/components/LatexEditor.jsx. Mẫu tương tự: backupRotation.js, searchText.js.

// Cấu hình cặp ngoặc tự đóng — gồm cả $ để tự đóng cặp toán $...$.
export const CLOSE_BRACKETS = { brackets: ['(', '[', '{', '$'] };

// Nếu đoạn text NGAY TRƯỚC con trỏ kết thúc bằng \begin{tênMôiTrường} thì trả về
// tênMôiTrường; ngược lại trả null. Cho phép chữ cái, @, và * (vd align*).
export const detectBeginEnv = (textBeforeCursor = '') => {
  const m = /\\begin\{([a-zA-Z@*]+)\}[ \t]*$/.exec(textBeforeCursor);
  return m ? m[1] : null;
};

// Chuỗi tự chèn để cặp \end: một dòng trống ở giữa rồi \end{tên}.
// KHÔNG chèn tab (đường xuất .tex đã tự căn lề — không nhét rác vào nội dung lưu).
export const buildEndInsertion = (env) => `\n\n\\end{${env}}`;
```

- [ ] Bước 2: Tạo file mới `src/utils/latexEditorHelpers.test.js` với đúng nội dung sau:

```js
import { detectBeginEnv, buildEndInsertion, CLOSE_BRACKETS } from './latexEditorHelpers';

test('detectBeginEnv: nhận đúng tên môi trường ở cuối dòng', () => {
  expect(detectBeginEnv('\\begin{center}')).toBe('center');
  expect(detectBeginEnv('   \\begin{bt}')).toBe('bt');       // có thụt lề đầu dòng
  expect(detectBeginEnv('\\begin{align*}')).toBe('align*');   // có dấu *
  expect(detectBeginEnv('\\begin{center}  ')).toBe('center'); // có khoảng trắng đuôi
});

test('detectBeginEnv: KHÔNG nhận khi chưa đóng ngoặc hoặc có chữ theo sau', () => {
  expect(detectBeginEnv('\\begin{center')).toBeNull();   // thiếu }
  expect(detectBeginEnv('\\begin{center} x')).toBeNull(); // có chữ sau }
  expect(detectBeginEnv('\\end{center}')).toBeNull();     // là \end, không phải \begin
  expect(detectBeginEnv('không có gì')).toBeNull();
});

test('buildEndInsertion: dựng \\end đúng, có dòng trống ở giữa, KHÔNG có tab', () => {
  expect(buildEndInsertion('center')).toBe('\n\n\\end{center}');
  expect(buildEndInsertion('bt')).toBe('\n\n\\end{bt}');
  expect(buildEndInsertion('center')).not.toMatch(/\t/);
});

test('CLOSE_BRACKETS: có { và $ (để tự đóng cặp toán)', () => {
  expect(CLOSE_BRACKETS.brackets).toContain('{');
  expect(CLOSE_BRACKETS.brackets).toContain('$');
});
```

- [ ] Bước 3: Chạy đúng bộ kiểm vừa viết
      Run: `npm test -- --watchAll=false latexEditorHelpers`
      You should see: `Tests: 4 passed, 4 total` (tất cả xanh, không có chữ "fail").
      Nếu có bài đỏ → DỪNG, đọc lỗi, so lại từng ký tự ở Bước 1.

- [ ] Bước 4: Lưu tiến độ
      Run: `git add src/utils/latexEditorHelpers.js src/utils/latexEditorHelpers.test.js && git commit -m "feat(editor): logic thuan begin/end + cau hinh ngoac + 4 test"`

---

### Task 3: Tạo component `LatexEditor` + lắp vào màn Thêm bài + kiểm trong app

**What you'll have when this is done:** Ô nhập LaTeX ở màn "Thêm Bài Tập Mới" đã thành editor CodeMirror có màu, tự đóng ngoặc và tự cặp `\begin\end` — chạy thật, nhìn thấy được.

- [ ] Bước 1: Tạo file mới `src/components/LatexEditor.jsx` với đúng nội dung sau:

```jsx
// Ô soạn thảo LaTeX dùng chung (CodeMirror 6). HỢP ĐỒNG GIỐNG TEXTAREA:
// nhận value (string) + onChange(value). KHÔNG tự sửa chữ, KHÔNG định dạng lại
// -> chuỗi ra y hệt textarea -> parse & xuất .tex KHÔNG đổi (khoá an toàn).
import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { tags as t } from '@lezer/highlight';
import { CLOSE_BRACKETS, detectBeginEnv, buildEndInsertion } from '../utils/latexEditorHelpers';

// --- Ngôn ngữ LaTeX (stex) + cho phép tự đóng cả dấu $ (toán) ---
const latexLang = StreamLanguage.define(stex);
const dollarClose = latexLang.data.of({ closeBrackets: CLOSE_BRACKETS });

// --- Bảng màu: ánh xạ ra biến CSS Ocean Tint -> TỰ đổi theo Sáng/Tối ---
const oceanHighlight = HighlightStyle.define([
  { tag: [t.tagName, t.keyword, t.controlKeyword, t.moduleKeyword, t.meta], color: 'var(--color-cobalt)' },
  { tag: [t.bracket, t.brace, t.paren, t.squareBracket, t.angleBracket, t.punctuation, t.separator], color: 'var(--color-text-subtle)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--color-text-faint)', fontStyle: 'italic' },
  { tag: [t.atom, t.number, t.string, t.literal, t.labelName], color: 'var(--color-amber-text)' },
  { tag: [t.variableName, t.typeName, t.className, t.propertyName], color: 'var(--color-text)' },
  { tag: t.invalid, color: 'var(--color-border-danger)' },
]);

// --- Theme khung editor (nền, chữ, gutter số dòng, ngoặc khớp, focus) ---
const oceanTheme = EditorView.theme({
  '&': { color: 'var(--color-text)', backgroundColor: 'var(--color-surface-muted)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px' },
  '&.cm-focused': { outline: '2px solid var(--color-accent)', outlineOffset: '2px' },
  '.cm-content': { fontFamily: '"JetBrains Mono", monospace', padding: '10px 6px', caretColor: 'var(--color-text)' },
  '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--color-text-faint)', border: 'none' },
  '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--color-text)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--color-cobalt-bg)' },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': { backgroundColor: 'var(--color-cobalt-bg)', outline: '1px solid var(--color-accent)' },
  '.cm-placeholder': { color: 'var(--color-text-faint)' },
});

// --- Extension: nhấn Enter ngay sau \begin{env} -> tự thêm \end{env} ---
const beginEndOnEnter = Prec.high(keymap.of([{
  key: 'Enter',
  run: (view) => {
    const { state } = view;
    const sel = state.selection.main;
    if (!sel.empty) return false;                 // đang bôi đen -> Enter thường
    const pos = sel.head;
    const line = state.doc.lineAt(pos);
    const env = detectBeginEnv(line.text.slice(0, pos - line.from));
    if (!env) return false;                        // không phải \begin -> Enter thường
    view.dispatch({
      changes: { from: pos, insert: buildEndInsertion(env) },
      selection: { anchor: pos + 1 },              // con trỏ ở dòng trống giữa
      userEvent: 'input.complete',
      scrollIntoView: true,
    });
    return true;
  },
}]));

const EXTENSIONS = [latexLang, dollarClose, syntaxHighlighting(oceanHighlight), beginEndOnEnter, EditorView.lineWrapping];

// Bật đúng thứ cần: số dòng, tự đóng ngoặc, đánh dấu ngoặc khớp. Tắt thứ không dùng.
const BASIC_SETUP = {
  lineNumbers: true,
  bracketMatching: true,
  closeBrackets: true,
  foldGutter: false,
  autocompletion: false,        // đợt này KHÔNG làm gợi-ý-gõ
  searchKeymap: false,          // tránh Ctrl+F chiếm phím trong modal
  highlightActiveLine: false,   // giữ ô nhập gọn, không nhấp nháy nền
  highlightActiveLineGutter: false,
};

const LatexEditor = ({ value, onChange, placeholder, minHeight = '180px', maxHeight = '360px' }) => {
  const extensions = useMemo(() => EXTENSIONS, []); // cố định -> không dựng lại mỗi lần gõ
  return (
    <CodeMirror
      value={value}
      onChange={onChange}          /* (val: string) => void — giống e.target.value */
      extensions={extensions}
      theme={oceanTheme}
      basicSetup={BASIC_SETUP}
      placeholder={placeholder}
      minHeight={minHeight}
      maxHeight={maxHeight}
      style={{ width: '100%' }}
    />
  );
};

export default LatexEditor;
```

- [ ] Bước 2: Mở `src/components/Modals/AddProblemModal.jsx`. Ngay dưới dòng `import ClassificationPicker from '../ClassificationPicker';`, thêm:

```js
import LatexEditor from '../LatexEditor';
```

- [ ] Bước 3: Vẫn trong `AddProblemModal.jsx`, tìm nguyên khối `<textarea>` sau (khoảng dòng 108–114):

```jsx
            <textarea
              value={formData.rawLatex}
              onChange={(e) => setFormData({...formData, rawLatex: e.target.value})}
              placeholder="\begin{bt}&#10;Nội dung đề bài...&#10;\loigiai{ Lời giải... }&#10;\end{bt}"
              rows="8"
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace', fontSize: '14px', resize: 'vertical' }}
            />
```

Thay TOÀN BỘ khối đó bằng:

```jsx
            <LatexEditor
              value={formData.rawLatex}
              onChange={(val) => setFormData((f) => ({ ...f, rawLatex: val }))}
              placeholder={"\\begin{bt} ... \\loigiai{ ... } ... \\end{bt}"}
              minHeight="180px"
            />
```

- [ ] Bước 4: Kiểm trong app
      Run: `npx tauri dev`
      Mở app → bấm **"+ Thêm bài"** → nhìn ô "Mã LaTeX". Lần lượt thử:
      - **Có số dòng** bên trái, khung bo góc như cũ.
      - Gõ `\frac` → chữ lên **màu xanh cobalt**; gõ `%ghi chú` → **xám mờ**.
      - Gõ `{` → tự hiện `}` với con trỏ ở giữa; gõ `$` → tự hiện `$` thứ hai.
      - Gõ `\begin{center}` rồi **nhấn Enter** → tự thêm `\end{center}` ở dưới, con trỏ nằm ở dòng trống giữa.
      - Nhấn **Tab** → con trỏ **nhảy ra khỏi ô** (không chèn tab vào nội dung).
      Nếu Console (F12) báo `Unrecognized extension value` → chạy `npm dedupe` rồi mở lại (gộp trùng bản `@codemirror/state`).

- [ ] Bước 5: Lưu tiến độ
      Run: `git add src/components/LatexEditor.jsx src/components/Modals/AddProblemModal.jsx && git commit -m "feat(editor): component LatexEditor + lap vao man Them bai"`

---

### Task 4: Lắp editor vào màn Sửa bài + kiểm

**What you'll have when this is done:** Ô "Mã LaTeX" ở màn "Chỉnh Sửa Bài Tập" cũng là editor CodeMirror, sửa và lưu đúng như trước.

- [ ] Bước 1: Mở `src/components/Modals/EditProblemModal.jsx`. Ngay dưới dòng `import ClassificationPicker from '../ClassificationPicker';`, thêm:

```js
import LatexEditor from '../LatexEditor';
```

- [ ] Bước 2: Vẫn trong `EditProblemModal.jsx`, tìm nguyên khối `<textarea>` sau (khoảng dòng 113–118):

```jsx
            <textarea
              value={formData.rawLatex}
              onChange={(e) => setFormData({...formData, rawLatex: e.target.value})}
              rows="10"
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace', fontSize: '14px', resize: 'vertical' }}
            />
```

Thay TOÀN BỘ khối đó bằng:

```jsx
            <LatexEditor
              value={formData.rawLatex}
              onChange={(val) => setFormData((f) => ({ ...f, rawLatex: val }))}
              minHeight="220px"
            />
```

- [ ] Bước 3: Kiểm trong app (nếu `npx tauri dev` chưa chạy thì bật lại)
      Mở một bài đã có → bấm nút **sửa (✏️)**. You should see:
      - Ô "Mã LaTeX" hiện **đúng nội dung bài cũ**, có màu và số dòng.
      - Sửa một chữ trong đề (vd thêm `$a+b$`) → bấm **"Cập Nhật Thay Đổi"** → toast báo lưu; mở lại bài đó thấy thay đổi còn nguyên.
      Nếu nội dung KHÔNG hiện khi mở modal → DỪNG, kiểm lại Bước 2 (đã giữ `value={formData.rawLatex}` chưa).

- [ ] Bước 4: Lưu tiến độ
      Run: `git add src/components/Modals/EditProblemModal.jsx && git commit -m "feat(editor): lap LatexEditor vao man Sua bai"`

---

### Task 5: Lắp editor vào Smart Import + kiểm

**What you'll have when this is done:** Mỗi ô soát bài do AI nhập trong Smart Import là editor CodeMirror có màu; bỏ được đoạn code tự-giãn cũ vì CodeMirror tự cao theo nội dung.

- [ ] Bước 1: Mở `src/components/Modals/SmartImportModal.jsx`. Ngay dưới dòng `import ClassificationPicker from '../ClassificationPicker';`, thêm:

```js
import LatexEditor from '../LatexEditor';
```

- [ ] Bước 2: Vẫn trong `SmartImportModal.jsx`, tìm nguyên khối `<textarea>` sau (khoảng dòng 343–364):

```jsx
                  <textarea 
                    value={res.rawLatex} 
                    onChange={(e) => updateResultItem(res.id, 'rawLatex', e.target.value)}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    style={{ 
                      width: '100%', 
                      boxSizing: 'border-box', // Chìa khóa để không bị tràn khung
                      minHeight: '120px', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      border: '1px solid var(--color-border)', 
                      fontFamily: 'monospace', 
                      fontSize: '14px',
                      resize: 'none', // Tắt thanh kéo gạch chéo ở góc
                      backgroundColor: 'var(--color-surface-muted)',
                      color: 'var(--color-text)',
                      overflow: 'hidden' // Giấu thanh cuộn thừa
                    }}
                  />
```

Thay TOÀN BỘ khối đó bằng:

```jsx
                  <LatexEditor
                    value={res.rawLatex}
                    onChange={(val) => updateResultItem(res.id, 'rawLatex', val)}
                    minHeight="120px"
                    maxHeight="320px"
                  />
```

- [ ] Bước 3: Kiểm trong app
      Mở **Smart Import** → nhập/dán vài bài để AI nhận diện ra danh sách kết quả. You should see:
      - Mỗi ô kết quả là editor **có màu + số dòng**; ô **tự cao theo nội dung**, dài quá thì cuộn trong ô (không tràn khung).
      - Sửa một ô (vd đổi công thức) rồi **lưu hàng loạt** → bài lưu ra đúng nội dung đã sửa.
      - Mở danh sách ~10–20 kết quả vẫn **cuộn mượt**, không giật.

- [ ] Bước 4: Lưu tiến độ
      Run: `git add src/components/Modals/SmartImportModal.jsx && git commit -m "feat(editor): lap LatexEditor vao Smart Import, bo auto-grow cu"`

---

### Task 6: Kiểm an toàn LaTeX đầu–cuối + chạy toàn bộ test + xác nhận xuất .tex nguyên vẹn

**What you'll have when this is done:** Bằng chứng tận mắt: gõ bài có công thức qua editor mới → xuất `.tex` → công thức ra **đúng**; cả kho test vẫn xanh; và đường xuất LaTeX **không hề bị đụng**.

- [ ] Bước 1: Thêm một bài có công thức bằng editor mới
      Trong app (`npx tauri dev`) → **+ Thêm bài** → gõ đúng nội dung sau vào ô LaTeX (gõ tay để thử tự-đóng-ngoặc), rồi phân loại tạm và **Lưu**:

```
\begin{bt}
Chứng minh rằng $x^2 + y^2 = z^2$ có vô số nghiệm nguyên dương.
\loigiai{
Chọn $x = m^2 - n^2$, $y = 2mn$, $z = m^2 + n^2$.
}
\end{bt}
```

      You should see: lưu xong không báo lỗi; bài mới hiện trong danh sách, công thức $x^2+y^2=z^2$ hiển thị đẹp (KaTeX).

- [ ] Bước 2: Xuất bài vừa thêm ra `.tex` và soi nội dung
      Cho bài đó vào giỏ → **Xuất** ra file `.tex` (như quy trình thường ngày) → mở file `.tex` bằng Notepad.
      You should see: trong file có đúng dòng `Chứng minh rằng $x^2 + y^2 = z^2$ ...` và khối `\begin{bt} ... \loigiai{ ... } ... \end{bt}` **thụt lề bằng tab gọn gàng** như mọi khi. Công thức KHÔNG bị vỡ, KHÔNG thừa/thiếu ngoặc.

- [ ] Bước 3: Chạy TOÀN BỘ bài kiểm
      Run: `npm test -- --watchAll=false`
      You should see: dòng tổng kết `Tests: <tất cả> passed` — gồm 4 bài mới `latexEditorHelpers` và các bài **golden export** trong `buildContentFile.test.js` vẫn xanh. KHÔNG có bài đỏ.

- [ ] Bước 4: Xác nhận đường xuất KHÔNG đổi (khoá an toàn)
      Run: `git status --short`
      You should see: KHÔNG có thay đổi ở `src/utils/buildProblemTex.js`, `src/utils/buildContentFile.js`, `src/utils/extractFigures.js`, hay `src/utils/db.js`. Chỉ các file trong danh sách kế hoạch mới xuất hiện. Đây là bằng chứng đường xuất LaTeX an toàn.

- [ ] Bước 5: Build bản phát hành sạch
      Run: `npm run build`
      You should see: `Compiled successfully.` — nếu có cảnh báo về source-map trong `@codemirror/*` thì chỉ là **warning**, chấp nhận được; KHÔNG được có `Failed to compile`.

> **Lưu ý bàn giao:** Sau khi Antigravity làm xong 6 Task, **Claude sẽ check lại** (đối chiếu plan từng dòng, chạy test, soi golden export, thử GUI) rồi Thầy nghiệm thu. **Chỉ `git push` sau khi Thầy nghiệm thu** — đúng nhịp các phiên trước.

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order — don't skip ahead
3. Complete the "Check it works" step before moving to the next task
4. If something doesn't work as expected, stop and describe what you see — don't try random fixes

Say "let's start building" when you're ready to begin Task 1.
