import { useState, useEffect, useCallback } from 'react';
import { getDb, runTx } from '../utils/db';
import { findDuplicates } from '../utils/findDuplicates';
import {
  buildInsertProblem, buildUpdateProblem, buildInsertImported,
  buildRenameTag, buildDeleteTag, buildPurge, buildEmptyTrash,
  softDeleteProblem, softDeleteMany, restoreProblemRow,
} from '../utils/problemWrites';

// Hàm bọc thép chống crash khi parse JSON
const safeJSONParse = (str) => {
  if (!str) return [];
  try { return JSON.parse(str); }
  catch (e) {
    console.warn("Dữ liệu JSON bị lỗi, tự động reset về mảng rỗng:", e);
    return [];
  }
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

  // Mọi hàm ghi dưới đây trả về TRUE nếu CSDL ghi xong, FALSE nếu hỏng (không nuốt lỗi âm thầm).
  // State trên màn CHỈ đổi SAU KHI ghi xong -> màn hình không bao giờ hiện "bài ma" chưa nằm trong CSDL.

  // 2. THÊM BÀI MỚI
  const addProblem = async (newProblem) => {
    try {
      // Validate cơ bản chống dữ liệu rác
      if (!newProblem || !newProblem.id) throw new Error("Bài tập thiếu ID");
      await runTx(buildInsertProblem(newProblem));
      setProblems(prev => [newProblem, ...prev.filter(p => p.id !== newProblem.id)]);
      return true;
    } catch (error) {
      console.error("Lỗi thêm bài:", error);
      return false;
    }
  };

  // 3. CẬP NHẬT BÀI
  const updateProblem = async (updatedProblem) => {
    try {
      await runTx(buildUpdateProblem(updatedProblem));
      setProblems(prev => prev.map(p => p.id === updatedProblem.id ? updatedProblem : p));
      return true;
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      return false;
    }
  };

  // 4. XÓA MỀM 1 BÀI -> chuyển vào Thùng rác (nạp lại để 2 danh sách khớp DB)
  const deleteProblem = async (id) => {
    try {
      const db = await getDb();
      await softDeleteProblem(db, id);
      await loadProblems();
      return true;
    } catch (error) {
      console.error("Lỗi xoá mềm:", error);
      return false;
    }
  };

  // 5. XÓA MỀM HÀNG LOẠT
  const bulkDeleteProblems = async (idsToDelete) => {
    if (!idsToDelete || idsToDelete.length === 0) return true;
    try {
      const db = await getDb();
      await softDeleteMany(db, idsToDelete);
      await loadProblems();
      return true;
    } catch (error) {
      console.error("Lỗi xoá mềm hàng loạt:", error);
      return false;
    }
  };

  // 5b. KHÔI PHỤC: bỏ dấu xoá -> bài về lại feed nguyên phân loại
  const restoreProblem = async (id) => {
    try {
      const db = await getDb();
      await restoreProblemRow(db, id);
      await loadProblems();
      return true;
    } catch (error) {
      console.error("Lỗi khôi phục:", error);
      return false;
    }
  };

  // 5c. XÓA HẲN 1 BÀI: xoá bản ghi + dọn 3 bảng nối phân loại
  const purgeProblem = async (id) => {
    try {
      await runTx(buildPurge(id));
      await loadProblems();
      return true;
    } catch (error) {
      console.error("Lỗi xoá hẳn:", error);
      return false;
    }
  };

  // 5d. XÓA SẠCH THÙNG RÁC: xoá hẳn mọi bài đã đánh dấu xoá + dọn bảng nối của chúng
  const emptyTrash = async () => {
    try {
      await runTx(buildEmptyTrash());
      await loadProblems();
      return true;
    } catch (error) {
      console.error("Lỗi dọn thùng rác:", error);
      return false;
    }
  };

  // 6. LƯU IMPORT HÀNG LOẠT
  const saveImportedProblems = async (newProblems) => {
    if (!newProblems || newProblems.length === 0) return true;
    try {
      await runTx(buildInsertImported(newProblems));
      // Gom lại update State 1 lần duy nhất để không giật màn hình
      setProblems(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const trulyNew = newProblems.filter(p => !existingIds.has(p.id));
        return [...trulyNew, ...prev];
      });
      return true;
    } catch (error) {
      console.error("Lỗi Import:", error);
      return false;
    }
  };

  // 6b. ĐỔI TÊN / GỘP / XOÁ TAG TOÀN KHO — ghi hàng loạt, TRẢ true/false (Đợt A #1: báo lỗi thật).
  // Chỉ ghi những bài THỰC SỰ đổi chuỗi tags; xong nạp lại để state khớp CSDL.
  const renameTag = async (oldTag, newTag) => {
    try {
      await runTx(buildRenameTag(problems, oldTag, newTag));
      await loadProblems();
      return true;
    } catch (error) { console.error("Lỗi đổi tên tag:", error); return false; }
  };

  const deleteTag = async (tag) => {
    try {
      await runTx(buildDeleteTag(problems, tag));
      await loadProblems();
      return true;
    } catch (error) { console.error("Lỗi xoá tag:", error); return false; }
  };

  // 7. KIỂM TRA TRÙNG LẶP (Duplicate Detection)
  // Trả MẢNG bài trùng (đề HOẶC lời giải vượt ngưỡng), xếp % giảm dần. Rỗng nếu không trùng.
  const checkDuplicate = useCallback((newStatement, newSolution, currentId = null) => {
    if (!newStatement && !newSolution) return [];

    // Nếu đang chỉnh sửa và đề bài mới giống hệt đề bài cũ trong DB, tự động bỏ qua check trùng
    if (currentId) {
      const originalProblem = problems.find(p => p.id === currentId);
      if (originalProblem && (originalProblem.statement || '').trim() === (newStatement || '').trim()) {
        return [];
      }
    }

    // Đọc ngưỡng Thầy đặt trong Cài đặt (mặc định 85%).
    const pct = parseInt(localStorage.getItem('pb-dup-threshold') ?? '85', 10);
    const threshold = (Number.isNaN(pct) ? 85 : pct) / 100;

    return findDuplicates(problems, newStatement, newSolution, threshold, currentId);
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
    renameTag,
    deleteTag,
    checkDuplicate
  };
};
