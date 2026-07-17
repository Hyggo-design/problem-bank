// Nhóm phân loại của một bài theo HỆ, dựng trọn đường cây cho mỗi nhánh đã gắn.
// Trả về: [{ heId, paths: [[tênHệ, …, tênNhánhLá], ...], difficultyName }] — mỗi hệ một mục.
//   catById:   { [id]: { id, name, parent_id } }
//   parentMap: { [id]: parent_id }
//   diffById:  { [id]: { name } }
// Hàm THUẦN (không import DB/React) để test được — leo cây tự nội tuyến.

// Leo ngược parentMap tới nút gốc (hệ) của một nhánh.
const rootHeId = (catId, parentMap) => {
  let cur = catId;
  while (parentMap[cur]) cur = parentMap[cur];
  return cur;
};

// Bảng tra "nhánh -> hệ gốc" tính sẵn MỘT LẦN cho cả cây, để đường lọc (DataGrid)
// khỏi leo ngược parentMap cho từng bài mỗi lần lọc. Chỉ tính lại khi cây đổi.
//   parentMap: { [catId]: parent_id }  (mọi id nhánh làm khoá)
// Trả về: { [catId]: heIdGốc }. Hàm THUẦN — dùng lại `rootHeId` ở trên.
export const buildRootHeMap = (parentMap) => {
  const map = {};
  for (const id of Object.keys(parentMap)) map[id] = rootHeId(id, parentMap);
  return map;
};

export const groupClassificationByHe = (problem, catById, parentMap, diffById) => {
  const buildPath = (catId) => {
    const names = [];
    let cur = catId;
    while (cur && catById[cur]) { names.unshift(catById[cur].name); cur = parentMap[cur]; }
    return names; // [Tên hệ, …, tên nhánh lá]
  };

  // Chỉ giữ nhánh "sâu nhất": bỏ nhánh cha nếu có nhánh con của nó cũng được gắn
  // (nhánh cha đã hàm ý trong đường dẫn dài hơn → tránh hiện path tiền tố trùng).
  const ids = (problem.categoryIds || []).filter((cid) => catById[cid]); // bỏ id mồ côi (nhánh đã xoá)
  const hasSelectedDescendant = (cid) =>
    ids.some((other) => {
      if (other === cid) return false;
      let cur = parentMap[other];
      while (cur) { if (cur === cid) return true; cur = parentMap[cur]; }
      return false;
    });

  const byHe = {};
  for (const cid of ids) {
    if (hasSelectedDescendant(cid)) continue;    // bỏ tổ tiên đã có nhánh con được gắn
    const heId = rootHeId(cid, parentMap);
    (byHe[heId] = byHe[heId] || { heId, paths: [] }).paths.push(buildPath(cid));
  }

  return Object.values(byHe).map((g) => ({
    ...g,
    difficultyName: diffById[(problem.difficultyByHe || {})[g.heId]]?.name || '',
  }));
};
