import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const MathText = ({ text }) => {
  if (!text) return null;

  // Tự động chuyển \angle thành \widehat trước khi render để đảm bảo chuẩn VN
  let safeText = text.replace(/\\angle\s*\{([^}]+)\}/g, '\\widehat{$1}')
                     .replace(/\\angle\s+([a-zA-Z0-9]+)/g, '\\widehat{$1}')
                     .replace(/\\angle([a-zA-Z0-9]+)/g, '\\widehat{$1}');

  // Tách text thường và công thức Toán (kẹp giữa $...$ hoặc $$...$$)
  const parts = safeText.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <div style={{ display: 'inline', lineHeight: '1.8' }}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return <BlockMath key={index} math={part.slice(2, -2)} />;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={index} math={part.slice(1, -1)} />;
        }
        // Hiển thị text thường, giữ nguyên dấu xuống dòng
        return <span key={index} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
      })}
    </div>
  );
};

export default MathText;