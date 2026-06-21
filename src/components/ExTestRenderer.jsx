import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// ==========================================
// 1. ENGINE VẼ TOÁN HỌC (Có hỗ trợ Macro của Thầy Sơn)
// ==========================================
const MathText = ({ text }) => {
  if (!text) return null;

  const renderLatex = (str) => {
    // Tách chuỗi thành các phần: $$...$$ (block), $...$ (inline), và chữ thường
    const parts = str.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    
    return parts.map((part, index) => {
      // Định nghĩa các Macro đặc thù của Thầy
      const customMacros = {
        "\\hoac": "\\left[ \\begin{aligned} #1 \\end{aligned} \\right.",
        "\\heva": "\\left\\{ \\begin{aligned} #1 \\end{aligned} \\right."
      };

      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2);
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false, macros: customMacros });
          return <div key={index} dangerouslySetInnerHTML={{ __html: html }} style={{ margin: '0.5rem 0', overflowX: 'auto' }} />;
        } catch (e) { return <span key={index} style={{ color: 'red' }}>[Lỗi Toán]</span>; }
      } 
      
      else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false, macros: customMacros });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch (e) { return <span key={index} style={{ color: 'red' }}>[Lỗi Toán]</span>; }
      }
      
      // Chữ thường: Xóa các lệnh format rác không cần thiết trên Web
      let plainText = part
        .replace(/\\noindent/g, '')
        .replace(/\\par/g, '\n')
        .replace(/\\vspace\{.*?\}/g, '')
        .replace(/\\hspace\{.*?\}/g, '  ');
        
      return <span key={index} dangerouslySetInnerHTML={{ __html: plainText.replace(/\n/g, '<br/>') }} />;
    });
  };

  return <span style={{ lineHeight: '1.6' }}>{renderLatex(text)}</span>;
};

// ==========================================
// 2. BỘ THÔNG DỊCH EX_TEST (Trùm cuối)
// ==========================================
const ExTestRenderer = ({ content }) => {
  if (!content) return <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Chưa có nội dung...</div>;

  // --- BƯỚC A: BÓC TÁCH LỜI GIẢI ---
  let statement = content;
  let solution = "";
  
  if (content.includes('\\loigiai')) {
    const parts = content.split('\\loigiai');
    statement = parts[0].trim();
    
    // Lấy phần nội dung bên trong dấu ngoặc nhọn của \loigiai{...}
    let solPart = parts[1].trim();
    if (solPart.startsWith('{')) solPart = solPart.substring(1);
    if (solPart.endsWith('}')) solPart = solPart.substring(0, solPart.length - 1);
    solution = solPart.trim();
  }

  // Khử lệnh \immini (Tạm thời bỏ lệnh, chỉ lấy chữ để Web không bị lỗi)
  statement = statement.replace(/\\immini\s*\{/g, '').replace(/\}\\includegraphics\[.*?\]\{.*?\}/g, '\n\n[🖼️ Hình ảnh đính kèm]');

  // --- BƯỚC B: THÔNG DỊCH BỐ CỤC ĐỀ BÀI (Xử lý Tasks) ---
  const renderStatement = (text) => {
    // Regex tìm các khối \begin{tasks}(n) ... \end{tasks}
    const taskRegex = /\\begin\{tasks\}\((\d+)\)([\s\S]*?)\\end\{tasks\}/g;
    const elements = [];
    let lastIndex = 0;
    let match;

    while ((match = taskRegex.exec(text)) !== null) {
      // 1. In ra phần chữ phía trước tasks
      if (match.index > lastIndex) {
        elements.push(<MathText key={`text-${lastIndex}`} text={text.substring(lastIndex, match.index)} />);
      }

      // 2. Xử lý chia cột Tasks
      const cols = parseInt(match[1]) || 2;
      const taskContent = match[2];
      // Cắt theo \task
      const items = taskContent.split('\\task').filter(t => t.trim() !== '');

      elements.push(
        <div key={`task-${match.index}`} style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${cols}, 1fr)`, 
          gap: '1rem', 
          margin: '1rem 0',
          backgroundColor: '#f8fafc',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px dashed #cbd5e1'
        }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', color: '#334155' }}>{String.fromCharCode(97 + i)})</span>
              <div style={{ flex: 1 }}><MathText text={item.trim()} /></div>
            </div>
          ))}
        </div>
      );

      lastIndex = taskRegex.lastIndex;
    }

    // 3. In ra phần chữ còn sót lại sau tasks
    if (lastIndex < text.length) {
      elements.push(<MathText key={`text-${lastIndex}`} text={text.substring(lastIndex)} />);
    }

    return elements;
  };

  return (
    <div style={{ fontFamily: 'sans-serif', fontSize: '1rem', color: '#1e293b' }}>
      {/* KHUNG ĐỀ BÀI */}
      <div style={{ marginBottom: solution ? '2rem' : '0' }}>
        {renderStatement(statement)}
      </div>

      {/* KHUNG LỜI GIẢI (Chỉ hiện nếu có) */}
      {solution && (
        <div style={{ 
          backgroundColor: '#f0fdf4', 
          borderLeft: '4px solid #22c55e', 
          padding: '1.25rem', 
          borderRadius: '0 8px 8px 0' 
        }}>
          <h4 style={{ color: '#166534', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            💡 Hướng dẫn giải
          </h4>
          <MathText text={solution} />
        </div>
      )}
    </div>
  );
};

export default ExTestRenderer;