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
