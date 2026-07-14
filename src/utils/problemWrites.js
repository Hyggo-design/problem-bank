// Tầng ghi CSDL thuần: mỗi hàm nhận `db` đã mở, chạy lệnh và NÉM LỖI khi hỏng
// (không nuốt lỗi). Nhờ tách khỏi React hook, tầng này kiểm được bằng "db giả".
// SQL bê nguyên từ useProblems.js — chỉ đổi chỗ, không đổi câu lệnh/thứ tự tham số.

// Lưu phân loại của một bài vào 3 bảng nối theo kiểu XÓA-RỒI-GHI (dùng được cả khi
// thêm mới lẫn khi sửa: luôn dọn sạch rồi ghi lại đúng trạng thái hiện tại).
// cls = { categoryIds: string[], difficultyByHe: {heId: diffId}, gradeIds: string[] }
export const saveClassification = async (db, problemId, cls = {}) => {
  await db.execute('DELETE FROM problem_categories WHERE problem_id = $1', [problemId]);
  await db.execute('DELETE FROM problem_difficulties WHERE problem_id = $1', [problemId]);
  await db.execute('DELETE FROM problem_grades WHERE problem_id = $1', [problemId]);

  for (const cid of (cls.categoryIds || [])) {
    await db.execute('INSERT INTO problem_categories (problem_id, category_id) VALUES ($1, $2)', [problemId, cid]);
  }
  for (const [heId, diffId] of Object.entries(cls.difficultyByHe || {})) {
    if (diffId) await db.execute('INSERT INTO problem_difficulties (problem_id, he_id, difficulty_id) VALUES ($1, $2, $3)', [problemId, heId, diffId]);
  }
  for (const gid of (cls.gradeIds || [])) {
    await db.execute('INSERT INTO problem_grades (problem_id, grade_id) VALUES ($1, $2)', [problemId, gid]);
  }
};

// Thêm/ghi đè 1 bài (INSERT OR REPLACE) + phân loại đi kèm.
export const insertProblem = async (db, p) => {
  const optionsStr = JSON.stringify(p.options || []);
  await db.execute(
    `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, type, shortAnswer, options, metadata, figStatement, figSolution)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      p.id,
      p.statement || '',
      p.solution || '',
      p.topic || 'Chưa phân loại',
      parseInt(p.level) || 1,
      p.tags || '',
      p.dateAdded || new Date().toISOString(),
      p.type || 'Tự luận',
      p.shortAnswer || '',
      optionsStr,
      "{}", // Cột metadata dự phòng
      p.figStatement || '',
      p.figSolution || ''
    ]
  );
  await saveClassification(db, p.id, p);
};

// Cập nhật 1 bài + phân loại đi kèm.
export const updateProblemRow = async (db, p) => {
  const optionsStr = JSON.stringify(p.options || []);
  await db.execute(
    `UPDATE problems SET statement = $1, solution = $2, topic = $3, level = $4, tags = $5, type = $6, shortAnswer = $7, options = $8, figStatement = $9, figSolution = $10 WHERE id = $11`,
    [
      p.statement, p.solution || '', p.topic,
      p.level, p.tags || '', p.type || 'Tự luận',
      p.shortAnswer || '', optionsStr,
      p.figStatement || '', p.figSolution || '',
      p.id
    ]
  );
  await saveClassification(db, p.id, p);
};

// Chỉ đụng cột tags của MỘT bài (đổi tên/xoá tag hàng loạt — KHÔNG chạm phân loại).
export const updateProblemTags = async (db, id, tagsStr) => {
  await db.execute(`UPDATE problems SET tags = $1 WHERE id = $2`, [tagsStr, id]);
};

// Nhập hàng loạt (Bulk Insert theo chunk 50) + phân loại từng bài.
export const insertImportedProblems = async (db, list) => {
  if (!list || list.length === 0) return;

  // SQLite giới hạn số tham số, nên cắt nhỏ mỗi 50 bài 1 lần (chunk).
  const chunkSize = 50;
  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize);

    const chunkPlaceholders = chunk.map((_, index) => {
      const offset = index * 11;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
    }).join(', ');

    const query = `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, type, shortAnswer, options, metadata) VALUES ${chunkPlaceholders}`;

    const bindValues = [];
    for (const prob of chunk) {
      const optionsStr = JSON.stringify(prob.options || []);
      bindValues.push(
        prob.id, prob.statement || '', prob.solution || '', prob.topic || 'Chưa phân loại',
        parseInt(prob.level) || 1, prob.tags || '', prob.dateAdded || new Date().toISOString(),
        prob.type || 'Tự luận', prob.shortAnswer || '', optionsStr, "{}"
      );
    }

    await db.execute(query, bindValues);
  }

  // Lưu phân loại cho TỪNG bài sau khi đã chèn xong các bài.
  for (const prob of list) {
    await saveClassification(db, prob.id, prob);
  }
};

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

// Xóa hẳn 1 bài: xoá bản ghi + dọn 3 bảng nối phân loại.
export const purgeProblemRow = async (db, id) => {
  await db.execute('DELETE FROM problems WHERE id = $1', [id]);
  await db.execute('DELETE FROM problem_categories WHERE problem_id = $1', [id]);
  await db.execute('DELETE FROM problem_difficulties WHERE problem_id = $1', [id]);
  await db.execute('DELETE FROM problem_grades WHERE problem_id = $1', [id]);
};

// Dọn sạch thùng rác: xoá hẳn mọi bài đã đánh dấu xoá + dọn bảng nối của chúng.
export const emptyTrashRows = async (db) => {
  const rows = await db.select('SELECT id FROM problems WHERE deletedAt IS NOT NULL');
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return;
  const ph = ids.map((_, i) => `$${i + 1}`).join(', ');
  await db.execute(`DELETE FROM problem_categories WHERE problem_id IN (${ph})`, ids);
  await db.execute(`DELETE FROM problem_difficulties WHERE problem_id IN (${ph})`, ids);
  await db.execute(`DELETE FROM problem_grades WHERE problem_id IN (${ph})`, ids);
  await db.execute('DELETE FROM problems WHERE deletedAt IS NOT NULL');
};
