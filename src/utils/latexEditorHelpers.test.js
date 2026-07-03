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
