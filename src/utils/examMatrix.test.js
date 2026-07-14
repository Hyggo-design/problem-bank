import { generateExamMatrix, countAvailableForCell, pickReplacementProblem } from './examMatrix';

// Cây: Hệ 'H' -> A -> A1 ; Hệ 'H' -> B
const childrenMap = { H: ['A', 'B'], A: ['A1'] };

const TL = 'Tự luận';
const TN = 'Trắc nghiệm 4 lựa chọn';

// Bộ bài mẫu (mức 'd1' trừ p5 ở 'd2'); mặc định loại Tự luận.
// p6 khác LOẠI (Trắc nghiệm) ở cùng ô A/d1 để test lọc theo loại câu.
const P = {
  p1: { id: 'p1', categoryIds: ['A'],      difficultyByHe: { H: 'd1' }, gradeIds: ['g9'], type: TL },
  p2: { id: 'p2', categoryIds: ['A1'],     difficultyByHe: { H: 'd1' }, gradeIds: ['g9'], type: TL }, // con của A
  p3: { id: 'p3', categoryIds: ['B'],      difficultyByHe: { H: 'd1' }, gradeIds: ['g8'], type: TL },
  p4: { id: 'p4', categoryIds: ['A', 'B'], difficultyByHe: { H: 'd1' }, gradeIds: [],     type: TL }, // vừa A vừa B
  p5: { id: 'p5', categoryIds: ['A'],      difficultyByHe: { H: 'd2' }, gradeIds: ['g9'], type: TL }, // khác mức
  p6: { id: 'p6', categoryIds: ['A'],      difficultyByHe: { H: 'd1' }, gradeIds: ['g9'], type: TN }, // khác loại (A/d1)
};
const problems = Object.values(P);
const noRecent = new Set();

const gen = (rows, opts = {}) => generateExamMatrix({
  problems, childrenMap, heId: 'H', gradeId: null, rows, types: [TL], recentUsageIds: noRecent, ...opts,
});

test('bốc đúng số câu khi kho đủ', () => {
  const { cells } = gen([{ rowId: 'r', categoryId: 'A', counts: { [TL]: { d1: 2 } } }]);
  expect(cells).toHaveLength(1);
  expect(cells[0].picked).toHaveLength(2);
  expect(cells[0].shortfall).toBe(0);
});

test('kho thiếu -> lấy hết + báo shortfall', () => {
  const { cells } = gen([{ rowId: 'r', categoryId: 'A', counts: { [TL]: { d1: 5 } } }]); // A-subtree d1 Tự luận = p1,p2,p4
  expect(cells[0].picked).toHaveLength(3);
  expect(cells[0].shortfall).toBe(2);
});

test('ưu tiên câu chưa dùng: p1 vừa dùng -> không bị bốc khi còn câu fresh', () => {
  const { cells } = gen([{ rowId: 'r', categoryId: 'A', counts: { [TL]: { d1: 2 } } }], { recentUsageIds: new Set(['p1']) });
  const ids = cells[0].picked.map((p) => p.id);
  expect(ids).toHaveLength(2);
  expect(new Set(ids)).toEqual(new Set(['p2', 'p4'])); // p1 (recent) bị đẩy xuống dự bị
});

test('không lặp câu giữa các ô trong cùng một đề', () => {
  const { cells, pickedProblems } = gen([
    { rowId: 'rA', categoryId: 'A', counts: { [TL]: { d1: 3 } } },
    { rowId: 'rB', categoryId: 'B', counts: { [TL]: { d1: 2 } } },
  ]);
  const allIds = cells.flatMap((c) => c.picked.map((p) => p.id));
  expect(new Set(allIds).size).toBe(allIds.length);                 // không id nào lặp
  expect(pickedProblems.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
});

test('lọc theo lớp: đúng lớp mới lấy; bỏ lớp thì lấy mọi lớp', () => {
  const g9 = gen([{ rowId: 'r', categoryId: 'A', counts: { [TL]: { d1: 9 } } }], { gradeId: 'g9' });
  expect(new Set(g9.cells[0].picked.map((p) => p.id))).toEqual(new Set(['p1', 'p2'])); // p4 lớp rỗng -> loại
  const all = gen([{ rowId: 'r', categoryId: 'A', counts: { [TL]: { d1: 9 } } }], { gradeId: null });
  expect(all.cells[0].picked).toHaveLength(3);
});

test('nhánh con được tính vào dòng cha', () => {
  const n = countAvailableForCell({ problems, childrenMap, heId: 'H', gradeId: null, categoryId: 'A', type: TL, difficultyId: 'd1' });
  expect(n).toBe(3); // p1(A) + p2(A1) + p4(A)
});

test('countAvailableForCell đếm đúng nhánh khác', () => {
  const n = countAvailableForCell({ problems, childrenMap, heId: 'H', gradeId: null, categoryId: 'B', type: TL, difficultyId: 'd1' });
  expect(n).toBe(2); // p3, p4
});

test('pickReplacementProblem loại excludeIds; hết câu -> null', () => {
  const rep = pickReplacementProblem({
    problems, childrenMap, heId: 'H', gradeId: null, categoryId: 'A', type: TL, difficultyId: 'd1',
    excludeIds: new Set(['p1', 'p2']), recentUsageIds: noRecent,
  });
  expect(rep.id).toBe('p4');
  const none = pickReplacementProblem({
    problems, childrenMap, heId: 'H', gradeId: null, categoryId: 'A', type: TL, difficultyId: 'd1',
    excludeIds: new Set(['p1', 'p2', 'p4']), recentUsageIds: noRecent,
  });
  expect(none).toBeNull();
});

// ---------- MỚI: chiều LOẠI CÂU (Ma trận v2) ----------

test('lọc theo loại câu: đúng loại mới được đếm/bốc', () => {
  // A/d1: Tự luận có p1,p2,p4 (3); Trắc nghiệm chỉ p6 (1)
  expect(countAvailableForCell({ problems, childrenMap, heId: 'H', gradeId: null, categoryId: 'A', type: TL, difficultyId: 'd1' })).toBe(3);
  expect(countAvailableForCell({ problems, childrenMap, heId: 'H', gradeId: null, categoryId: 'A', type: TN, difficultyId: 'd1' })).toBe(1);
});

test('generateExamMatrix bốc đúng loại; câu khác loại không lọt', () => {
  const { cells } = gen([{ rowId: 'r', categoryId: 'A', counts: { [TN]: { d1: 5 } } }], { types: [TN] });
  expect(cells[0].picked.map((p) => p.id)).toEqual(['p6']); // chỉ p6 là Trắc nghiệm
  expect(cells[0].shortfall).toBe(4);
});

test('pickReplacementProblem chỉ trả câu cùng loại (không rơi sang loại khác)', () => {
  // Ô A/d1 loại Trắc nghiệm chỉ có p6; loại p6 -> null, KHÔNG lấy p1..p4 (Tự luận).
  const rep = pickReplacementProblem({
    problems, childrenMap, heId: 'H', gradeId: null, categoryId: 'A', type: TN, difficultyId: 'd1',
    excludeIds: new Set(['p6']), recentUsageIds: noRecent,
  });
  expect(rep).toBeNull();
});

test('không bốc trùng khi 1 bài ở 2 nhánh, chọn cả 2 (Thầy nêu 14/07)', () => {
  const probs = [
    { id: 'C',  type: TL, difficultyByHe: { H: 'd1' }, categoryIds: ['nhanhA', 'nhanhB'], gradeIds: [] }, // bài chung
    { id: 'A2', type: TL, difficultyByHe: { H: 'd1' }, categoryIds: ['nhanhA'],           gradeIds: [] },
  ];
  const res = generateExamMatrix({
    problems: probs, childrenMap: {}, heId: 'H', gradeId: null,
    rows: [
      { rowId: 'r1', categoryId: 'nhanhA', counts: { [TL]: { d1: 1 } } },
      { rowId: 'r2', categoryId: 'nhanhB', counts: { [TL]: { d1: 1 } } },
    ],
    types: [TL], recentUsageIds: new Set(), rng: () => 0,
  });
  const ids = res.pickedProblems.map((p) => p.id).sort();
  expect(ids).toEqual(['A2', 'C']);           // 2 bài KHÁC nhau (bài chung chỉ ra 1 lần)
  expect(res.pickedProblems).toHaveLength(2); // tổng không trùng
});
