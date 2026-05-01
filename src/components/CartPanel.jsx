import React from 'react';
import { ShoppingCart, Trash2, Download, X } from 'lucide-react';

const CartPanel = ({ items, onRemove, onClear, onExport }) => {
  return (
    <div style={{ height: '40%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      
      {/* Tiêu đề Giỏ hàng */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingCart size={18} color="#3b82f6" /> 
          Giỏ đề thi ({items.length} bài)
        </h3>
        
        {items.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Trash2 size={16} /> Làm sạch
            </button>

            {/* ĐÃ SỬA: Chỉ cần gọi onExport để App.jsx mở Modal lên */}
            <button onClick={onExport} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', borderRadius: '6px', backgroundColor: '#3b82f6', color: '#fff', cursor: 'pointer' }}>
              <Download size={16} /> Xuất Đề (.tex)
            </button>
          </div>
        )}
      </div>

      {/* Danh sách các câu đã chọn */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem', fontSize: '0.9rem' }}>
            Giỏ trống. Hãy chọn bài tập (biểu tượng 🛒) từ danh sách!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                  <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>#{index + 1}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155', fontSize: '0.9rem' }}>
                    {item.statement}
                  </span>
                </div>
                <button onClick={() => onRemove(item.id)} title="Xóa khỏi giỏ" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginLeft: '1rem' }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default CartPanel;