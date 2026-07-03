// Logic THUẦN cho ô soạn thảo LaTeX — KHÔNG import CodeMirror để Jest chạy được.
// (CRA mặc định không biên dịch ESM trong node_modules; tách ra đây thì test an toàn.)
// Dùng bởi: src/components/LatexEditor.jsx. Mẫu tương tự: backupRotation.js, searchText.js.

// Cấu hình cặp ngoặc tự đóng — gồm cả $ để tự đóng cặp toán $...$.
export const CLOSE_BRACKETS = { brackets: ['(', '[', '{', '$'] };

// Nếu đoạn text NGAY TRƯỚC con trỏ kết thúc bằng \begin{tênMôiTrường} thì trả về
// tênMôiTrường; ngược lại trả null. Cho phép chữ cái, @, và * (vd align*).
export const detectBeginEnv = (textBeforeCursor = '') => {
  const m = /\\begin\{([a-zA-Z@*]+)\}[ \t]*$/.exec(textBeforeCursor);
  return m ? m[1] : null;
};

// Chuỗi tự chèn để cặp \end: một dòng trống ở giữa rồi \end{tên}.
// KHÔNG chèn tab (đường xuất .tex đã tự căn lề — không nhét rác vào nội dung lưu).
export const buildEndInsertion = (env) => `\n\n\\end{${env}}`;
