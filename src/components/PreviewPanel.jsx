import React from 'react';
import { X, BookOpen, CheckCircle, HelpCircle } from 'lucide-react';
import MathText from './MathText';

const PreviewPanel = ({ problem, onClose }) => {
  if (!problem) return null;

  // BỘ PHÂN TÍCH CÚ PHÁP EX_TEST
  const parseLatex = (raw) => {
    let text = raw || '';
    let solution = '';
    let type = 'Tự luận';
    let options = [];
    let shortAnswer = '';

    // 1. Tách Lời giải
    const solMatch = text.match(/\\loigiai\s*\{([\s\S]*?)\}(?=\s*$|\\end)/);
    if (solMatch) {
      solution = solMatch[1].trim();
      text = text.replace(solMatch[0], '').trim();
    }

    // Hàm tiện ích bóc tách \True
    const cleanOption = (opt) => {
      const isTrue = opt.includes('\\True');
      const text = opt.replace(/\\True/g, '').trim();
      return { text, isTrue };
    };

    // 2. Tìm \choice (Trắc nghiệm 4 đáp án)
    const choiceMatch = text.match(/\\choice\s*(?:\[.*?\])?\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}/);
    if (choiceMatch) {
      type = 'Trắc nghiệm';
      options = [
        cleanOption(choiceMatch[1]), cleanOption(choiceMatch[2]), 
        cleanOption(choiceMatch[3]), cleanOption(choiceMatch[4])
      ];
      text = text.replace(choiceMatch[0], '').trim();
    } else {
      // 3. Tìm \choiceTF (Đúng/Sai)
      const tfMatch = text.match(/\\choiceTF\s*(?:\[.*?\])?\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}/);
      if (tfMatch) {
        type = 'Đúng/Sai';
        options = [
          cleanOption(tfMatch[1]), cleanOption(tfMatch[2]), 
          cleanOption(tfMatch[3]), cleanOption(tfMatch[4])
        ];
        text = text.replace(tfMatch[0], '').trim();
      } else {
        // 4. Tìm \shortans (Trả lời ngắn)
        const shortMatch = text.match(/\\shortans\s*(?:\[.*?\])?\s*\{([\s\S]*?)\}/);
        if (shortMatch) {
          type = 'Trả lời ngắn';
          shortAnswer = shortMatch[1].trim();
          text = text.replace(shortMatch[0], '').trim();
        }
      }
    }

    return { statement: text, solution, type, options, shortAnswer };
  };

  // Nối đề bài gốc và lời giải (nếu có) để phân tích
  const rawContent = `${problem.statement}\n${problem.solution ? `\\loigiai{${problem.solution}}` : ''}`;
  const parsed = parseLatex(rawContent);

  const labels = ['A', 'B', 'C', 'D'];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: '#fff', borderLeft: '1px solid #e2e8f0' }}>
      
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} color="#2563eb" /> Chi tiết bài tập
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'inline-block' }}>
            {problem.topic} • Độ khó: Mức {problem.level} • Loại: {parsed.type}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.5rem' }}>
          <X size={20} />
        </button>
      </div>

      {/* Content Scrollable Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: '#fff' }}>
        
        {/* Đề bài */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.75rem', fontSize: '1.05rem' }}>Đề bài:</div>
          <div style={{ fontSize: '1rem', color: '#1e293b', backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
            <MathText text={parsed.statement} />
          </div>
        </div>

        {/* Khu vực Trắc nghiệm (nếu có) */}
        {parsed.type === 'Trắc nghiệm' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            {parsed.options.map((opt, idx) => (
              <div key={idx} style={{ padding: '1rem', borderRadius: '8px', border: opt.isTrue ? '2px solid #22c55e' : '1px solid #cbd5e1', backgroundColor: opt.isTrue ? '#f0fdf4' : '#fff', display: 'flex', gap: '0.75rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: opt.isTrue ? '#22c55e' : '#e2e8f0', color: opt.isTrue ? '#fff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                  {labels[idx]}
                </div>
                <div><MathText text={opt.text} /></div>
              </div>
            ))}
          </div>
        )}

        {/* Khu vực Đúng/Sai (nếu có) */}
        {parsed.type === 'Đúng/Sai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            {parsed.options.map((opt, idx) => (
              <div key={idx} style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                  {labels[idx]}
                </div>
                <div style={{ flex: 1 }}><MathText text={opt.text} /></div>
                {opt.isTrue && <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#22c55e', color: '#fff', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold' }}>Đúng</span>}
              </div>
            ))}
          </div>
        )}

        {/* Khu vực Trả lời ngắn (nếu có) */}
        {parsed.type === 'Trả lời ngắn' && (
          <div style={{ marginBottom: '2rem', padding: '1rem 1.5rem', backgroundColor: '#fffbeb', border: '1px dashed #f59e0b', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <HelpCircle size={20} color="#d97706" />
            <div>
              <span style={{ fontWeight: 600, color: '#92400e', marginRight: '0.5rem' }}>Đáp số điền khuyết:</span>
              <strong style={{ color: '#b45309', fontSize: '1.1rem' }}><MathText text={parsed.shortAnswer} /></strong>
            </div>
          </div>
        )}

        {/* Lời giải */}
        {parsed.solution && (
          <div>
            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.75rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={20} color="#10b981" /> Hướng dẫn giải:
            </div>
            <div style={{ fontSize: '1rem', color: '#1e293b', backgroundColor: '#f0fdf4', padding: '1.5rem', borderRadius: '12px', border: '1px solid #dcfce3' }}>
              <MathText text={parsed.solution} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PreviewPanel;