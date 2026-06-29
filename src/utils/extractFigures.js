// Tách mã hình (TikZ/ảnh) khỏi text + gom logic tách \begin{bt}/\loigiai về một chỗ.
// Dùng chung cho Thêm / Sửa / Import. KHÔNG đụng đường xuất (buildProblemTex).

// Tách hình khỏi `text`. Trả { clean, figures }.
export const extractFigures = (text) => {
  if (!text) return { clean: '', figures: '' };
  let working = text;
  const figs = [];

  // (1) \begin{center}...\end{center} CÓ chứa hình -> lấy phần trong, bỏ center.
  working = working.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, (whole, inner) => {
    if (/\\begin\{tikzpicture\}|\\includegraphics/.test(inner)) {
      figs.push(inner.trim());
      return '';
    }
    return whole; // center không chứa hình -> giữ nguyên
  });

  // (2) tikzpicture để trần
  working = working.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, (m) => {
    figs.push(m.trim());
    return '';
  });

  // (3) includegraphics để trần
  working = working.replace(/\\includegraphics(?:\[[^\]]*\])?\{[^}]*\}/g, (m) => {
    figs.push(m.trim());
    return '';
  });

  const clean = working.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { clean, figures: figs.join('\n') };
};

// rawLatex -> { statement, solution, figStatement, figSolution }.
export const parseProblemLatex = (raw) => {
  let cleanText = (raw || '').replace(/\\begin\{bt\}/g, '').replace(/\\end\{bt\}/g, '').trim();
  let statement = cleanText;
  let solution = '';
  const loigiaiMatch = cleanText.match(/\\loigiai\{([\s\S]*?)\}(?=\s*$|\\end)/);
  if (loigiaiMatch) {
    solution = loigiaiMatch[1].trim();
    statement = cleanText.replace(loigiaiMatch[0], '').trim();
  }
  const s = extractFigures(statement);
  const sol = extractFigures(solution);
  return { statement: s.clean, figStatement: s.figures, solution: sol.clean, figSolution: sol.figures };
};

// problem -> rawLatex (ghép hình về vị trí canonical) để nạp vào ô Sửa.
export const reconstructProblemLatex = (problem) => {
  const statement = problem.statement || '';
  const solution = problem.solution || '';
  const figStatement = (problem.figStatement || '').trim();
  const figSolution = (problem.figSolution || '').trim();

  let body = statement;
  if (figStatement) body += `\n${figStatement}`;
  if (solution || figSolution) {
    let inner = '';
    if (figSolution) inner += `${figSolution}\n`;
    inner += solution;
    body += `\n\\loigiai{\n${inner}\n}`;
  }
  return `\\begin{bt}\n${body}\n\\end{bt}`;
};
