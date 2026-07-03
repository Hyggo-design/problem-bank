// Tìm lần xuất GẦN NHẤT còn trong hạn N ngày (mặc định 30) cho mỗi bài — nguồn "đã dùng
// gần đây" THẬT, tính từ export_history. KHÔNG dùng cột problems.timesUsed: cột đó không
// được cập nhật ở bất kỳ đâu trong code, luôn = 0. Hàm THUẦN (nhận `now` qua tham số thay vì
// gọi new Date() ngầm bên trong) để test được tất định.
//
// Trả về { [problemId]: { fileName, exportDate } } — chỉ chứa bài có ít nhất 1 lần xuất còn
// trong hạn; bài xuất lâu hơn hạn hoặc chưa từng xuất thì KHÔNG có trong map (badge tự ẩn).
// Nhiều lần xuất trong hạn cùng 1 bài -> chỉ giữ lần GẦN NHẤT (fileName = template_name của
// export_history, ExportModal.jsx đã đổi sang lưu đúng tên file Thầy Save As).
export const getRecentUsageByProblemId = (historyItems, now = new Date(), withinDays = 30) => {
  const cutoff = new Date(now).getTime() - withinDays * 24 * 60 * 60 * 1000;
  const result = {};
  for (const item of historyItems || []) {
    const exportTime = new Date(item.export_date).getTime();
    if (Number.isNaN(exportTime) || exportTime < cutoff) continue;
    for (const id of item.problem_ids || []) {
      const existing = result[id];
      if (!existing || exportTime > existing.exportTime) {
        result[id] = { fileName: item.template_name, exportDate: item.export_date, exportTime };
      }
    }
  }
  return result;
};
