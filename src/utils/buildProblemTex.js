// Dựng khối .tex của MỘT bài. Thụt lề nhất quán bằng TAB (LaTeX bỏ qua khoảng
// trắng đầu dòng -> PDF KHÔNG đổi). Hình (figStatement/figSolution) bọc \begin{center};
// ô trống -> không sinh dòng nào. Dùng chung: Xuất đề + "Mã LaTeX" + "Xem đầy đủ".

// Thụt mỗi dòng KHÔNG rỗng của `text` bằng `depth` tab; dòng rỗng để nguyên.
const indent = (text, depth) => {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((line) => (line.trim() === '' ? '' : pad + line)).join('\n');
};

// Bọc mã hình trong \begin{center} ở cấp `depth` (nội dung hình +1 cấp).
const centerFig = (fig, depth) => {
  const pad = '\t'.repeat(depth);
  return `${pad}\\begin{center}\n${indent(fig.trim(), depth + 1)}\n${pad}\\end{center}\n`;
};

export const buildProblemTex = (item, { includeSolution = true } = {}) => {
  let tex = `\\begin{bt}\n${indent(item.statement.trim(), 1)}\n`;

  if (item.figStatement && item.figStatement.trim()) {
    tex += centerFig(item.figStatement, 1);
  }

  if (item.options && item.options.length > 0) {
    tex += `\t\\choice\n`;
    item.options.forEach((opt) => { tex += `\t\t{${opt.isTrue ? '\\True ' : ''}${opt.text}}\n`; });
  }

  if (includeSolution && item.solution) {
    tex += `\t\\loigiai{\n`;
    if (item.figSolution && item.figSolution.trim()) {
      tex += centerFig(item.figSolution, 2);
    }
    tex += `${indent(item.solution.trim(), 2)}\n\t}\n`;
  }

  tex += `\\end{bt}`;
  return tex;
};
