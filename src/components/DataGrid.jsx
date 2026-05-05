import React, { useMemo } from 'react';
import { Eye, ShoppingCart, Trash2, Edit3 } from 'lucide-react';
import { TableVirtuoso } from 'react-virtuoso';

// ==========================================
// COMPONENT BẢNG CHÍNH (Cuộn vô hạn với Virtuoso)
// ==========================================
const DataGrid = ({
  problems, sortBy, filterTopic, filterLevel, searchTerm, selectedIds,
  onSelectChange, onSelectAll, onPreviewClick, onAddToCart, onDelete, onEdit
}) => {
  
  const filteredAndSorted = useMemo(() => {
    let filtered = problems.filter(p => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!p.statement.toLowerCase().includes(search) && !(p.tags && p.tags.toLowerCase().includes(search))) return false;
      }
      if (filterTopic !== 'all' && p.topic !== filterTopic) return false;
      if (filterLevel !== 'all' && p.level !== parseInt(filterLevel)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-new': return new Date(b.dateAdded) - new Date(a.dateAdded);
        case 'date-old': return new Date(a.dateAdded) - new Date(b.dateAdded);
        case 'difficulty-easy': return a.level - b.level;
        case 'difficulty-hard': return b.level - a.level;
        default: return 0;
      }
    });
  }, [problems, sortBy, filterTopic, filterLevel, searchTerm]);

  const isAllSelected = filteredAndSorted.length > 0 && filteredAndSorted.every(p => selectedIds.includes(p.id));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', overflow: 'hidden' }}>
      
      <TableVirtuoso
        style={{ flex: 1 }}
        data={filteredAndSorted}
        fixedHeaderContent={() => (
          <tr style={{ backgroundColor: '#f8fafc', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
            <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', width: '5%', textAlign: 'center' }}>
              <input 
                type="checkbox" 
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked, filteredAndSorted.map(p => p.id))}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                title="Chọn tất cả bài đang hiển thị"
              />
            </th>
            <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', width: '45%', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>Trích dẫn đề bài</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', width: '15%', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>Chuyên đề</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', width: '15%', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>Độ khó</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', width: '20%', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Thao tác</th>
          </tr>
        )}
        itemContent={(index, problem) => {
          const isSelected = selectedIds.includes(problem.id);
          const tdStyle = { padding: '1rem', backgroundColor: isSelected ? '#f1f8ff' : 'transparent', borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s' };
          
          return (
            <>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <input type="checkbox" checked={isSelected} onChange={() => onSelectChange(problem.id)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
              </td>
              <td style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => onPreviewClick(problem)}>
                <div style={{ fontWeight: 500, color: '#334155', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                  {problem.statement}
                </div>
                {problem.tags && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {problem.tags.split(',').map(t => `#${t.trim()}`).join(' ')}
                  </div>
                )}
              </td>
              <td style={tdStyle}>
                <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{problem.topic}</span>
              </td>
              <td style={tdStyle}>
                <span style={{ padding: '0.25rem 0.5rem', backgroundColor: problem.level === 3 ? '#fee2e2' : problem.level === 2 ? '#fef08a' : '#dcfce3', color: problem.level === 3 ? '#991b1b' : problem.level === 2 ? '#9a3412' : '#166534', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                  Level {problem.level}
                </span>
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <button onClick={() => onPreviewClick(problem)} title="Xem chi tiết" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', marginRight: '0.75rem' }}><Eye size={18} /></button>
                <button onClick={() => onAddToCart(problem)} title="Thêm vào Giỏ đề thi" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', marginRight: '0.75rem' }}><ShoppingCart size={18} /></button>
                <button onClick={() => onEdit(problem)} title="Sửa bài" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', marginRight: '0.75rem' }}><Edit3 size={18} /></button>
                <button onClick={() => onDelete(problem.id)} title="Xóa bài" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={18} /></button>
              </td>
            </>
          );
        }}
      />

      <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Tổng cộng tìm thấy <strong style={{ color: '#0f172a' }}>{filteredAndSorted.length}</strong> bài tập thỏa mãn điều kiện.
        </div>
      </div>

    </div>
  );
};

export default DataGrid;