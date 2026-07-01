import { groupClassificationByHe } from './classification';

// Cây nhỏ: Toán Chuyên(tc) > Số học(sh) > {Đồng dư thức(ddt), Số nguyên tố(snt)}
const catById = {
  tc: { id: 'tc', name: 'Toán Chuyên', parent_id: null },
  sh: { id: 'sh', name: 'Số học', parent_id: 'tc' },
  ddt: { id: 'ddt', name: 'Đồng dư thức', parent_id: 'sh' },
  snt: { id: 'snt', name: 'Số nguyên tố', parent_id: 'sh' },
};
const parentMap = { tc: null, sh: 'tc', ddt: 'sh', snt: 'sh' };
const diffById = {};

test('gộp: bỏ nhánh cha khi có nhánh con cũng được gắn (không hiện path tiền tố)', () => {
  const problem = { categoryIds: ['tc', 'sh', 'ddt', 'snt'] };
  const groups = groupClassificationByHe(problem, catById, parentMap, diffById);
  expect(groups).toHaveLength(1);
  const paths = groups[0].paths;
  // Chỉ còn 2 nhánh lá; KHÔNG còn ['Toán Chuyên'] hay ['Toán Chuyên','Số học'].
  expect(paths).toHaveLength(2);
  expect(paths.every((p) => p.length === 3)).toBe(true);
  expect(paths).toContainEqual(['Toán Chuyên', 'Số học', 'Đồng dư thức']);
  expect(paths).toContainEqual(['Toán Chuyên', 'Số học', 'Số nguyên tố']);
});

test('giữ nhánh chung khi KHÔNG có nhánh con nào được gắn', () => {
  const problem = { categoryIds: ['sh'] };
  const groups = groupClassificationByHe(problem, catById, parentMap, diffById);
  expect(groups).toHaveLength(1);
  expect(groups[0].paths).toEqual([['Toán Chuyên', 'Số học']]);
});

test('hai nhánh lá anh em: giữ cả hai (không nhầm là tiền tố của nhau)', () => {
  const problem = { categoryIds: ['ddt', 'snt'] };
  const groups = groupClassificationByHe(problem, catById, parentMap, diffById);
  expect(groups[0].paths).toHaveLength(2);
});
