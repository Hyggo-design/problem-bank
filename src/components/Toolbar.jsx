import React from 'react';
import { PlusSquare, Upload, Trash2, ShoppingCart, FolderTree } from 'lucide-react';

const Toolbar = ({ onAdd, onSmartImport, isImporting, selectedCount, onBulkDelete, onBulkAddToCart, onManageCategories }) => {
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

      {/* Cụm Nút Thao tác hàng loạt (CHỈ HIỆN KHI CÓ BÀI ĐƯỢC CHỌN) */}
      {selectedCount > 0 && (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', animation: 'fadeIn 0.2s ease-in-out' }}>
          
          <button onClick={onBulkAddToCart} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
            <ShoppingCart size={18} /> Thêm {selectedCount} bài vào giỏ
          </button>
          
          <button onClick={onBulkDelete} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
            <Trash2 size={18} /> Xóa {selectedCount} bài
          </button>

        </div>
      )}

    </div>
  );
};

export default Toolbar;