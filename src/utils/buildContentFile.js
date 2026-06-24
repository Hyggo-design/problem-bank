// Dựng FILE NỘI DUNG (.tex) để \input vào main.tex của Thầy.
// KHÔNG đụng khối mỗi bài: tái dùng buildProblemTex (sacred).
import { buildProblemTex } from './buildProblemTex';

// Đọc các ô header trong khối \begin{name}...\end{name}.
// Trả [{ label }] theo đúng thứ tự (nhãn = phần sau % của mỗi dòng {} %Nhãn).
export const parseHeaderFields = (templateText = '') => {
  const begin = templateText.indexOf('\\begin{name}');
  const end = templateText.indexOf('\\end{name}');
  if (begin === -1 || end === -1 || end < begin) return [];
  const block = templateText.slice(begin, end);
  const fields = [];
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*\{[^}]*\}\s*%\s*(.+?)\s*$/);
    if (m) fields.push({ label: m[1] });
  }
  return fields;
};

// Điền giá trị vào các ô {} trong khối name (theo thứ tự).
const fillHeader = (templateText, values = []) => {
  const begin = templateText.indexOf('\\begin{name}');
  const end = templateText.indexOf('\\end{name}');
  if (begin === -1 || end === -1 || end < begin) return templateText;
  const before = templateText.slice(0, begin);
  const block = templateText.slice(begin, end);
  const after = templateText.slice(end);
  let i = 0;
  const filledBlock = block.split('\n').map((line) => {
    if (/^\s*\{[^}]*\}\s*%/.test(line) && i < values.length) {
      const v = values[i++] ?? '';
      return line.replace(/\{[^}]*\}/, `{${v}}`);
    }
    return line;
  }).join('\n');
  return before + filledBlock + after;
};

// Dựng cả file nội dung: header đã điền + các khối bài nối ở cuối.
export const buildContentFile = (templateText, fieldValues, problems, { includeSolution = true, shuffle = false } = {}) => {
  const filled = fillHeader(templateText, fieldValues);
  let items = [...(problems || [])];
  if (shuffle) items = items.sort(() => Math.random() - 0.5);
  const blocks = items.map((p) => buildProblemTex(p, { includeSolution })).join('\n\n');
  return filled.replace(/\s*$/, '') + '\n\n' + blocks + '\n';
};
