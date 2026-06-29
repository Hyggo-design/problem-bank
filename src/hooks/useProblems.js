import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../utils/db';

// Hàm bọc thép chống crash khi parse JSON
const safeJSONParse = (str) => {
  if (!str) return [];
  try { return JSON.parse(str); }
  catch (e) {
    console.warn("Dữ liệu JSON bị lỗi, tự động reset về mảng rỗng:", e);
    return [];
  }
};

// Lưu phân loại của một bài vào 3 bảng nối theo kiểu XÓA-RỒI-GHI (dùng được cả khi
// thêm mới lẫn khi sửa: luôn dọn sạch rồi ghi lại đúng trạng thái hiện tại).
// cls = { categoryIds: string[], difficultyByHe: {heId: diffId}, gradeIds: string[] }
const saveClassification = async (db, problemId, cls = {}) => {
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

// Tính độ tương đồng Sorensen-Dice dựa trên character bigrams (tần suất cặp ký tự)
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0.0;

  // Chuẩn hóa văn bản: Chuyển thường, loại bỏ khoảng trắng và xuống dòng
  const clean1 = str1.toLowerCase().replace(/\s+/g, '');
  const clean2 = str2.toLowerCase().replace(/\s+/g, '');

  if (clean1 === clean2) return 1.0;
  if (clean1.length < 2 || clean2.length < 2) return 0.0;

  // Trích xuất tập hợp bigrams của chuỗi 1
  const bigrams1 = new Set();
  for (let i = 0; i < clean1.length - 1; i++) {
    bigrams1.add(clean1.substring(i, i + 2));
  }

  // Trích xuất tập hợp bigrams của chuỗi 2
  const bigrams2 = new Set();
  for (let i = 0; i < clean2.length - 1; i++) {
    bigrams2.add(clean2.substring(i, i + 2));
  }

  // Đếm số lượng cặp bigrams trùng nhau
  let intersection = 0;
  for (const val of bigrams1) {
    if (bigrams2.has(val)) {
      intersection++;
    }
  }

  // Sorensen-Dice: 2 * |A ∩ B| / (|A| + |B|)
  return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
};

export const useProblems = () => {
  const [problems, setProblems] = useState([]);
  const [trashedProblems, setTrashedProblems] = useState([]);

  // 1. TẢI DỮ LIỆU
  const loadProblems = useCallback(async () => {
    try {
      const db = await getDb();
      const result = await db.select('SELECT * FROM problems ORDER BY dateAdded DESC');

      // Task 14: tải 3 bảng nối phân loại rồi gộp theo problem_id để gắn vào từng bài.
      const pc = await db.select('SELECT * FROM problem_categories');
      const pd = await db.select('SELECT * FROM problem_difficulties');
      const pg = await db.select('SELECT * FROM problem_grades');

      const catsByProblem = {};   // problem_id -> [category_id]
      for (const row of pc) {
        (catsByProblem[row.problem_id] = catsByProblem[row.problem_id] || []).push(row.category_id);
      }
      const diffByProblem = {};   // problem_id -> { he_id: difficulty_id }
      for (const row of pd) {
        if (!diffByProblem[row.problem_id]) diffByProblem[row.problem_id] = {};
        diffByProblem[row.problem_id][row.he_id] = row.difficulty_id;
      }
      const gradesByProblem = {}; // problem_id -> [grade_id]
      for (const row of pg) {
        (gradesByProblem[row.problem_id] = gradesByProblem[row.problem_id] || []).push(row.grade_id);
      }

      const parsedProblems = result.map(p => ({
        ...p,
        options: safeJSONParse(p.options), // Dùng hàm an toàn
        // Phân loại mới (Task 14) — mặc định rỗng nếu bài chưa gắn gì
        categoryIds: catsByProblem[p.id] || [],
        difficultyByHe: diffByProblem[p.id] || {},
        gradeIds: gradesByProblem[p.id] || []
      }));

      // Tách: deletedAt rỗng = đang dùng (feed); có giá trị = trong Thùng rác (sắp theo lúc xoá mới nhất).
      setProblems(parsedProblems.filter((p) => !p.deletedAt));
      setTrashedProblems(
        parsedProblems
          .filter((p) => p.deletedAt)
          .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
      );
    } catch (error) { console.error("Lỗi tải dữ liệu:", error); }
  }, []);

  useEffect(() => { loadProblems(); }, [loadProblems]);

  // 2. THÊM BÀI MỚI (Dùng INSERT OR REPLACE để chống trùng ID)
  const addProblem = async (newProblem) => {
    try {
      // Validate cơ bản chống dữ liệu rác
      if (!newProblem || !newProblem.id) throw new Error("Bài tập thiếu ID");

      const db = await getDb();
      const optionsStr = JSON.stringify(newProblem.options || []);
      
      await db.execute(
        `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, timesUsed, type, shortAnswer, options, metadata, figStatement, figSolution) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          newProblem.id, 
          newProblem.statement || '', 
          newProblem.solution || '', 
          newProblem.topic || 'Chưa phân loại', 
          parseInt(newProblem.level) || 1, 
          newProblem.tags || '', 
          newProblem.dateAdded || new Date().toISOString(), 
          newProblem.timesUsed || 0,
          newProblem.type || 'Tự luận', 
          newProblem.shortAnswer || '', 
          optionsStr,
          "{}", // Cột metadata dự phòng
          newProblem.figStatement || '',
          newProblem.figSolution || ''
        ]
      );

      // Lưu phân loại mới (cây + độ khó theo hệ + lớp) đi kèm trên object newProblem.
      await saveClassification(db, newProblem.id, newProblem);

      setProblems(prev => [newProblem, ...prev.filter(p => p.id !== newProblem.id)]);
    } catch (error) { console.error("Lỗi thêm bài:", error); }
  };

  // 3. CẬP NHẬT BÀI
  const updateProblem = async (updatedProblem) => {
    try {
      const db = await getDb();
      const optionsStr = JSON.stringify(updatedProblem.options || []);

      await db.execute(
        `UPDATE problems SET statement = $1, solution = $2, topic = $3, level = $4, tags = $5, type = $6, shortAnswer = $7, options = $8, figStatement = $9, figSolution = $10 WHERE id = $11`,
        [
          updatedProblem.statement, updatedProblem.solution || '', updatedProblem.topic,
          updatedProblem.level, updatedProblem.tags || '', updatedProblem.type || 'Tự luận',
          updatedProblem.shortAnswer || '', optionsStr,
          updatedProblem.figStatement || '', updatedProblem.figSolution || '',
          updatedProblem.id
        ]
      );

      // Task 14: lưu lại phân loại mới (cây + độ khó theo hệ + lớp) đi kèm trên object.
      await saveClassification(db, updatedProblem.id, updatedProblem);

      setProblems(prev => prev.map(p => p.id === updatedProblem.id ? updatedProblem : p));
    } catch (error) { console.error("Lỗi cập nhật:", error); }
  };

  // 4. XÓA MỀM 1 BÀI -> chuyển vào Thùng rác (đánh dấu deletedAt, nạp lại để 2 danh sách khớp DB)
  const deleteProblem = async (id) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE problems SET deletedAt = $1 WHERE id = $2', [new Date().toISOString(), id]);
      await loadProblems();
    } catch (error) { console.error("Lỗi xoá mềm:", error); }
  };

  // 5. XÓA MỀM HÀNG LOẠT -> chuyển nhiều bài vào Thùng rác bằng 1 câu lệnh
  const bulkDeleteProblems = async (idsToDelete) => {
    if (!idsToDelete || idsToDelete.length === 0) return;
    try {
      const db = await getDb();
      const now = new Date().toISOString();
      // $1 = thời điểm xoá; các id bắt đầu từ $2
      const placeholders = idsToDelete.map((_, i) => `$${i + 2}`).join(', ');
      await db.execute(`UPDATE problems SET deletedAt = $1 WHERE id IN (${placeholders})`, [now, ...idsToDelete]);
      await loadProblems();
    } catch (error) { console.error("Lỗi xoá mềm hàng loạt:", error); }
  };

  // 5b. KHÔI PHỤC: bỏ dấu xoá -> bài về lại feed nguyên phân loại
  const restoreProblem = async (id) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE problems SET deletedAt = NULL WHERE id = $1', [id]);
      await loadProblems();
    } catch (error) { console.error("Lỗi khôi phục:", error); }
  };

  // 5c. XÓA HẲN 1 BÀI: xoá bản ghi + dọn 3 bảng nối phân loại (vá luôn rác mồ côi)
  const purgeProblem = async (id) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM problems WHERE id = $1', [id]);
      await db.execute('DELETE FROM problem_categories WHERE problem_id = $1', [id]);
      await db.execute('DELETE FROM problem_difficulties WHERE problem_id = $1', [id]);
      await db.execute('DELETE FROM problem_grades WHERE problem_id = $1', [id]);
      await loadProblems();
    } catch (error) { console.error("Lỗi xoá hẳn:", error); }
  };

  // 5d. XÓA SẠCH THÙNG RÁC: xoá hẳn mọi bài đã đánh dấu xoá + dọn bảng nối của chúng
  const emptyTrash = async () => {
    try {
      const db = await getDb();
      const rows = await db.select('SELECT id FROM problems WHERE deletedAt IS NOT NULL');
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return;
      const ph = ids.map((_, i) => `$${i + 1}`).join(', ');
      await db.execute(`DELETE FROM problem_categories WHERE problem_id IN (${ph})`, ids);
      await db.execute(`DELETE FROM problem_difficulties WHERE problem_id IN (${ph})`, ids);
      await db.execute(`DELETE FROM problem_grades WHERE problem_id IN (${ph})`, ids);
      await db.execute('DELETE FROM problems WHERE deletedAt IS NOT NULL');
      await loadProblems();
    } catch (error) { console.error("Lỗi dọn thùng rác:", error); }
  };

  // 6. LƯU IMPORT HÀNG LOẠT (Tối ưu bằng Transaction/Batch)
  const saveImportedProblems = async (newProblems) => {
    if (!newProblems || newProblems.length === 0) return;
    try {
      const db = await getDb();
      
      // Xây dựng Bulk Insert (Chèn nhiều dòng trong 1 lệnh duy nhất)
      // SQLite giới hạn số tham số (parameters), nên ta cắt nhỏ ra mỗi 50 bài 1 lần (chunk)
      const chunkSize = 50;
      
      for (let i = 0; i < newProblems.length; i += chunkSize) {
        const chunk = newProblems.slice(i, i + chunkSize);
        
        // Tạo chuỗi ($1, $2...), ($13, $14...) tương ứng với số bài
        const chunkPlaceholders = chunk.map((_, index) => {
          const offset = index * 12;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`;
        }).join(', ');
        
        const query = `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, timesUsed, type, shortAnswer, options, metadata) VALUES ${chunkPlaceholders}`;
        
        // Gom toàn bộ data của 50 bài vào 1 mảng dẹt (flat array)
        const bindValues = [];
        for (const prob of chunk) {
          const optionsStr = JSON.stringify(prob.options || []);
          bindValues.push(
            prob.id, prob.statement || '', prob.solution || '', prob.topic || 'Chưa phân loại', 
            parseInt(prob.level) || 1, prob.tags || '', prob.dateAdded || new Date().toISOString(), 
            prob.timesUsed || 0, prob.type || 'Tự luận', prob.shortAnswer || '', optionsStr, "{}"
          );
        }
        
        await db.execute(query, bindValues);
      }

      // Task 17: lưu phân loại (cây + độ khó theo hệ + lớp) cho TỪNG bài import,
      // sau khi đã chèn xong các bài. Phân loại đi kèm trên mỗi object newProblem.
      for (const prob of newProblems) {
        await saveClassification(db, prob.id, prob);
      }

      // Gom lại update State 1 lần duy nhất để không giật màn hình
      setProblems(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const trulyNew = newProblems.filter(p => !existingIds.has(p.id));
        return [...trulyNew, ...prev];
      });
    } catch (error) {
      console.error("Lỗi Import:", error);
    }
  };

  // 7. KIỂM TRA TRÙNG LẶP (Duplicate Detection)
  const checkDuplicate = useCallback((newStatement, currentId = null, threshold = 0.85) => {
    if (!newStatement) return null;

    // Nếu đang chỉnh sửa và đề bài mới giống hệt đề bài cũ trong DB, tự động bỏ qua check trùng
    if (currentId) {
      const originalProblem = problems.find(p => p.id === currentId);
      if (originalProblem && originalProblem.statement.trim() === newStatement.trim()) {
        return null;
      }
    }

    let maxSimilarity = 0;
    let closestProblem = null;

    for (const prob of problems) {
      // Bỏ qua chính nó khi sửa bài tập
      if (currentId && prob.id === currentId) continue;

      const score = calculateSimilarity(newStatement, prob.statement);
      if (score > maxSimilarity) {
        maxSimilarity = score;
        closestProblem = prob;
      }
    }

    if (maxSimilarity >= threshold) {
      return {
        problem: closestProblem,
        similarity: maxSimilarity
      };
    }
    return null;
  }, [problems]);

  return {
    problems,
    trashedProblems,
    trashCount: trashedProblems.length,
    addProblem,
    updateProblem,
    deleteProblem,
    bulkDeleteProblems,
    restoreProblem,
    purgeProblem,
    emptyTrash,
    saveImportedProblems,
    checkDuplicate
  };
};