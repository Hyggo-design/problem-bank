import { buildContentFile, parseHeaderFields } from './buildContentFile';
import { buildProblemTex } from './buildProblemTex';

const TEMPLATE = [
  '\\begin{name}',
  '\t{} %PHÒNG GIÁO DỤC',
  '\t{} %TRƯỜNG HỌC',
  '\t{} %TÊN KỲ THI',
  '\t{} %MÔN THI',
  '\t{} %NĂM HỌC',
  '\t{} %THỜI GIAN',
  '\\end{name}',
  '',
  '%Từ đây tôi bắt đầu gõ bài tập nè',
  '',
].join('\n');

test('parseHeaderFields đọc đúng 6 nhãn của Đề thi', () => {
  expect(parseHeaderFields(TEMPLATE).map((f) => f.label)).toEqual([
    'PHÒNG GIÁO DỤC', 'TRƯỜNG HỌC', 'TÊN KỲ THI', 'MÔN THI', 'NĂM HỌC', 'THỜI GIAN',
  ]);
});

test('buildContentFile khớp golden byte-for-byte', () => {
  const problems = [
    { statement: 'Chứng minh $x^2+y^2=z^2$ có vô số nghiệm nguyên.', solution: 'Bộ ba Pythagore.', options: [] },
    { statement: 'Chọn đáp án đúng:', solution: '', options: [{ text: '$1$', isTrue: false }, { text: '$2$', isTrue: true }] },
  ];
  const out = buildContentFile(
    TEMPLATE,
    ['PGD A', 'THPT B', 'KỲ THI C', 'Toán', '2025-2026', '90 phút'],
    problems,
    { includeSolution: true, shuffle: false }
  );
  const golden = [
    '\\begin{name}',
    '\t{PGD A} %PHÒNG GIÁO DỤC',
    '\t{THPT B} %TRƯỜNG HỌC',
    '\t{KỲ THI C} %TÊN KỲ THI',
    '\t{Toán} %MÔN THI',
    '\t{2025-2026} %NĂM HỌC',
    '\t{90 phút} %THỜI GIAN',
    '\\end{name}',
    '',
    '%Từ đây tôi bắt đầu gõ bài tập nè',
    '',
    '\\begin{bt}',
    '\tChứng minh $x^2+y^2=z^2$ có vô số nghiệm nguyên.',
    '\t\\loigiai{',
    '\t\tBộ ba Pythagore.',
    '\t}',
    '\\end{bt}',
    '',
    '\\begin{bt}',
    '\tChọn đáp án đúng:',
    '\t\\choice',
    '\t\t{$1$}',
    '\t\t{\\True $2$}',
    '\\end{bt}',
    '',
  ].join('\n');
  expect(out).toBe(golden);
});

test('buildProblemTex chèn hình đề + lời giải, bọc center, thụt lề đúng', () => {
  const p = {
    statement: 'Cho tam giác $ABC$.',
    figStatement: '\\begin{tikzpicture}\n\\draw (0,0)--(1,0);\n\\end{tikzpicture}',
    solution: 'Dựng đường cao.',
    figSolution: '\\includegraphics{hinh1}',
    options: [],
  };
  const expected = [
    '\\begin{bt}',
    '\tCho tam giác $ABC$.',
    '\t\\begin{center}',
    '\t\t\\begin{tikzpicture}',
    '\t\t\\draw (0,0)--(1,0);',
    '\t\t\\end{tikzpicture}',
    '\t\\end{center}',
    '\t\\loigiai{',
    '\t\t\\begin{center}',
    '\t\t\t\\includegraphics{hinh1}',
    '\t\t\\end{center}',
    '\t\tDựng đường cao.',
    '\t}',
    '\\end{bt}',
  ].join('\n');
  expect(buildProblemTex(p)).toBe(expected);
});
