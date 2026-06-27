import { useState, useCallback } from 'react';
import { getDb } from '../utils/db';

export const useExportHistory = () => {
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Lấy danh sách lịch sử
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await getDb();
      const rows = await db.select('SELECT * FROM export_history ORDER BY export_date DESC');
      // Chuyển problem_ids từ chuỗi JSON sang mảng
      const formatted = rows.map(row => ({
        ...row,
        problem_ids: JSON.parse(row.problem_ids || '[]')
      }));
      setHistoryItems(formatted);
    } catch (e) {
      console.error('Lỗi khi lấy lịch sử xuất:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Lưu lịch sử xuất đề
  const saveHistory = useCallback(async (templateName, problemIds) => {
    try {
      const db = await getDb();
      const id = crypto.randomUUID();
      const exportDate = new Date().toISOString();
      await db.execute(
        'INSERT INTO export_history (id, export_date, template_name, problem_ids) VALUES ($1, $2, $3, $4)',
        [id, exportDate, templateName, JSON.stringify(problemIds)]
      );
      // Gọi load lại để cập nhật state nếu cần
      await loadHistory();
    } catch (e) {
      console.error('Lỗi khi lưu lịch sử xuất:', e);
    }
  }, [loadHistory]);

  return {
    historyItems,
    isLoading,
    loadHistory,
    saveHistory
  };
};
