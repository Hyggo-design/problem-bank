// Tiện ích TAG — hàm THUẦN, tách riêng để viết test. KHÔNG đụng CSDL / đường xuất .tex.
import { normalizeVi } from './searchText';

// "a, , b ,a" -> ["a","b"]: trim, bỏ rỗng, khử trùng (danh tính = chuỗi đã trim).
export const parseTags = (str = '') => {
  const seen = new Set();
  const out = [];
  for (const raw of String(str || '').split(',')) {
    const t = raw.trim();
    if (t && !seen.has(t)) { seen.add(t); out.push(t); }
  }
  return out;
};

export const serializeTags = (arr = []) => arr.join(', ');

// Đếm số BÀI dùng mỗi tag -> [{tag,count}], sắp số bài giảm dần rồi A→Z không dấu.
export const buildTagIndex = (problems = []) => {
  const count = new Map();
  for (const p of problems) {
    for (const t of parseTags(p.tags)) count.set(t, (count.get(t) || 0) + 1);
  }
  return [...count.entries()]
    .map(([tag, c]) => ({ tag, count: c }))
    .sort((a, b) => b.count - a.count || normalizeVi(a.tag).localeCompare(normalizeVi(b.tag)));
};

// Gợi ý khi gõ: khớp không dấu/không hoa-thường; bỏ tag đã chọn; khớp-đầu-chuỗi trước.
export const suggestTags = (index = [], query = '', chosen = [], limit = 8) => {
  const q = normalizeVi(query).trim();
  const chosenSet = new Set(chosen);
  const pool = index.filter((it) => !chosenSet.has(it.tag));
  if (!q) return pool.slice(0, limit);
  const scored = [];
  for (const it of pool) {
    const pos = normalizeVi(it.tag).indexOf(q);
    if (pos >= 0) scored.push({ it, prefix: pos === 0 ? 0 : 1 });
  }
  scored.sort((a, b) => a.prefix - b.prefix || b.it.count - a.it.count);
  return scored.slice(0, limit).map((s) => s.it);
};

// Đổi tên/gộp trên MỘT bài: thay old->new (khớp chính xác), khử trùng (gộp), bỏ rỗng.
export const applyTagRename = (tagsStr = '', oldTag = '', newTag = '') => {
  const nt = String(newTag).trim();
  const renamed = parseTags(tagsStr).map((t) => (t === oldTag ? nt : t)).filter(Boolean);
  return serializeTags([...new Set(renamed)]);
};

export const applyTagDelete = (tagsStr = '', tag = '') =>
  serializeTags(parseTags(tagsStr).filter((t) => t !== tag));

// Lọc theo nhiều tag: rỗng -> true; 'and' đủ mọi tag; 'or' có ít nhất 1.
export const matchTagFilter = (problemTags = [], selectedTags = [], mode = 'and') => {
  if (!selectedTags.length) return true;
  const set = new Set(problemTags);
  return mode === 'or'
    ? selectedTags.some((t) => set.has(t))
    : selectedTags.every((t) => set.has(t));
};
