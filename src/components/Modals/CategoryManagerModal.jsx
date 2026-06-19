import React, { useMemo } from 'react';
import { X, FolderTree } from 'lucide-react';
import { useTaxonomy } from '../../hooks/useTaxonomy';

// =============================================================================
// CategoryManagerModal — màn hình "Quản lý phân loại"
// Task 6: khung modal + hiển thị cây phân loại (chỉ xem). Các nút sửa/thêm/xóa,
// thang độ khó và danh sách lớp sẽ được bổ sung ở Task 7-9.
// =============================================================================

// Một nút trong cây (đệ quy). Task 6: chỉ hiện tên + thụt lề theo tầng.
const CategoryNode = ({ node, childrenMap, depth }) => {
  const children = childrenMap[node.id] || [];
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.4rem 0.6rem', paddingLeft: `${0.6 + depth * 1.4}rem`,
        borderRadius: '6px', fontSize: '0.95rem', color: '#1e293b',
      }}>
        <span style={{ color: depth === 0 ? '#2563eb' : '#94a3b8' }}>
          {depth === 0 ? '■' : '•'}
        </span>
        <span style={{ fontWeight: depth === 0 ? 700 : 500 }}>{node.name}</span>
      </div>
      {children.map(child => (
        <CategoryNode key={child.id} node={child} childrenMap={childrenMap} depth={depth + 1} />
      ))}
    </div>
  );
};

const CategoryManagerModal = ({ onClose }) => {
  const tax = useTaxonomy();
  const { categories } = tax;

  // Dựng map parent_id -> các con (đã sắp theo position) để render cây.
  const { childrenMap, roots } = useMemo(() => {
    const map = {};
    for (const c of categories) {
      const key = c.parent_id || 'ROOT';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    for (const k in map) map[k].sort((a, b) => a.position - b.position);
    return { childrenMap: map, roots: map['ROOT'] || [] };
  }, [categories]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px', height: '80vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FolderTree size={22} color="#2563eb" /> Quản lý phân loại
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>

        {/* Body: 2 cột — trái là cây phân loại, phải dành cho độ khó/lớp (Task 8-9) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Cột trái: CÂY PHÂN LOẠI */}
          <div style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid #f1f5f9' }}>
              Cây chuyên đề
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
              {roots.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '1rem', textAlign: 'center' }}>
                  Chưa có hệ nào. (Lần đầu chạy app sẽ tự tạo 4 hệ mặc định.)
                </div>
              ) : (
                roots.map(node => (
                  <CategoryNode key={node.id} node={node} childrenMap={childrenMap} depth={0} />
                ))
              )}
            </div>
          </div>

          {/* Cột phải: placeholder cho Thang độ khó (Task 8) & Lớp (Task 9) */}
          <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.25rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            Chọn một hệ để xem thang độ khó. (Sắp có)
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Đóng</button>
        </div>

      </div>
    </div>
  );
};

export default CategoryManagerModal;
