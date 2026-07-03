// Đếm số lần mỗi bài xuất hiện trong lịch sử xuất đề (export_history) — đây là nguồn
// "đã dùng" THẬT. KHÔNG dùng cột problems.timesUsed: cột đó không được cập nhật ở bất
// kỳ đâu trong code (kể cả lúc xuất đề), luôn = 0. Hàm THUẦN (không đụng DB/React) để test được.
export const countUsageByProblemId = (historyItems) => {
  const counts = {};
  for (const item of historyItems || []) {
    for (const id of item.problem_ids || []) {
      counts[id] = (counts[id] || 0) + 1;
    }
  }
  return counts;
};
