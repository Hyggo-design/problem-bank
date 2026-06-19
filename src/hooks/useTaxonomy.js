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

  return { categories, difficulties, grades, reload: loadAll };
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
