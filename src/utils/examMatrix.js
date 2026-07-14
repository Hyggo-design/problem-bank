// ĐỘNG CƠ CHỌN BÀI THEO MA TRẬN — hàm THUẦN (không import DB/React) để test được.
// Khớp ứng viên cho một ô (chủ đề × mức độ) trong 1 hệ + lọc lớp tuỳ chọn; ưu tiên câu
// "lâu chưa dùng" (không nằm trong recentUsageIds) trước câu vừa dùng; không lặp câu
// giữa các ô của cùng một lần tạo. Tự nội tuyến việc leo cây con (KHÔNG import từ
// useTaxonomy để tránh kéo theo @tauri-apps/plugin-sql vào môi trường test).

// Lấy chính nhánh + mọi nhánh con bên dưới. childrenMap: { [parentId]: [childId, ...] }
const collectDescendantIds = (rootId, childrenMap) => {
  const out = [rootId];
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop();
    for (const c of (childrenMap[cur] || [])) { out.push(c); stack.push(c); }
  }
  return out;
};

// Trộn mảng bằng Fisher–Yates, dùng rng tiêm vào (mặc định Math.random) để test tất định.
const shuffle = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Các bài khớp một ô (chủ đề = categoryId gồm cả nhánh con, LOẠI CÂU = type, mức độ = difficultyId
// trong hệ heId), đúng lớp nếu có gradeId, và chưa bị dùng ở ô khác (excludeIds).
const candidatesForCell = (problems, childrenMap, heId, gradeId, categoryId, type, difficultyId, excludeIds) => {
  const inBranch = new Set(collectDescendantIds(categoryId, childrenMap));
  return (problems || []).filter((p) =>
    !excludeIds.has(p.id) &&
    p.type === type &&
    (p.difficultyByHe || {})[heId] === difficultyId &&
    (p.categoryIds || []).some((cid) => inBranch.has(cid)) &&
    (!gradeId || (p.gradeIds || []).includes(gradeId))
  );
};

// Xếp câu chưa-dùng lên trước, mỗi nhóm trộn ngẫu nhiên, rồi lấy `count` câu đầu.
const rankAndPick = (candidates, count, recentUsageIds, rng) => {
  const fresh = candidates.filter((p) => !recentUsageIds.has(p.id));
  const recent = candidates.filter((p) => recentUsageIds.has(p.id));
  const ordered = [...shuffle(fresh, rng), ...shuffle(recent, rng)];
  return ordered.slice(0, count);
};

// Bốc cả ma trận.
//   rows: [{ rowId, categoryId, counts: { [type]: { [difficultyId]: number } } }]
//   types: mảng loại câu ĐANG bật (đúng thứ tự cột). usedIds chung cả lần bốc -> không lặp câu
//          toàn đề, kể cả khi 1 bài nằm ở nhiều nhánh (bốc đủ bằng bài khác, chỉ thiếu khi cạn bài).
export const generateExamMatrix = ({ problems, childrenMap, heId, gradeId, rows, types, recentUsageIds, rng = Math.random }) => {
  const usedIds = new Set();
  const cells = [];
  for (const row of (rows || [])) {
    for (const type of (types || [])) {
      const byDiff = (row.counts && row.counts[type]) || {};
      for (const [difficultyId, rawCount] of Object.entries(byDiff)) {
        const n = parseInt(rawCount, 10) || 0;
        if (n <= 0) continue;
        const cands = candidatesForCell(problems, childrenMap, heId, gradeId, row.categoryId, type, difficultyId, usedIds);
        const picked = rankAndPick(cands, n, recentUsageIds, rng);
        picked.forEach((p) => usedIds.add(p.id));
        cells.push({ rowId: row.rowId, categoryId: row.categoryId, type, difficultyId, requested: n, picked, shortfall: n - picked.length });
      }
    }
  }
  const pickedProblems = [];
  const seen = new Set();
  for (const c of cells) for (const p of c.picked) if (!seen.has(p.id)) { seen.add(p.id); pickedProblems.push(p); }
  const totalRequested = cells.reduce((s, c) => s + c.requested, 0);
  return { cells, pickedProblems, totalRequested, totalPicked: pickedProblems.length };
};

// Đếm "còn X khả dụng" cho nhãn dưới ô (độc lập từng ô — chưa trừ ô khác).
export const countAvailableForCell = ({ problems, childrenMap, heId, gradeId, categoryId, type, difficultyId }) =>
  candidatesForCell(problems, childrenMap, heId, gradeId, categoryId, type, difficultyId, new Set()).length;

// Đổi 1 câu khác trong một ô: loại mọi id đang hiển thị (excludeIds), trả 1 câu hoặc null nếu hết.
export const pickReplacementProblem = ({ problems, childrenMap, heId, gradeId, categoryId, type, difficultyId, excludeIds, recentUsageIds, rng = Math.random }) => {
  const cands = candidatesForCell(problems, childrenMap, heId, gradeId, categoryId, type, difficultyId, excludeIds);
  const picked = rankAndPick(cands, 1, recentUsageIds, rng);
  return picked[0] || null;
};
