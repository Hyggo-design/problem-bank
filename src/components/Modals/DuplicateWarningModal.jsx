import React from 'react';
import { AlertTriangle, X, Save } from 'lucide-react';
import MathText from '../MathText';

const pct = (v) => (v * 100).toFixed(0);

const DuplicateWarningModal = ({ pendingSave, onConfirm, onCancel }) => {
  if (!pendingSave) return null;
  const { problem, duplicates } = pendingSave;
  if (!duplicates || duplicates.length === 0) return null;
  const shown = duplicates.slice(0, 5);
  const extra = duplicates.length - shown.length;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, backdropFilter: 'blur(4px)', padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)', borderRadius: '16px', width: '100%', maxWidth: '680px',
        boxShadow: '0 25px 50px -12px var(--shadow)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', border: '1px solid var(--color-border)', animation: 'scaleUp 0.15s ease-out'
      }}>

        {/* Header - cảnh báo (amber) */}
        <div style={{
          padding: '1.25rem 1.5rem', backgroundColor: 'var(--color-amber-bg)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-amber-text)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700 }}>
            <AlertTriangle size={22} />
            Cảnh báo: Tìm thấy {duplicates.length} bài tương tự
          </h2>
          <button onClick={onCancel} className="card-btn" style={{ border: 'none', background: 'transparent', color: 'var(--color-amber-text)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Nội dung đối sánh */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '60vh', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.92rem', lineHeight: '1.5' }}>
            Câu hỏi Thầy đang soạn tương đồng với {duplicates.length} câu đã lưu. Vui lòng rà soát trước khi lưu:
          </p>

          {/* Khối: Đang nhập */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1rem', backgroundColor: 'var(--color-surface-muted)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-cobalt)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📝 Câu hỏi Thầy đang soạn
            </div>
            <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)', maxHeight: '150px', overflowY: 'auto' }}>
              <MathText text={problem.statement} />
            </div>
          </div>

          {/* Danh sách bài trùng */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {shown.map(({ problem: ex, statementSimilarity, solutionSimilarity }) => (
              <div key={ex.id} style={{ border: '1px solid var(--color-diff-border)', borderRadius: '10px', padding: '1rem', backgroundColor: 'var(--color-amber-bg)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-amber-text)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔍 {ex.topic || 'Đã lưu'}{ex.level ? ` • Lvl ${ex.level}` : ''}</span>
                  <span style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-amber-text)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                    Đề: {pct(statementSimilarity)}% · Lời giải: {pct(solutionSimilarity)}%
                  </span>
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-diff-border)', maxHeight: '120px', overflowY: 'auto' }}>
                  <MathText text={ex.statement} />
                </div>
              </div>
            ))}
            {extra > 0 && (
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                +{extra} bài nữa
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--color-surface-muted)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onCancel} className="card-btn" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
            Quay lại chỉnh sửa
          </button>
          <button onClick={onConfirm} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-amber)', color: 'var(--color-on-amber)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Save size={16} /> Vẫn tiếp tục lưu
          </button>
        </div>

      </div>
    </div>
  );
};

export default DuplicateWarningModal;
