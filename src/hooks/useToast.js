import React from 'react';
import toast from 'react-hot-toast';

export const useToast = () => {
  const success = (message) => {
    toast.success(message, {
      duration: 2000,
      position: 'top-right'
    });
  };

  const error = (message) => {
    toast.error(message, {
      duration: 3000,
      position: 'top-right'
    });
  };

  const loading = (message) => {
    return toast.loading(message, {
      position: 'top-right'
    });
  };

  const info = (message) => {
    toast(message, {
      duration: 2000,
      position: 'top-right',
      icon: 'ℹ️'
    });
  };

  // Toast có nút Hoàn tác (dùng cho xoá mềm). Bấm Hoàn tác sẽ gọi onUndo và đóng toast.
  const undoToast = (message, onUndo) => {
    toast((t) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>{message}</span>
        <button
          onClick={() => { toast.dismiss(t.id); onUndo(); }}
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-cobalt)', borderRadius: 6, padding: '2px 10px', fontWeight: 600, cursor: 'pointer' }}
        >Hoàn tác</button>
      </span>
    ), { duration: 5000, position: 'top-right' });
  };

  return { success, error, loading, info, undoToast };
};