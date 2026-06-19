import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../utils/db';

// =============================================================================
// useTaxonomy — "thư ký" đọc/ghi hệ thống phân loại (cây chuyên đề, độ khó, lớp)
// Dùng chung cho màn hình Quản lý phân loại và bộ điều khiển phân loại trong form.
// =============================================================================
export const useTaxonomy = () => {
  const [categories, setCategories] = useState([]);     // [{id, name, parent_id, position}]
  const [difficulties, setDifficulties] = useState([]); // [{id, he_id, name, position}]
  const [grades, setGrades] = useState([]);             // [{id, name, position}]

  // 1. TẢI TOÀN BỘ cây phân loại, thang độ khó và danh sách lớp
  const loadAll = useCallback(async () => {
    try {
      const db = await getDb();
      setCategories(await db.select('SELECT * FROM categories ORDER BY position'));
      setDifficulties(await db.select('SELECT * FROM difficulty_levels ORDER BY position'));
      setGrades(await db.select('SELECT * FROM grades ORDER BY position'));
    } catch (error) {
      console.error('Lỗi tải dữ liệu phân loại:', error);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // 2. THÊM NHÁNH (parentId = null -> thêm một hệ ở tầng gốc)
  // `parent_id IS $1` xử lý gọn cả 2 trường hợp: gốc (NULL) và nhánh con (uuid).
  const addCategory = async (name, parentId = null) => {
    try {
      const db = await getDb();
      const sib = await db.select('SELECT COUNT(*) AS n FROM categories WHERE parent_id IS $1', [parentId]);
      await db.execute(
        'INSERT INTO categories (id, name, parent_id, position, created_at) VALUES ($1, $2, $3, $4, $5)',
        [crypto.randomUUID(), name.trim(), parentId, sib[0].n, new Date().toISOString()]
      );
      await loadAll();
    } catch (error) {
      console.error('Lỗi thêm nhánh phân loại:', error);
    }
  };

  // 3. ĐỔI TÊN NHÁNH
  const renameCategory = async (id, name) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE categories SET name = $1 WHERE id = $2', [name.trim(), id]);
      await loadAll();
    } catch (error) {
      console.error('Lỗi đổi tên nhánh:', error);
    }
  };

  // 4. XÓA NHÁNH (xóa CẢ cây con bên dưới để không để lại nhánh mồ côi).
  // Chỉ gỡ nhãn khỏi problem_categories — KHÔNG đụng bảng problems (bài tập vẫn còn).
  const deleteCategory = async (id) => {
    try {
      const db = await getDb();
      const all = await db.select('SELECT id, parent_id FROM categories');
      const childrenMap = {};
      for (const c of all) {
        if (!childrenMap[c.parent_id]) childrenMap[c.parent_id] = [];
        childrenMap[c.parent_id].push(c.id);
      }
      const ids = getDescendantIds(id, childrenMap); // gồm chính nó + mọi con cháu
      for (const cid of ids) {
        await db.execute('DELETE FROM problem_categories WHERE category_id = $1', [cid]);
        await db.execute('DELETE FROM categories WHERE id = $1', [cid]);
      }
      await loadAll();
    } catch (error) {
      console.error('Lỗi xóa nhánh:', error);
    }
  };

  // 5. DI CHUYỂN NHÁNH sang cha mới (newParentId = null -> đưa lên tầng gốc)
  const moveCategory = async (id, newParentId) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE categories SET parent_id = $1 WHERE id = $2', [newParentId, id]);
      await loadAll();
    } catch (error) {
      console.error('Lỗi di chuyển nhánh:', error);
    }
  };

  // 6. ĐỘ KHÓ — theo từng hệ (mỗi hệ có thang riêng)
  const addDifficulty = async (heId, name) => {
    try {
      const db = await getDb();
      const sib = await db.select('SELECT COUNT(*) AS n FROM difficulty_levels WHERE he_id = $1', [heId]);
      await db.execute(
        'INSERT INTO difficulty_levels (id, he_id, name, position) VALUES ($1, $2, $3, $4)',
        [crypto.randomUUID(), heId, name.trim(), sib[0].n]
      );
      await loadAll();
    } catch (error) {
      console.error('Lỗi thêm mức độ khó:', error);
    }
  };

  const renameDifficulty = async (id, name) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE difficulty_levels SET name = $1 WHERE id = $2', [name.trim(), id]);
      await loadAll();
    } catch (error) {
      console.error('Lỗi đổi tên mức độ khó:', error);
    }
  };

  // Xóa mức độ khó: gỡ liên kết ở problem_difficulties rồi xóa mức đó
  const deleteDifficulty = async (id) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM problem_difficulties WHERE difficulty_id = $1', [id]);
      await db.execute('DELETE FROM difficulty_levels WHERE id = $1', [id]);
      await loadAll();
    } catch (error) {
      console.error('Lỗi xóa mức độ khó:', error);
    }
  };

  // 7. LỚP — danh sách phẳng dùng chung
  const addGrade = async (name) => {
    try {
      const db = await getDb();
      const n = await db.select('SELECT COUNT(*) AS n FROM grades');
      await db.execute('INSERT INTO grades (id, name, position) VALUES ($1, $2, $3)',
        [crypto.randomUUID(), name.trim(), n[0].n]);
      await loadAll();
    } catch (error) {
      console.error('Lỗi thêm lớp:', error);
    }
  };

  const deleteGrade = async (id) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM problem_grades WHERE grade_id = $1', [id]);
      await db.execute('DELETE FROM grades WHERE id = $1', [id]);
      await loadAll();
    } catch (error) {
      console.error('Lỗi xóa lớp:', error);
    }
  };

  return {
    categories, difficulties, grades, reload: loadAll,
    addCategory, renameCategory, deleteCategory, moveCategory,
    addDifficulty, renameDifficulty, deleteDifficulty,
    addGrade, deleteGrade,
  };
};

// --- Tiện ích dùng chung (đặt ngoài hook) ---------------------------------------

// Tìm hệ (nút gốc) của một nhánh bất kỳ bằng cách leo ngược theo parent_id.
// parentMap: { [catId]: parent_id }
export const getRootHeId = (catId, parentMap) => {
  let cur = catId;
  while (parentMap[cur]) cur = parentMap[cur];
  return cur;
};

// Lấy chính nhánh đó và TẤT CẢ nhánh con bên dưới (duyệt theo chiều sâu).
// childrenMap: { [parentId]: [childId, ...] }
export const getDescendantIds = (rootId, childrenMap) => {
  const out = [rootId];
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop();
    for (const c of (childrenMap[cur] || [])) {
      out.push(c);
      stack.push(c);
    }
  }
  return out;
};
