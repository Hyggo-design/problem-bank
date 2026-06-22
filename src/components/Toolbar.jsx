import React from 'react';
import { PlusSquare, Upload, FolderTree } from 'lucide-react';

const Toolbar = ({ onAdd, onSmartImport, onManageCategories }) => {
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '1.5rem 2rem 0.5rem', backgroundColor: '#fff', alignItems: 'center' }}>
      
      {/* Nút Thêm */}
      <button onClick={onAdd} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', backgroundColor: '#2563eb', color: '#fff', border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <PlusSquare size={18} /> Thêm bài tập
      </button>

      {/* Nút Import Đa Năng (Mở Modal) */}
      <button onClick={onSmartImport} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
        <Upload size={18} /> Import
      </button>

      {/* Nút Quản lý phân loại (Mở Modal) */}
      <button onClick={onManageCategories} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', backgroundColor: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
        <FolderTree size={18} /> Quản lý phân loại
      </button>

    </div>
  );
};

export default Toolbar;