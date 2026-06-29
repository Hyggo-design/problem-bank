// So trùng bài tập (Sorensen-Dice trên bigram ký tự) — tách riêng để test được.
// KHÔNG đụng đường xuất. useProblems sẽ import lại từ đây.

// Tính độ tương đồng Sorensen-Dice dựa trên character bigrams (tần suất cặp ký tự)
export const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0.0;

  // Chuẩn hóa văn bản: Chuyển thường, loại bỏ khoảng trắng và xuống dòng
  const clean1 = str1.toLowerCase().replace(/\s+/g, '');
  const clean2 = str2.toLowerCase().replace(/\s+/g, '');

  if (clean1 === clean2) return 1.0;
  if (clean1.length < 2 || clean2.length < 2) return 0.0;

  const bigrams1 = new Set();
  for (let i = 0; i < clean1.length - 1; i++) {
    bigrams1.add(clean1.substring(i, i + 2));
  }
  const bigrams2 = new Set();
  for (let i = 0; i < clean2.length - 1; i++) {
    bigrams2.add(clean2.substring(i, i + 2));
  }

  let intersection = 0;
  for (const val of bigrams1) {
    if (bigrams2.has(val)) intersection++;
  }

  // Sorensen-Dice: 2 * |A ∩ B| / (|A| + |B|)
  return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
};

// Tìm bài trùng trong kho: gắn cờ nếu ĐỀ hoặc LỜI GIẢI vượt ngưỡng (OR).
// Trả MẢNG { problem, statementSimilarity, solutionSimilarity } xếp % giảm dần.
export const findDuplicates = (problems, newStatement, newSolution, threshold = 0.85, currentId = null) => {
  const matches = [];
  for (const prob of problems) {
    if (currentId && prob.id === currentId) continue; // bỏ qua chính nó khi Sửa
    const statementSimilarity = calculateSimilarity(newStatement, prob.statement);
    const solutionSimilarity = calculateSimilarity(newSolution, prob.solution);
    if (statementSimilarity >= threshold || solutionSimilarity >= threshold) {
      matches.push({ problem: prob, statementSimilarity, solutionSimilarity });
    }
  }
  matches.sort(
    (a, b) =>
      Math.max(b.statementSimilarity, b.solutionSimilarity) -
      Math.max(a.statementSimilarity, a.solutionSimilarity)
  );
  return matches;
};
