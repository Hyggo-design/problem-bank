// Tìm kiếm sâu: bỏ dấu tiếng Việt + so khớp nhiều từ khóa (VÀ) trên đề + lời giải + tag.
// Hàm THUẦN, tách riêng để viết test. KHÔNG đụng đường xuất / DB.

// Bỏ dấu tiếng Việt + thường hóa. Giữ nguyên ASCII/LaTeX (frac, x^2).
// Dùng vòng lặp theo code point (U+0300–U+036F = khối dấu tổ hợp) để tránh
// rắc rối thoát ký tự trong regex — chạy như nhau, an toàn khi copy.
export const normalizeVi = (str = '') => {
  const decomposed = String(str).normalize('NFD'); // tách dấu tổ hợp khỏi chữ cái
  let out = '';
  for (const ch of decomposed) {
    const code = ch.codePointAt(0);
    if (code >= 0x300 && code <= 0x36f) continue;   // bỏ mọi dấu tổ hợp
    out += ch;
  }
  // đ/Đ là ký tự riêng (U+0111), NFD không tách → thay tay; rồi hạ chữ thường.
  return out.replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
};

// Dựng sẵn 3 trường đã bỏ dấu cho 1 bài (để nhớ lại, không tính mỗi phím gõ).
export const makeSearchFields = (problem = {}) => ({
  statement: normalizeVi(problem.statement || ''),
  solution: normalizeVi(problem.solution || ''),
  tags: normalizeVi(problem.tags || ''),
});

// So khớp: MỌI từ khóa phải có mặt (VÀ) trong (đề + lời giải + tag).
// Trả { matched, hitFields }. hitFields ⊆ ['solution','tags']: nơi có từ khóa
// mà ĐỀ không có (để gắn nhãn "vì sao bài này hiện ra"). Query rỗng → matched=true.
export const matchFields = (fields = { statement: '', solution: '', tags: '' }, query = '') => {
  const words = normalizeVi(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return { matched: true, hitFields: [] };

  const combined = `${fields.statement} ${fields.solution} ${fields.tags}`;
  const matched = words.every((w) => combined.includes(w));
  if (!matched) return { matched: false, hitFields: [] };

  const hitFields = [];
  if (words.some((w) => fields.solution.includes(w) && !fields.statement.includes(w))) hitFields.push('solution');
  if (words.some((w) => fields.tags.includes(w) && !fields.statement.includes(w))) hitFields.push('tags');
  return { matched: true, hitFields };
};
