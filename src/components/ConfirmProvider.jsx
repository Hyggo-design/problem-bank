import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// ==========================================================================
// Hộp thoại xác nhận TRONG APP (thay window.confirm/alert — vốn không chạy
// đúng trong Tauri: cần quyền + bất đồng bộ). Dùng kiểu promise:
//   const confirm = useConfirm();
//   if (await confirm({ message, title, danger })) { ... }
// Cho "alert" (chỉ 1 nút OK): await confirm({ message, hideCancel: true }).
// ==========================================================================

const ConfirmContext = createContext(() => Promise.resolve(false));

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
  const [opts, setOpts] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setOpts({
        title: options.title || 'Xác nhận',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Đồng ý',
        cancelLabel: options.cancelLabel || 'Huỷ',
        danger: !!options.danger,
        hideCancel: !!options.hideCancel,
      });
    });
  }, []);

  const settle = useCallback((result) => {
    setOpts(null);
    const r = resolveRef.current;
    resolveRef.current = null;
    if (r) r(result);
  }, []);

  // Esc = huỷ, Enter = đồng ý (chỉ khi đang mở)
  useEffect(() => {
    if (!opts) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); settle(false); }
      else if (e.key === 'Enter') { e.preventDefault(); settle(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opts, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          onMouseDown={() => settle(false)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.75)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 11000, padding: '1rem',
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--color-surface)', borderRadius: '14px', width: '100%',
              maxWidth: '440px', boxShadow: '0 25px 50px -12px var(--shadow)',
              border: '1px solid var(--color-border)', overflow: 'hidden',
              animation: 'scaleUp 0.15s ease-out',
            }}
          >
            {/* Header */}
            <div style={{ padding: '1.1rem 1.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: opts.danger ? 'var(--color-danger)' : 'var(--color-cobalt)', display: 'flex' }}>
                <AlertTriangle size={20} />
              </span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-text)', flex: 1 }}>{opts.title}</h3>
              <button onClick={() => settle(false)} className="card-btn" style={{ border: 'none', padding: '0.3rem' }}>
                <X size={18} />
              </button>
            </div>

            {/* Nội dung */}
            <div style={{ padding: '1.2rem 1.3rem', color: 'var(--color-text-muted)', fontSize: '0.92rem', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
              {opts.message}
            </div>

            {/* Nút */}
            <div style={{ padding: '0.9rem 1.3rem', background: 'var(--color-surface-muted)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.7rem' }}>
              {!opts.hideCancel && (
                <button onClick={() => settle(false)} className="card-btn">{opts.cancelLabel}</button>
              )}
              <button autoFocus onClick={() => settle(true)} className={opts.danger ? 'card-btn card-btn-danger' : 'card-btn card-btn-primary'}>
                {opts.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
