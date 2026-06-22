import React from 'react';
import { ShoppingCart, Trash2, Download, X } from 'lucide-react';

// Trang "Giỏ đề" (chiếm trọn cột chính). onClose = quay lại trang Danh sách bài.
const CartPanel = ({ items, onRemove, onClear, onExport, onClose }) => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', minWidth: 0, overflow: 'hidden' }}>

      {/* Tiêu đề + hành động */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--color-surface)' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <ShoppingCart size={18} color="var(--color-cobalt)" style={{ flexShrink: 0 }} />
          Giỏ đề thi · {items.length} bài
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {items.length > 0 && (
            <>
              <button onClick={onClear} className="card-btn"><Trash2 size={16} /> Làm sạch</button>
              {/* CTA lớn = amber */}
              <button onClick={onExport} style={{ padding: '0.5rem 0.9rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-amber)', color: 'var(--color-on-amber)', cursor: 'pointer', fontWeight: 600 }}>
                <Download size={16} /> Xuất Đề (.tex)
              </button>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)', margin: '0 0.25rem' }} />
            </>
          )}
          <button onClick={onClose} title="Quay lại danh sách" className="card-btn" style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Danh sách bài trong giỏ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '3rem', fontSize: '0.95rem' }}>
            Giỏ trống. Sang “Danh sách bài”, chọn bài rồi bấm “Thêm giỏ”.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 900, margin: '0 auto' }}>
            {items.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', minWidth: 0, flex: 1 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.9rem', flexShrink: 0 }}>#{index + 1}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text)', fontSize: '0.9rem' }}>
                    {item.statement}
                  </span>
                </div>
                <button onClick={() => onRemove(item.id)} title="Xóa khỏi giỏ" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', marginLeft: '1rem', flexShrink: 0 }}>
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
