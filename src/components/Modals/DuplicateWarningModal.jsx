import React from 'react';
import { AlertTriangle, X, Save } from 'lucide-react';
import MathText from '../MathText';

const DuplicateWarningModal = ({ pendingSave, onConfirm, onCancel }) => {
  if (!pendingSave) return null;
  const { problem, duplicateInfo } = pendingSave;
  const similarityPct = (duplicateInfo.similarity * 100).toFixed(0);
  const existingProblem = duplicateInfo.problem;

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
            Cảnh báo: Trùng lặp nội dung ({similarityPct}%)
          </h2>
          <button onClick={onCancel} className="card-btn" style={{ border: 'none', background: 'transparent', color: 'var(--color-amber-text)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Nội dung đối sánh */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '60vh', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.92rem', lineHeight: '1.5' }}>
            Hệ thống phát hiện câu hỏi Thầy đang soạn rất tương đồng với một câu hỏi đã lưu từ trước. Vui lòng rà soát và đối chiếu dưới đây:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Khối 1: Đang nhập */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1rem', backgroundColor: 'var(--color-surface-muted)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-cobalt)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📝 Câu hỏi Thầy đang soạn
              </div>
              <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)', maxHeight: '150px', overflowY: 'auto' }}>
                <MathText text={problem.statement} />
              </div>
            </div>

            {/* Khối 2: Đã có sẵn */}
            <div style={{ border: '1px solid var(--color-diff-border)', borderRadius: '10px', padding: '1rem', backgroundColor: 'var(--color-amber-bg)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-amber-text)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔍 Câu hỏi trùng nhất đã lưu</span>
                <span style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-amber-text)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>
                  {existingProblem.topic} • Lvl {existingProblem.level}
                </span>
              </div>
              <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-diff-border)', maxHeight: '150px', overflowY: 'auto' }}>
                <MathText text={existingProblem.statement} />
              </div>
            </div>
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
