import React, { useState } from 'react';
import { X, BookOpen, CheckCircle, HelpCircle, Code, Lightbulb } from 'lucide-react';
import LatexBlockRenderer from './LatexBlockRenderer';
import { buildProblemTex } from '../utils/buildProblemTex';
import { useTaxonomy } from '../hooks/useTaxonomy';

const PreviewPanel = ({ problem, onClose, onCopied }) => {
  // Gọi hook TRƯỚC mọi return sớm (luật Hooks: phải gọi cùng thứ tự mỗi lần render).
  const { categories, difficulties, grades } = useTaxonomy();
  const [hideSolution, setHideSolution] = useState(false);
  if (!problem) return null;

  // Map id -> bản ghi để tra tên nhanh; bỏ qua id mồ côi (filter Boolean).
  const catById = Object.fromEntries(categories.map(c => [c.id, c]));
  const diffById = Object.fromEntries(difficulties.map(d => [d.id, d]));
  const gradeById = Object.fromEntries(grades.map(g => [g.id, g]));
  const catNames = (problem.categoryIds || []).map(id => catById[id]?.name).filter(Boolean);
  const diffNames = Object.values(problem.difficultyByHe || {}).map(id => diffById[id]?.name).filter(Boolean);
  const gradeNames = (problem.gradeIds || []).map(id => gradeById[id]?.name).filter(Boolean);

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

  const copyTex = () => {
    navigator.clipboard.writeText(buildProblemTex(problem, { includeSolution: true }));
    onCopied && onCopied();
  };

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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>

      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--color-surface-muted)' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} color="var(--color-cobalt)" /> Chi tiết bài tập
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'inline-block' }}>
            {catNames.length ? catNames.join(', ') : 'Chưa phân loại'}
            {diffNames.length ? ` • ${diffNames.join(' / ')}` : ''}
            {gradeNames.length ? ` • Lớp ${gradeNames.join(', ')}` : ''}
            {` • ${parsed.type}`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button onClick={copyTex} className="card-btn"><Code size={16} /> Chép Mã LaTeX</button>
          {parsed.solution && (
            <button onClick={() => setHideSolution(s => !s)} className={`card-btn${hideSolution ? '' : ' card-btn-primary'}`}>
              <Lightbulb size={16} /> {hideSolution ? 'Hiện lời giải' : 'Ẩn lời giải'}
            </button>
          )}
          <button onClick={onClose} title="Đóng" className="card-btn" style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>
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

        {parsed.solution && !hideSolution && (
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