import { calculateSimilarity, findDuplicates } from './findDuplicates';

const bank = [
  { id: 1, statement: 'Tính đạo hàm của hàm số y = x^2.', solution: 'Đạo hàm bằng 2x.' },
  { id: 2, statement: 'Giải phương trình bậc hai x^2 - 5x + 6 = 0.', solution: 'Nghiệm là 2 và 3.' },
  { id: 3, statement: 'Cho tam giác ABC vuông tại A.', solution: 'Áp dụng định lý Pytago.' },
];

test('calculateSimilarity: chuỗi giống hệt -> 1.0', () => {
  expect(calculateSimilarity('Cho tam giác ABC.', 'Cho tam giác ABC.')).toBe(1.0);
});

test('findDuplicates: chỉ ĐỀ giống vẫn gắn cờ (OR)', () => {
  const r = findDuplicates(bank, 'Tính đạo hàm của hàm số y = x^2.', 'Một lời giải khác hẳn không liên quan.', 0.85);
  expect(r.length).toBe(1);
  expect(r[0].problem.id).toBe(1);
  expect(r[0].statementSimilarity).toBe(1.0);
  expect(r[0].solutionSimilarity).toBeLessThan(0.85);
});

test('findDuplicates: chỉ LỜI GIẢI giống vẫn gắn cờ (OR)', () => {
  const r = findDuplicates(bank, 'Một đề bài hoàn toàn mới về xác suất thống kê.', 'Đạo hàm bằng 2x.', 0.85);
  expect(r.length).toBe(1);
  expect(r[0].problem.id).toBe(1);
  expect(r[0].solutionSimilarity).toBe(1.0);
  expect(r[0].statementSimilarity).toBeLessThan(0.85);
});

test('findDuplicates: không gì vượt ngưỡng -> mảng rỗng', () => {
  const r = findDuplicates(bank, 'Đề bài mới lạ không giống ai cả.', 'Lời giải mới toanh khác biệt.', 0.85);
  expect(r).toEqual([]);
});

test('findDuplicates: trả danh sách xếp % giảm dần', () => {
  const dupBank = [
    { id: 1, statement: 'Cho tam giác ABC.', solution: 'x' },
    { id: 2, statement: 'Cho tam giác ABC đều cạnh a.', solution: 'y' },
  ];
  const r = findDuplicates(dupBank, 'Cho tam giác ABC.', '', 0.5);
  expect(r.length).toBe(2);
  expect(r[0].problem.id).toBe(1); // giống nhất (1.0) đứng đầu
  expect(r[0].statementSimilarity).toBeGreaterThanOrEqual(r[1].statementSimilarity);
});

test('findDuplicates: bỏ qua chính nó khi Sửa (currentId)', () => {
  const r = findDuplicates(bank, bank[0].statement, bank[0].solution, 0.85, 1);
  expect(r).toEqual([]);
});
