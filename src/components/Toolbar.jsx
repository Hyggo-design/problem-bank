import React from 'react';
import { PlusSquare, Upload } from 'lucide-react';

const Toolbar = ({ onAdd, onSmartImport }) => {
  const ghost = {
    padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem',
    alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '1.5rem 2rem 0.5rem', backgroundColor: 'var(--color-surface)', alignItems: 'center' }}>

      {/* Nút Thêm (CTA chính) */}
      <button onClick={onAdd} style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-cobalt)', color: '#fff', border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
        <PlusSquare size={18} /> Thêm bài tập
      </button>

      {/* Import (mở modal) */}
      <button onClick={onSmartImport} style={ghost}>
        <Upload size={18} /> Import
      </button>

    </div>
  );
};

export default Toolbar;
