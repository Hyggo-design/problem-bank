import {
  saveClassification, insertProblem, updateProblemRow, insertImportedProblems,
  softDeleteProblem, softDeleteMany, restoreProblemRow, purgeProblemRow, emptyTrashRows,
} from './problemWrites';

// "db giả" chạy trơn tru
const okDb = () => ({
  execute: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
  select: jest.fn().mockResolvedValue([]),
});
// "db giả" hỏng (mô phỏng đĩa đầy / CSDL khoá)
const failDb = (msg = 'disk full') => ({
  execute: jest.fn().mockRejectedValue(new Error(msg)),
  select: jest.fn().mockRejectedValue(new Error(msg)),
});

const sample = {
  id: 'p1', statement: '$x^2$', options: [],
  categoryIds: ['c1'], difficultyByHe: { h1: 'd1' }, gradeIds: ['g1'],
};

// Mỗi mục: [tên hàm, cách chạy nó với 1 db cho trước]
const cases = [
  ['saveClassification',     (db) => saveClassification(db, 'p1', sample)],
  ['insertProblem',          (db) => insertProblem(db, sample)],
  ['updateProblemRow',       (db) => updateProblemRow(db, sample)],
  ['insertImportedProblems', (db) => insertImportedProblems(db, [sample])],
  ['softDeleteProblem',      (db) => softDeleteProblem(db, 'p1')],
  ['softDeleteMany',         (db) => softDeleteMany(db, ['p1', 'p2'])],
  ['restoreProblemRow',      (db) => restoreProblemRow(db, 'p1')],
  ['purgeProblemRow',        (db) => purgeProblemRow(db, 'p1')],
  ['emptyTrashRows',         (db) => emptyTrashRows(db)],
];

describe('problemWrites — CSDL hỏng thì NÉM lỗi (không nuốt)', () => {
  test.each(cases)('%s: db hỏng → ném lỗi', async (_n, run) => {
    await expect(run(failDb())).rejects.toThrow();
  });
  test.each(cases)('%s: db ổn → chạy xong không lỗi', async (_n, run) => {
    await expect(run(okDb())).resolves.not.toThrow();
  });
});

describe('problemWrites — biên rỗng là no-op (không gọi execute)', () => {
  test('insertImportedProblems([])', async () => {
    const db = okDb();
    await insertImportedProblems(db, []);
    expect(db.execute).not.toHaveBeenCalled();
  });
  test('softDeleteMany([])', async () => {
    const db = okDb();
    await softDeleteMany(db, []);
    expect(db.execute).not.toHaveBeenCalled();
  });
});

test('insertProblem: db ổn thì có chèn vào bảng problems, KHÔNG còn cột timesUsed', async () => {
  const db = okDb();
  await insertProblem(db, sample);
  const sqls = db.execute.mock.calls.map((c) => c[0]);
  expect(sqls.some((s) => /INSERT OR REPLACE INTO problems/.test(s))).toBe(true);
  // timesUsed đã dọn (cột chết) — không câu INSERT nào được nhắc tới nó nữa.
  expect(sqls.some((s) => /timesUsed/.test(s))).toBe(false);
});

test('insertImportedProblems: chèn hàng loạt cũng KHÔNG còn cột timesUsed', async () => {
  const db = okDb();
  await insertImportedProblems(db, [sample, { ...sample, id: 'p2' }]);
  const sqls = db.execute.mock.calls.map((c) => c[0]);
  expect(sqls.some((s) => /INSERT OR REPLACE INTO problems/.test(s))).toBe(true);
  expect(sqls.some((s) => /timesUsed/.test(s))).toBe(false);
});
