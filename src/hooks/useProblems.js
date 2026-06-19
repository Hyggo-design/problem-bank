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

  // 1. TẢI DỮ LIỆU
  const loadProblems = useCallback(async () => {
    try {
      const db = await getDb();
      const result = await db.select('SELECT * FROM problems ORDER BY dateAdded DESC');
      
      const parsedProblems = result.map(p => ({
        ...p,
        options: safeJSONParse(p.options) // Dùng hàm an toàn
      }));

      setProblems(parsedProblems);
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
        `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, timesUsed, type, shortAnswer, options, metadata) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
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
          "{}" // Cột metadata dự phòng
        ]
      );
      
      setProblems(prev => [newProblem, ...prev.filter(p => p.id !== newProblem.id)]);
    } catch (error) { console.error("Lỗi thêm bài:", error); }
  };

  // 3. CẬP NHẬT BÀI
  const updateProblem = async (updatedProblem) => {
    try {
      const db = await getDb();
      const optionsStr = JSON.stringify(updatedProblem.options || []);

      await db.execute(
        `UPDATE problems SET statement = $1, solution = $2, topic = $3, level = $4, tags = $5, type = $6, shortAnswer = $7, options = $8 WHERE id = $9`,
        [
          updatedProblem.statement, updatedProblem.solution || '', updatedProblem.topic, 
          updatedProblem.level, updatedProblem.tags || '', updatedProblem.type || 'Tự luận', 
          updatedProblem.shortAnswer || '', optionsStr, updatedProblem.id
        ]
      );
      
      setProblems(prev => prev.map(p => p.id === updatedProblem.id ? updatedProblem : p));
    } catch (error) { console.error("Lỗi cập nhật:", error); }
  };

  // 4. XÓA 1 BÀI
  const deleteProblem = async (id) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM problems WHERE id = $1', [id]);
      setProblems(prev => prev.filter(p => p.id !== id));
    } catch (error) { console.error("Lỗi xóa:", error); }
  };

  // 5. XÓA HÀNG LOẠT (Tối ưu hiệu năng: Không dùng vòng lặp)
  const bulkDeleteProblems = async (idsToDelete) => {
    if (!idsToDelete || idsToDelete.length === 0) return;
    try {
      const db = await getDb();
      // Tạo chuỗi dấu hỏi tương ứng với số lượng ID (VD: ?, ?, ?)
      const placeholders = idsToDelete.map((_, i) => `$${i + 1}`).join(', ');
      
      // Xóa 1000 bài chỉ bằng 1 câu lệnh SQL duy nhất
      await db.execute(`DELETE FROM problems WHERE id IN (${placeholders})`, idsToDelete);
      
      setProblems(prev => prev.filter(p => !idsToDelete.includes(p.id)));
    } catch (error) { console.error("Lỗi xóa hàng loạt:", error); }
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
    addProblem, 
    updateProblem, 
    deleteProblem, 
    bulkDeleteProblems, 
    saveImportedProblems,
    checkDuplicate 
  };
};