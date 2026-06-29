import { extractFigures, parseProblemLatex, reconstructProblemLatex } from './extractFigures';

test('extractFigures: bỏ \\begin{center} bọc tikz, lưu hình trần', () => {
  const { clean, figures } = extractFigures(
    'Cho hình.\n\\begin{center}\n\\begin{tikzpicture}\n\\draw (0,0)--(1,0);\n\\end{tikzpicture}\n\\end{center}\nTính.'
  );
  expect(figures).toBe('\\begin{tikzpicture}\n\\draw (0,0)--(1,0);\n\\end{tikzpicture}');
  expect(clean).toBe('Cho hình.\n\nTính.');
});

test('extractFigures: includegraphics trần', () => {
  const { clean, figures } = extractFigures('Xem ảnh \\includegraphics[width=5cm]{h1} rồi giải.');
  expect(figures).toBe('\\includegraphics[width=5cm]{h1}');
  expect(clean).toBe('Xem ảnh  rồi giải.');
});

test('extractFigures: bài không hình -> không đổi', () => {
  const { clean, figures } = extractFigures('Chứng minh $x^2+y^2=z^2$.');
  expect(figures).toBe('');
  expect(clean).toBe('Chứng minh $x^2+y^2=z^2$.');
});

test('parseProblemLatex: tách đề/lời giải/hình', () => {
  const raw = '\\begin{bt}\nCho tam giác. \\begin{tikzpicture}\\draw (0,0)--(1,0);\\end{tikzpicture}\n\\loigiai{\n\\includegraphics{h}\nGiải.\n}\n\\end{bt}';
  const r = parseProblemLatex(raw);
  expect(r.statement).toBe('Cho tam giác.');
  expect(r.figStatement).toBe('\\begin{tikzpicture}\\draw (0,0)--(1,0);\\end{tikzpicture}');
  expect(r.solution).toBe('Giải.');
  expect(r.figSolution).toBe('\\includegraphics{h}');
});

test('round-trip: parse(reconstruct(p)) trả lại đúng p', () => {
  const p = {
    statement: 'Cho tam giác $ABC$.',
    solution: 'Dựng đường cao.',
    figStatement: '\\begin{tikzpicture}\n\\draw (0,0)--(1,0);\n\\end{tikzpicture}',
    figSolution: '\\includegraphics{hinh1}',
  };
  const r = parseProblemLatex(reconstructProblemLatex(p));
  expect(r.statement).toBe(p.statement);
  expect(r.solution).toBe(p.solution);
  expect(r.figStatement).toBe(p.figStatement);
  expect(r.figSolution).toBe(p.figSolution);
});
