// Quét trùng TOÀN KHO — tìm mọi cặp bài giống nhau (đề HOẶC lời giải >= ngưỡng),
// gom thành nhóm cụm-liên-thông. Hàm THUẦN, tách riêng để test.
// KHÔNG đụng đường xuất .tex. KHÔNG sửa findDuplicates.js (cảnh báo lúc thêm giữ nguyên).

// Chuẩn hoá giống calculateSimilarity: chữ thường + bỏ mọi khoảng trắng.
export const normalizeForSim = (str) => String(str ?? '').toLowerCase().replace(/\s+/g, '');

// Tập bigram ký tự (rỗng nếu < 2 ký tự).
export const bigramSet = (clean) => {
  const set = new Set();
  for (let i = 0; i < clean.length - 1; i++) set.add(clean.substring(i, i + 2));
  return set;
};

// Sørensen-Dice từ chuỗi-đã-chuẩn-hoá + tập bigram dựng sẵn. Khớp calculateSimilarity từng nhánh.
export const diceOfSets = (cleanA, setA, cleanB, setB) => {
  if (!cleanA || !cleanB) return 0;                 // một chuỗi rỗng
  if (cleanA === cleanB) return 1;                  // y hệt
  if (cleanA.length < 2 || cleanB.length < 2) return 0;
  let inter = 0;
  for (const g of setA) if (setB.has(g)) inter++;
  return (2 * inter) / (setA.size + setB.size);
};

// Union-Find nhỏ để gom cụm liên thông.
const makeUF = (n) => {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
  return { find, union };
};

// Quét cả kho. problems = mảng bài SỐNG. threshold = 0..1.
// Trả: [{ members:[bài…], pairs:[{aId,bId,stmtSim,solSim}], maxStmtSim, maxSolSim }] xếp sim giảm dần.
export const scanDuplicates = (problems = [], threshold = 0.85) => {
  const n = problems.length;
  // 1) tiền xử lý 1 lần/bài (chuẩn hoá + bigram cho đề và lời giải)
  const pre = problems.map((p) => {
    const stmtClean = normalizeForSim(p.statement);
    const solClean = normalizeForSim(p.solution);
    return { stmtClean, stmtBg: bigramSet(stmtClean), solClean, solBg: bigramSet(solClean) };
  });
  // 2) so mọi cặp i<j; cạnh nếu đề HOẶC lời giải >= ngưỡng
  const uf = makeUF(n);
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const stmtSim = diceOfSets(pre[i].stmtClean, pre[i].stmtBg, pre[j].stmtClean, pre[j].stmtBg);
      const solSim = diceOfSets(pre[i].solClean, pre[i].solBg, pre[j].solClean, pre[j].solBg);
      if (stmtSim >= threshold || solSim >= threshold) {
        edges.push({ i, j, stmtSim, solSim });
        uf.union(i, j);
      }
    }
  }
  // 3) gom cạnh theo gốc union-find
  const byRoot = new Map();
  for (const e of edges) {
    const root = uf.find(e.i);
    if (!byRoot.has(root)) byRoot.set(root, { idx: new Set(), pairs: [] });
    const grp = byRoot.get(root);
    grp.idx.add(e.i); grp.idx.add(e.j);
    grp.pairs.push({ aId: problems[e.i].id, bId: problems[e.j].id, stmtSim: e.stmtSim, solSim: e.solSim });
  }
  // 4) dựng nhóm: members xếp theo dateAdded tăng dần (bài cũ trước)
  const groups = [];
  for (const grp of byRoot.values()) {
    const members = [...grp.idx]
      .map((k) => problems[k])
      .sort((a, b) => String(a.dateAdded || '').localeCompare(String(b.dateAdded || '')));
    const maxStmtSim = Math.max(...grp.pairs.map((p) => p.stmtSim));
    const maxSolSim = Math.max(...grp.pairs.map((p) => p.solSim));
    groups.push({ members, pairs: grp.pairs, maxStmtSim, maxSolSim });
  }
  // 5) xếp nhóm theo độ giống cao nhất, giảm dần
  groups.sort((a, b) => Math.max(b.maxStmtSim, b.maxSolSim) - Math.max(a.maxStmtSim, a.maxSolSim));
  return groups;
};
