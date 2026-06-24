import { buildContentFile, parseHeaderFields } from './buildContentFile';

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
    'Chứng minh $x^2+y^2=z^2$ có vô số nghiệm nguyên.',
    '\\loigiai{',
    'Bộ ba Pythagore.',
    '}',
    '\\end{bt}',
    '',
    '\\begin{bt}',
    'Chọn đáp án đúng:',
    '\\choice',
    '  {$1$}',
    '  {\\True $2$}',
    '\\end{bt}',
    '',
  ].join('\n');
  expect(out).toBe(golden);
});
