// Tầng ghi CSDL, tách khỏi React hook để kiểm được độc lập. Gồm 2 nhóm:
//  1) BUILDERS (thuần): trả DANH SÁCH lệnh {sql, params} — cả cụm chạy TRỌN GÓI dưới Rust (runTx).
//     Dùng cho các thao tác NHIỀU lệnh (thêm/sửa/nhập/tag/xoá hẳn/dọn rác) → all-or-nothing.
//  2) Ghi MỘT lệnh (nhận `db` đã mở): xoá mềm / khôi phục — SQLite đã atomic từng lệnh nên không cần bọc.
// SQL & thứ tự tham số bê nguyên bản cũ — không đổi câu lệnh, chỉ đổi CHỖ chạy.
import { applyTagRename, applyTagDelete } from './tagUtils';

// ───────────────────────── Ghi MỘT lệnh (atomic sẵn, chạy qua plugin) ─────────────────────────

// Xóa mềm 1 bài -> đánh dấu deletedAt.
export const softDeleteProblem = async (db, id) => {
  await db.execute('UPDATE problems SET deletedAt = $1 WHERE id = $2', [new Date().toISOString(), id]);
};

// Xóa mềm hàng loạt bằng 1 câu lệnh. Rỗng -> no-op (tránh IN ()).
export const softDeleteMany = async (db, ids) => {
  if (!ids || ids.length === 0) return;
  const now = new Date().toISOString();
  // $1 = thời điểm xoá; các id bắt đầu từ $2
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  await db.execute(`UPDATE problems SET deletedAt = $1 WHERE id IN (${placeholders})`, [now, ...ids]);
};

// Khôi phục: bỏ dấu xoá.
export const restoreProblemRow = async (db, id) => {
  await db.execute('UPDATE problems SET deletedAt = NULL WHERE id = $1', [id]);
};

// ───────────────────────── BUILDERS (thuần, trả danh sách lệnh {sql, params}) ─────────────────────────
// Không chạm DB. Cả cụm sẽ chạy TRỌN GÓI dưới Rust (runTx). SQL & thứ tự tham số bê nguyên hàm cũ.

// Lưu phân loại theo kiểu XÓA-RỒI-GHI (dùng cả khi thêm mới lẫn khi sửa).
// cls = { categoryIds: string[], difficultyByHe: {heId: diffId}, gradeIds: string[] }
export const buildClassificationStmts = (problemId, cls = {}) => {
  const s = [
    { sql: 'DELETE FROM problem_categories WHERE problem_id = $1', params: [problemId] },
    { sql: 'DELETE FROM problem_difficulties WHERE problem_id = $1', params: [problemId] },
    { sql: 'DELETE FROM problem_grades WHERE problem_id = $1', params: [problemId] },
  ];
  for (const cid of (cls.categoryIds || [])) {
    s.push({ sql: 'INSERT INTO problem_categories (problem_id, category_id) VALUES ($1, $2)', params: [problemId, cid] });
  }
  for (const [heId, diffId] of Object.entries(cls.difficultyByHe || {})) {
    if (diffId) s.push({ sql: 'INSERT INTO problem_difficulties (problem_id, he_id, difficulty_id) VALUES ($1, $2, $3)', params: [problemId, heId, diffId] });
  }
  for (const gid of (cls.gradeIds || [])) {
    s.push({ sql: 'INSERT INTO problem_grades (problem_id, grade_id) VALUES ($1, $2)', params: [problemId, gid] });
  }
  return s;
};

// Thêm/ghi đè 1 bài (INSERT OR REPLACE) + phân loại đi kèm.
export const buildInsertProblem = (p) => {
  const optionsStr = JSON.stringify(p.options || []);
  return [
    {
      sql: `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, type, shortAnswer, options, metadata, figStatement, figSolution)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      params: [
        p.id, p.statement || '', p.solution || '', p.topic || 'Chưa phân loại',
        parseInt(p.level) || 1, p.tags || '', p.dateAdded || new Date().toISOString(),
        p.type || 'Tự luận', p.shortAnswer || '', optionsStr, '{}',
        p.figStatement || '', p.figSolution || '',
      ],
    },
    ...buildClassificationStmts(p.id, p),
  ];
};

// Cập nhật 1 bài + phân loại đi kèm.
export const buildUpdateProblem = (p) => {
  const optionsStr = JSON.stringify(p.options || []);
  return [
    {
      sql: `UPDATE problems SET statement = $1, solution = $2, topic = $3, level = $4, tags = $5, type = $6, shortAnswer = $7, options = $8, figStatement = $9, figSolution = $10 WHERE id = $11`,
      params: [
        p.statement, p.solution || '', p.topic, p.level, p.tags || '',
        p.type || 'Tự luận', p.shortAnswer || '', optionsStr,
        p.figStatement || '', p.figSolution || '', p.id,
      ],
    },
    ...buildClassificationStmts(p.id, p),
  ];
};

// Nhập hàng loạt (Bulk Insert theo chunk 50) + phân loại từng bài.
export const buildInsertImported = (list) => {
  if (!list || list.length === 0) return [];
  const stmts = [];
  const chunkSize = 50;
  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize);
    const chunkPlaceholders = chunk.map((_, index) => {
      const offset = index * 11;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
    }).join(', ');
    const sql = `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, type, shortAnswer, options, metadata) VALUES ${chunkPlaceholders}`;
    const params = [];
    for (const prob of chunk) {
      const optionsStr = JSON.stringify(prob.options || []);
      params.push(
        prob.id, prob.statement || '', prob.solution || '', prob.topic || 'Chưa phân loại',
        parseInt(prob.level) || 1, prob.tags || '', prob.dateAdded || new Date().toISOString(),
        prob.type || 'Tự luận', prob.shortAnswer || '', optionsStr, '{}',
      );
    }
    stmts.push({ sql, params });
  }
  for (const prob of list) stmts.push(...buildClassificationStmts(prob.id, prob));
  return stmts;
};

// Đổi tên tag toàn kho: chỉ sinh lệnh cho bài THỰC SỰ đổi chuỗi tags.
export const buildRenameTag = (problems, oldTag, newTag) => {
  const s = [];
  for (const p of (problems || [])) {
    const next = applyTagRename(p.tags || '', oldTag, newTag);
    if (next !== (p.tags || '')) s.push({ sql: 'UPDATE problems SET tags = $1 WHERE id = $2', params: [next, p.id] });
  }
  return s;
};

// Xoá tag toàn kho: chỉ sinh lệnh cho bài THỰC SỰ đổi chuỗi tags.
export const buildDeleteTag = (problems, tag) => {
  const s = [];
  for (const p of (problems || [])) {
    const next = applyTagDelete(p.tags || '', tag);
    if (next !== (p.tags || '')) s.push({ sql: 'UPDATE problems SET tags = $1 WHERE id = $2', params: [next, p.id] });
  }
  return s;
};

// Xóa hẳn 1 bài: xoá bản ghi + dọn 3 bảng nối phân loại.
export const buildPurge = (id) => [
  { sql: 'DELETE FROM problems WHERE id = $1', params: [id] },
  { sql: 'DELETE FROM problem_categories WHERE problem_id = $1', params: [id] },
  { sql: 'DELETE FROM problem_difficulties WHERE problem_id = $1', params: [id] },
  { sql: 'DELETE FROM problem_grades WHERE problem_id = $1', params: [id] },
];

// Dọn sạch thùng rác: dùng subquery nên KHÔNG cần SELECT trước → trọn trong transaction.
export const buildEmptyTrash = () => [
  { sql: 'DELETE FROM problem_categories WHERE problem_id IN (SELECT id FROM problems WHERE deletedAt IS NOT NULL)', params: [] },
  { sql: 'DELETE FROM problem_difficulties WHERE problem_id IN (SELECT id FROM problems WHERE deletedAt IS NOT NULL)', params: [] },
  { sql: 'DELETE FROM problem_grades WHERE problem_id IN (SELECT id FROM problems WHERE deletedAt IS NOT NULL)', params: [] },
  { sql: 'DELETE FROM problems WHERE deletedAt IS NOT NULL', params: [] },
];
