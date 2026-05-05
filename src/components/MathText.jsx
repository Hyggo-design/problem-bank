import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const MathText = ({ text }) => {
  if (!text) return null;

  let cleanText = text
    .replace(/\\noindent/g, '')
    .replace(/\\par/g, '\n')
    .replace(/\\vspace\{.*?\}/g, '')
    .replace(/\\hspace\{.*?\}/g, '  ')
    .replace(/\\textbf\{([\s\S]*?)\}/g, '<strong>$1</strong>')
    .replace(/\\textit\{([\s\S]*?)\}/g, '<em>$1</em>');

  const parts = cleanText.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  
  return (
    <span style={{ lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
      {parts.map((part, index) => {
        const customMacros = {
          "\\hoac": "\\left[ \\begin{aligned} #1 \\end{aligned} \\right.",
          "\\heva": "\\left\\{ \\begin{aligned} #1 \\end{aligned} \\right."
        };

        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false, macros: customMacros });
            // Thêm maxWidth: '100%' để công thức dài có thanh cuộn riêng, không đẩy khung ngoài
            return <div key={index} dangerouslySetInnerHTML={{ __html: html }} style={{ margin: '0.5rem 0', overflowX: 'auto', maxWidth: '100%' }} />;
          } catch (e) { return <span key={index} style={{ color: 'red' }}>[Lỗi Toán]</span>; }
        } 
        else if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false, macros: customMacros });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) { return <span key={index} style={{ color: 'red' }}>[Lỗi Toán]</span>; }
        }
        
        // SỬA LỖI XUỐNG DÒNG: Dịch \\ (kèm khoảng trắng/enter) thành <br/>
        const htmlText = part
          .replace(/\\\\\s*\n/g, '<br/>') // Ký hiệu \\ đứng cuối dòng
          .replace(/\\\\/g, '<br/>')      // Ký hiệu \\ đứng giữa dòng
          .replace(/\n/g, '<br/>');       // Nút Enter thông thường
          
        return <span key={index} dangerouslySetInnerHTML={{ __html: htmlText }} />;
      })}
    </span>
  );
};

export default MathText;