import React, { useState } from 'react';
import { Eye, Lightbulb, Code, ShoppingCart, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import LatexBlockRenderer from './LatexBlockRenderer';
import { buildProblemTex } from '../utils/buildProblemTex';

// Một THẺ bài tập (Phương án C — đề nổi trên "khay" xám). Bấm thân thẻ = chọn/bỏ chọn.
const ProblemCard = ({
  problem, classification, selected,
  onToggleSelect, onPreview, onAddToCart, onEdit, onDelete, onCopied,
}) => {
  const [showSol, setShowSol] = useState(false);

  const copyTex = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(buildProblemTex(problem, { includeSolution: true }));
    onCopied && onCopied();
  };
  // Bọc handler nút: chặn nổi bọt để KHÔNG kích hoạt "chọn thẻ" khi bấm nút.
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <div
      onClick={onToggleSelect}
      style={{
        cursor: 'pointer', margin: '0 0 12px', borderRadius: 'var(--radius-md)', overflow: 'hidden',
        background: 'var(--color-surface)', position: 'relative',
        border: selected ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
        boxShadow: selected ? '0 0 0 1px var(--color-accent)' : '0 1px 3px var(--shadow)',
      }}
    >
      {selected && (
        <CheckCircle2 size={20} color="var(--color-accent)" style={{ position: 'absolute', top: 10, right: 12 }} />
      )}

      {/* VÙNG 1 — ĐỀ (trên nền trắng của thẻ, cuộn khi dài) */}
      <div style={{
        padding: '13px 16px', paddingRight: 42, maxHeight: '7.8em', overflowY: 'auto',
        color: 'var(--color-text)', lineHeight: 1.55,
      }}>
        <LatexBlockRenderer text={problem.statement} />
      </div>

      {/* VÙNG 2 — LỜI GIẢI bung tại chỗ (tùy chọn) */}
      {showSol && problem.solution && (
        <div style={{
          margin: '0 16px 12px', background: 'var(--color-solution-bg)', border: '1px solid var(--color-solution-border)',
          borderRadius: 'var(--radius-md)', padding: '11px 14px', lineHeight: 1.5,
        }}>
          <span style={{ color: 'var(--color-solution-text)', fontWeight: 500 }}>Lời giải. </span>
          <LatexBlockRenderer text={problem.solution} />
        </div>
      )}

      {/* VÙNG 3a — PHÂN LOẠI + TAG (trên nền trắng, kẻ chia với đề) */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border-subtle)' }}>
        {classification.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Chưa phân loại</div>
        )}
        {classification.map((g) => (
          <div key={g.heId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '2px 0', fontSize: '0.85rem' }}>
            <span>
              {g.paths.map((path, i) => (
                <span key={i} style={{ marginRight: i < g.paths.length - 1 ? 10 : 0 }}>
                  {path.map((name, j) => (
                    <React.Fragment key={j}>
                      {j > 0 && <span style={{ color: 'var(--color-text-faint)' }}> › </span>}
                      <span style={{ color: j === 0 ? 'var(--color-text)' : 'var(--color-text-subtle)', fontWeight: j === 0 ? 500 : 400 }}>{name}</span>
                    </React.Fragment>
                  ))}
                </span>
              ))}
            </span>
            {g.difficultyName && (
              <span style={{
                flexShrink: 0, background: 'var(--color-diff-bg)', color: 'var(--color-diff-text)',
                border: '1px solid var(--color-diff-border)', borderRadius: 'var(--radius-pill)',
                padding: '2px 10px', fontSize: '0.75rem', fontWeight: 500,
              }}>{g.difficultyName}</span>
            )}
          </div>
        ))}
        <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {problem.type || 'Tự luận'}
          {(problem.gradeNames && problem.gradeNames.length) ? ` · Lớp ${problem.gradeNames.join(', ')}` : ''}
          {problem.tags ? <span style={{ color: 'var(--color-tag-text)' }}>{' · ' + problem.tags.split(',').map((t) => '#' + t.trim()).join(' ')}</span> : ''}
        </div>
      </div>

      {/* VÙNG 3b — NÚT (footer) */}
      <div style={{
        padding: '9px 16px', background: 'var(--color-surface-muted)', borderTop: '1px solid var(--color-border-subtle)',
        display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={stop(() => onPreview())} className="card-btn"><Eye size={16} /> Xem đầy đủ</button>
          <button onClick={stop(() => setShowSol((s) => !s))} className={`card-btn${showSol ? ' card-btn-primary' : ''}`}><Lightbulb size={16} /> Lời giải</button>
          <button onClick={copyTex} className="card-btn"><Code size={16} /> Mã LaTeX</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={stop(() => onAddToCart())} className="card-btn card-btn-primary"><ShoppingCart size={16} /> Thêm giỏ</button>
          <button onClick={stop(() => onEdit())} className="card-btn"><Edit3 size={16} /> Sửa</button>
          <button onClick={stop(() => onDelete())} className="card-btn card-btn-danger"><Trash2 size={16} /> Xoá</button>
        </div>
      </div>
    </div>
  );
};

export default ProblemCard;
