// Dựng khối .tex của MỘT bài, RÚT NGUYÊN VĂN từ App.handleFinalExport.
// KHÔNG đổi định dạng: thứ tự, khoảng trắng, xuống dòng phải y hệt bản gốc.
// Dùng chung cho: Xuất đề (App.handleFinalExport) + nút "Mã LaTeX" trên thẻ + Xem đầy đủ.
export const buildProblemTex = (item, { includeSolution = true } = {}) => {
  let tex = `\\begin{bt}\n${item.statement.trim()}\n`;
  if (item.options && item.options.length > 0) {
    tex += `\\choice\n`;
    item.options.forEach(opt => { tex += `  {${opt.isTrue ? '\\True ' : ''}${opt.text}}\n`; });
  }
  if (includeSolution && item.solution) tex += `\\loigiai{\n${item.solution.trim()}\n}\n`;
  tex += `\\end{bt}`;
  return tex;
};
