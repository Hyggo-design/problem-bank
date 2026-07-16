import {
  saveClassification, insertProblem, updateProblemRow, insertImportedProblems,
  softDeleteProblem, softDeleteMany, restoreProblemRow, purgeProblemRow, emptyTrashRows,
  buildInsertProblem, buildUpdateProblem, buildInsertImported,
  buildRenameTag, buildDeleteTag, buildPurge, buildEmptyTrash,
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

// ───────────────────────── BUILDERS (thuần, trả danh sách lệnh) ─────────────────────────
const sqlsOf = (stmts) => stmts.map((s) => s.sql);

describe('builders — trả đúng danh sách lệnh {sql, params}', () => {
  test('buildInsertProblem: lệnh đầu INSERT OR REPLACE problems (không timesUsed) rồi 3 DELETE + đúng số INSERT phân loại', () => {
    const stmts = buildInsertProblem(sample);
    const sqls = sqlsOf(stmts);
    expect(/INSERT OR REPLACE INTO problems/.test(sqls[0])).toBe(true);
    expect(sqls.some((s) => /timesUsed/.test(s))).toBe(false);
    // sample: 1 category + 1 difficulty + 1 grade → 1 + (3 DELETE + 1 + 1 + 1) = 7 lệnh
    expect(stmts).toHaveLength(7);
    expect(stmts[0].params).toHaveLength(13);
  });

  test('buildUpdateProblem: lệnh đầu UPDATE problems ... WHERE id = $11', () => {
    const sqls = sqlsOf(buildUpdateProblem(sample));
    expect(/^UPDATE problems SET/.test(sqls[0])).toBe(true);
    expect(/WHERE id = \$11/.test(sqls[0])).toBe(true);
  });

  test('buildInsertImported: rỗng → [] ; 60 bài → 2 câu INSERT chunk (50+10) + 60 cụm phân loại', () => {
    expect(buildInsertImported([])).toEqual([]);
    const many = Array.from({ length: 60 }, (_, i) => ({ ...sample, id: 'p' + i }));
    const stmts = buildInsertImported(many);
    const inserts = sqlsOf(stmts).filter((s) => /INSERT OR REPLACE INTO problems/.test(s));
    expect(inserts).toHaveLength(2);
    expect(sqlsOf(stmts).some((s) => /timesUsed/.test(s))).toBe(false);
    const dels = sqlsOf(stmts).filter((s) => /^DELETE FROM problem_categories WHERE problem_id = \$1$/.test(s));
    expect(dels).toHaveLength(60); // mỗi bài 1 lần dọn phân loại
  });

  test('buildRenameTag/buildDeleteTag: chỉ sinh lệnh cho bài THỰC SỰ đổi; không đổi → []', () => {
    const probs = [
      { id: 'a', tags: 'hình học, đại số' },
      { id: 'b', tags: 'số học' },
    ];
    const r = buildRenameTag(probs, 'đại số', 'ĐẠI SỐ');
    expect(r).toHaveLength(1);
    expect(r[0].params[1]).toBe('a');
    expect(buildRenameTag(probs, 'không-có', 'x')).toEqual([]);
    expect(buildDeleteTag(probs, 'số học')).toHaveLength(1);
  });

  test('buildPurge: đúng 4 DELETE ; buildEmptyTrash: 3 DELETE subquery + 1 DELETE problems', () => {
    expect(buildPurge('p1')).toHaveLength(4);
    const et = buildEmptyTrash();
    expect(et).toHaveLength(4);
    expect(et.filter((s) => /IN \(SELECT id FROM problems WHERE deletedAt IS NOT NULL\)/.test(s.sql))).toHaveLength(3);
  });
});
