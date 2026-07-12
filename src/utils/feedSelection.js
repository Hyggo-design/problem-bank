// Logic chọn thuần cho feed — tách khỏi React để test không cần GUI.

// Mảng id từ min(i,j)..max(i,j), bao gồm 2 đầu. i hoặc j < 0 -> [].
export const rangeIds = (orderedIds, i, j) => {
  if (i < 0 || j < 0) return [];
  const lo = Math.min(i, j);
  const hi = Math.max(i, j);
  return orderedIds.slice(lo, hi + 1);
};

// Gộp addIds vào selectedIds: không trùng, giữ thứ tự cũ rồi thêm mới.
export const unionSelection = (selectedIds, addIds) => {
  const seen = new Set(selectedIds);
  const result = [...selectedIds];
  for (const id of addIds) {
    if (!seen.has(id)) { seen.add(id); result.push(id); }
  }
  return result;
};

// Kẹp idx trong [0, len-1]. len <= 0 -> -1.
export const clampIndex = (idx, len) => {
  if (len <= 0) return -1;
  if (idx < 0) return 0;
  if (idx > len - 1) return len - 1;
  return idx;
};
