import { scanDuplicates, diceOfSets, normalizeForSim, bigramSet } from './scanDuplicates';
import { calculateSimilarity } from './findDuplicates';

const P = (id, statement, solution = '', dateAdded = '2026-01-01') => ({ id, statement, solution, dateAdded });

test('hai đề y hệt → 1 nhóm 2 bài, stmtSim = 1', () => {
  const g = scanDuplicates([P('a', 'Cho $x>0$ tìm min'), P('b', 'Cho $x>0$ tìm min')], 0.85);
  expect(g).toHaveLength(1);
  expect(g[0].members.map((m) => m.id).sort()).toEqual(['a', 'b']);
  expect(g[0].maxStmtSim).toBe(1);
});

test('đề khác nhưng lời giải y hệt ≥ ngưỡng → vẫn gộp (OR)', () => {
  const g = scanDuplicates([
    P('a', 'Đề một hoàn toàn khác biệt số một', 'Lời giải trùng khớp y hệt nhau nhé'),
    P('b', 'Đề hai khác hẳn nội dung thứ hai', 'Lời giải trùng khớp y hệt nhau nhé'),
  ], 0.85);
  expect(g).toHaveLength(1);
  expect(g[0].maxSolSim).toBe(1);
});

test('dưới ngưỡng → 0 nhóm', () => {
  const g = scanDuplicates([P('a', 'Tam giác ABC vuông tại A'), P('b', 'Số nguyên tố lớn hơn một trăm')], 0.85);
  expect(g).toHaveLength(0);
});

test('bắc cầu: A~B qua đề, B~C qua lời giải → một nhóm {A,B,C}', () => {
  const shared = 'Nội dung dùng chung đủ dài để vượt ngưỡng tương đồng nhé';
  const soln = 'Cùng lời giải chung đủ dài để nối B với C lại';
  const g = scanDuplicates([
    P('a', shared, 'Lời giải riêng của A hoàn toàn khác biệt hẳn'),
    P('b', shared, soln),
    P('c', 'Đề riêng của C khác hẳn không liên quan gì', soln),
  ], 0.85);
  expect(g).toHaveLength(1);
  expect(g[0].members.map((m) => m.id).sort()).toEqual(['a', 'b', 'c']);
});

test('members xếp theo dateAdded tăng dần (cũ trước)', () => {
  const g = scanDuplicates([
    P('new', 'Bài trùng khít hoàn toàn nhau đây', '', '2026-06-28'),
    P('old', 'Bài trùng khít hoàn toàn nhau đây', '', '2026-06-25'),
  ], 0.85);
  expect(g[0].members.map((m) => m.id)).toEqual(['old', 'new']);
});

test('an toàn rỗng: statement/solution rỗng không lỗi, không tự gộp', () => {
  const g = scanDuplicates([P('a', '', ''), P('b', '', '')], 0.85);
  expect(g).toHaveLength(0);
});

test('diceOfSets khớp calculateSimilarity trên mẫu', () => {
  const pairs = [['Cho a,b,c>0', 'Cho a,b,c>0'], ['Tam giác ABC', 'Tam giác XYZ'], ['x^2+y^2', 'x^2 + y^2'], ['', 'abc']];
  for (const [s1, s2] of pairs) {
    const c1 = normalizeForSim(s1), c2 = normalizeForSim(s2);
    expect(diceOfSets(c1, bigramSet(c1), c2, bigramSet(c2))).toBeCloseTo(calculateSimilarity(s1, s2), 10);
  }
});
