import React from 'react';
import { X, BookOpen, CheckCircle, HelpCircle } from 'lucide-react';
import MathText from './MathText'; 

const LatexBlockRenderer = ({ text }) => {
  if (!text) return null;

  const blockRegex = /\\begin\{(tasks|enumerate|itemize)\}(?:\((\d+)\))?/;
  const match = blockRegex.exec(text);

  if (!match) return <MathText text={text} />;

  const type = match[1];
  const arg = match[2];
  const startIndex = match.index;

  let count = 0;
  let endIndex = -1;
  const tagRegex = new RegExp(`\\\\(begin|end)\\{${type}\\}`, 'g');
  tagRegex.lastIndex = startIndex;

  let tagMatch;
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    if (tagMatch[1] === 'begin') count++;
    else count--;

    if (count === 0) {
      endIndex = tagMatch.index;
      break;
    }
  }

  if (endIndex === -1) return <MathText text={text} />;

  const beforeText = text.substring(0, startIndex);
  const innerText = text.substring(startIndex + match[0].length, endIndex);
  const afterText = text.substring(endIndex + `\\end{${type}}`.length);

  const elements = [];
  
  if (beforeText.trim()) elements.push(<LatexBlockRenderer key={`before-${startIndex}`} text={beforeText} />);

  const splitByItem = (txt, keyword) => {
    const parts = txt.split(keyword);
    if (parts.length > 0 && parts[0].trim() === '') parts.shift();
    return parts;
  };

  if (type === 'tasks') {
    const cols = parseInt(arg) || 1;
    const items = splitByItem(innerText, '\\task');
    elements.push(
      <div key={`tasks-${startIndex}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '1rem', margin: '0.5rem 0' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 'bold', color: '#334155', marginTop: '2px' }}>{String.fromCharCode(97 + i)})</span>
            <div style={{ flex: 1, minWidth: 0 }}><LatexBlockRenderer text={item.trim()} /></div>
          </div>
        ))}
      </div>
    );
  } else if (type === 'enumerate') {
    const items = splitByItem(innerText, '\\item');
    elements.push(
      <div key={`enum-${startIndex}`} style={{ margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((item, i) => {
          let content = item.trim();
          let label = `${i + 1}.`; 
          
          const labelMatch = content.match(/^\[(.*?)\]/);
          if (labelMatch) {
            label = labelMatch[1];
            content = content.substring(labelMatch[0].length).trim();
          }
          return (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 'bold', color: '#334155', minWidth: '1.5rem', marginTop: '2px' }}>{label}</span>
              <div style={{ flex: 1, minWidth: 0 }}><LatexBlockRenderer text={content} /></div>
            </div>
          );
        })}
      </div>
    );
  } else if (type === 'itemize') {
    const items = splitByItem(innerText, '\\item');
    elements.push(
      <div key={`item-${startIndex}`} style={{ margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ color: '#334155', minWidth: '1rem', fontWeight: 'bold', marginTop: '2px' }}>•</span>
            <div style={{ flex: 1, minWidth: 0 }}><LatexBlockRenderer text={item.trim()} /></div>
          </div>
        ))}
      </div>
    );
  }

  if (afterText.trim()) elements.push(<LatexBlockRenderer key={`after-${startIndex}`} text={afterText} />);

  return <>{elements}</>;
};

const PreviewPanel = ({ problem, onClose }) => {
  if (!problem) return null;

  const parseLatex = (raw) => {
    let text = raw || '';
    let solution = '';
    let type = 'Tự luận';
    let options = [];
    let shortAnswer = '';

    text = text.replace(/\\immini\s*\{/g, '').replace(/\}\s*\\includegraphics\[.*?\]\{.*?\}/g, '\n\n[🖼️ Hình ảnh đính kèm]');

    const solMatch = text.match(/\\loigiai\s*\{([\s\S]*?)\}(?=\s*$|\\end)/);
    if (solMatch) {
      solution = solMatch[1].trim();
      text = text.replace(solMatch[0], '').trim();
    }

    const cleanOption = (opt) => {
      const isTrue = opt.includes('\\True');
      const cleanTxt = opt.replace(/\\True/g, '').trim();
      return { text: cleanTxt, isTrue };
    };

    const choiceMatch = text.match(/\\choice\s*(?:\[.*?\])?\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}/);
    if (choiceMatch) {
      type = 'Trắc nghiệm';
      options = [
        cleanOption(choiceMatch[1]), cleanOption(choiceMatch[2]), 
        cleanOption(choiceMatch[3]), cleanOption(choiceMatch[4])
      ];
      text = text.replace(choiceMatch[0], '').trim();
    } else {
      const tfMatch = text.match(/\\choiceTF\s*(?:\[.*?\])?\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}/);
      if (tfMatch) {
        type = 'Đúng/Sai';
        options = [
          cleanOption(tfMatch[1]), cleanOption(tfMatch[2]), 
          cleanOption(tfMatch[3]), cleanOption(tfMatch[4])
        ];
        text = text.replace(tfMatch[0], '').trim();
      } else {
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

  const rawContent = `${problem.statement}\n${problem.solution ? `\\loigiai{${problem.solution}}` : ''}`;
  const parsed = parseLatex(rawContent);
  const labels = ['A', 'B', 'C', 'D'];

  // === THUẬT TOÁN ĐỒNG HÓA FONT & CỠ CHỮ ===
  const latexPrintStyle = {
    fontFamily: '"KaTeX_Main", "Times New Roman", Times, serif', // Dùng chung font với Toán
    fontSize: '11pt', // Chốt cỡ chữ chuẩn 11pt
    lineHeight: '1.6',
    color: '#1e293b',
    padding: '1.5rem', 
    borderRadius: '12px', 
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: '#fff', borderLeft: '1px solid #e2e8f0' }}>
      
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'sans-serif' }}>
            <BookOpen size={18} color="#2563eb" /> Chi tiết bài tập
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'inline-block', fontFamily: 'sans-serif' }}>
            {problem.topic} • Độ khó: Mức {problem.level} • Loại: {parsed.type}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.5rem' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '1.5rem', backgroundColor: '#fff' }}>
        
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.75rem', fontSize: '1.05rem', fontFamily: 'sans-serif' }}>Đề bài:</div>
          {/* KHUNG ĐỀ BÀI */}
          <div style={{ ...latexPrintStyle, backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe' }}>
            <LatexBlockRenderer text={parsed.statement} />
          </div>
        </div>

        {parsed.type === 'Trắc nghiệm' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem', marginBottom: '2rem', fontFamily: '"KaTeX_Main", "Times New Roman", Times, serif', fontSize: '11pt', lineHeight: '1.6' }}>
            {parsed.options.map((opt, idx) => (
              <div key={idx} style={{ padding: '1rem', borderRadius: '8px', border: opt.isTrue ? '2px solid #22c55e' : '1px solid #cbd5e1', backgroundColor: opt.isTrue ? '#f0fdf4' : '#fff', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: opt.isTrue ? '#22c55e' : '#e2e8f0', color: opt.isTrue ? '#fff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontFamily: 'sans-serif', fontSize: '1rem' }}>
                  {labels[idx]}
                </div>
                <div style={{ flex: 1, minWidth: 0, marginTop: '2px' }}><LatexBlockRenderer text={opt.text} /></div>
              </div>
            ))}
          </div>
        )}

        {parsed.type === 'Đúng/Sai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', fontFamily: '"KaTeX_Main", "Times New Roman", Times, serif', fontSize: '11pt', lineHeight: '1.6' }}>
            {parsed.options.map((opt, idx) => (
              <div key={idx} style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontFamily: 'sans-serif', fontSize: '1rem' }}>
                  {labels[idx]}
                </div>
                <div style={{ flex: 1, minWidth: 0, marginTop: '2px' }}><LatexBlockRenderer text={opt.text} /></div>
                {opt.isTrue && <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#22c55e', color: '#fff', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold', flexShrink: 0, fontFamily: 'sans-serif' }}>Đúng</span>}
              </div>
            ))}
          </div>
        )}

        {parsed.type === 'Trả lời ngắn' && (
          <div style={{ marginBottom: '2rem', padding: '1rem 1.5rem', backgroundColor: '#fffbeb', border: '1px dashed #f59e0b', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '1rem', fontFamily: '"KaTeX_Main", "Times New Roman", Times, serif', fontSize: '11pt', lineHeight: '1.6' }}>
            <HelpCircle size={20} color="#d97706" flexShrink={0} style={{ marginTop: '2px' }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600, color: '#92400e', marginRight: '0.5rem', fontFamily: 'sans-serif', fontSize: '1rem' }}>Đáp số điền khuyết:</span>
              <strong style={{ color: '#b45309' }}><LatexBlockRenderer text={parsed.shortAnswer} /></strong>
            </div>
          </div>
        )}

        {parsed.solution && (
          <div>
            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.75rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'sans-serif' }}>
              <CheckCircle size={20} color="#10b981" /> Hướng dẫn giải:
            </div>
            {/* KHUNG LỜI GIẢI */}
            <div style={{ ...latexPrintStyle, backgroundColor: '#f0fdf4', border: '1px solid #dcfce3', overflowX: 'auto' }}>
              <LatexBlockRenderer text={parsed.solution} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PreviewPanel;