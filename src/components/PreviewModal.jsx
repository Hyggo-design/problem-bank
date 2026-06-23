import React, { useEffect } from 'react';
import PreviewPanel from './PreviewPanel';

// "Xem đầy đủ" = hộp thoại giữa màn (lớp phủ trong-app). Đóng bằng Esc / bấm nền mờ.
const PreviewModal = ({ problem, onClose, onCopied }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!problem) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center', padding: '3vh 2rem', zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(760px, 100%)', maxHeight: '94vh', background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(15,23,42,0.25)',
        }}
      >
        <PreviewPanel problem={problem} onClose={onClose} onCopied={onCopied} />
      </div>
    </div>
  );
};

export default PreviewModal;
