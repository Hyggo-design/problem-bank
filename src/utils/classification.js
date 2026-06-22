import { getRootHeId } from '../hooks/useTaxonomy';

// Nhóm phân loại của một bài theo HỆ, dựng trọn đường cây cho mỗi nhánh đã gắn.
// Trả về: [{ heId, paths: [[tênHệ, …, tênNhánhLá], ...], difficultyName }] — mỗi hệ một mục.
//   catById:   { [id]: { id, name, parent_id } }
//   parentMap: { [id]: parent_id }
//   diffById:  { [id]: { name } }
export const groupClassificationByHe = (problem, catById, parentMap, diffById) => {
  const buildPath = (catId) => {
    const names = [];
    let cur = catId;
    while (cur && catById[cur]) { names.unshift(catById[cur].name); cur = parentMap[cur]; }
    return names; // [Tên hệ, …, tên nhánh lá]
  };

  const byHe = {};
  for (const cid of (problem.categoryIds || [])) {
    if (!catById[cid]) continue;                 // bỏ id mồ côi (nhánh đã xoá)
    const heId = getRootHeId(cid, parentMap);
    (byHe[heId] = byHe[heId] || { heId, paths: [] }).paths.push(buildPath(cid));
  }

  return Object.values(byHe).map((g) => ({
    ...g,
    difficultyName: diffById[(problem.difficultyByHe || {})[g.heId]]?.name || '',
  }));
};
