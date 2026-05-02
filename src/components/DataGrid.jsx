import React, { useMemo } from 'react';
import { Eye, ShoppingCart, Trash2, Edit3 } from 'lucide-react';

// ==========================================
// 1. TẠO COMPONENT CON ĐỂ HIỂN THỊ TỪNG DÒNG
// (Được bọc bởi React.memo để chống giật lag)
// ==========================================
const ProblemRow = React.memo(({ 
  problem, 
  isSelected, 
  onSelectChange, 
  onPreviewClick, 
  onAddToCart, 
  onDelete, 
  onEdit 
}) => {
  return (
    <tr style={{ backgroundColor: isSelected ? '#f1f8ff' : 'transparent', borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s' }}>
      
      {/* Ô Tick chọn */}
      <td style={{ padding: '1rem' }}>
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => onSelectChange(problem.id)}
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
      </td>

      {/* Trích dẫn đề (Chỉ hiện 2 dòng) */}
      <td style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => onPreviewClick(problem)}>
        <div style={{ fontWeight: 500, color: '#334155', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {problem.statement}
        </div>
        {problem.tags && (
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            {problem.tags.split(',').map(t => `#${t.trim()}`).join(' ')}
          </div>
        )}
      </td>

      {/* Nhãn Chủ đề & Độ khó */}
      <td style={{ padding: '1rem' }}>
        <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
          {problem.topic}
        </span>
      </td>
      <td style={{ padding: '1rem' }}>
        <span style={{ padding: '0.25rem 0.5rem', backgroundColor: problem.level === 3 ? '#fee2e2' : problem.level === 2 ? '#fef08a' : '#dcfce3', color: problem.level === 3 ? '#991b1b' : problem.level === 2 ? '#9a3412' : '#166534', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
          Level {problem.level}
        </span>
      </td>

      {/* Các nút thao tác */}
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <button onClick={() => onPreviewClick(problem)} title="Xem chi tiết" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', marginRight: '0.75rem' }}>
          <Eye size={18} />
        </button>
        <button onClick={() => onAddToCart(problem)} title="Thêm vào Giỏ đề thi" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', marginRight: '0.75rem' }}>
          <ShoppingCart size={18} />
        </button>
        <button onClick={() => onEdit(problem)} title="Sửa bài" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', marginRight: '0.75rem' }}>
          <Edit3 size={18} />
        </button>
        <button onClick={() => onDelete(problem.id)} title="Xóa bài" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
});

// ==========================================
// 2. COMPONENT BẢNG CHÍNH (Đã được làm gọn)
// ==========================================
const DataGrid = ({
  problems,
  sortBy,
  filterTopic,
  filterLevel,
  searchTerm,
  selectedIds,
  onSelectChange,
  onSelectAll,
  onPreviewClick,
  onAddToCart,
  onDelete,
  onEdit
}) => {
  // Bộ não lọc và sắp xếp dữ liệu tự động
  const filteredAndSorted = useMemo(() => {
    let filtered = problems.filter(p => {
      // Lọc theo tìm kiếm
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!p.statement.toLowerCase().includes(search) &&
            !(p.tags && p.tags.toLowerCase().includes(search))) {
          return false;
        }
      }
      // Lọc theo Topic & Level
      if (filterTopic !== 'all' && p.topic !== filterTopic) return false;
      if (filterLevel !== 'all' && p.level !== parseInt(filterLevel)) return false;
      return true;
    });

    // Sắp xếp
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

  // Kiểm tra xem đã "Chọn tất cả" các câu đang hiển thị chưa
  const isAllSelected = filteredAndSorted.length > 0 && selectedIds.length === filteredAndSorted.length;

  return (
    <div className="data-table-container" style={{ flex: 1, overflowY: 'auto', backgroundColor: '#fff' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        
        {/* TIÊU ĐỀ BẢNG */}
        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 10 }}>
          <tr>
            <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', width: '5%' }}>
              <input 
                type="checkbox" 
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked, filteredAndSorted.map(p => p.id))}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
            </th>
            <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', width: '45%', color: '#64748b', fontWeight: 600 }}>Trích dẫn đề bài</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', width: '15%', color: '#64748b', fontWeight: 600 }}>Chuyên đề</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', width: '15%', color: '#64748b', fontWeight: 600 }}>Độ khó</th>
            <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', width: '20%', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Thao tác</th>
          </tr>
        </thead>

        {/* NỘI DUNG BẢNG */}
        <tbody>
          {filteredAndSorted.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                📭 Không tìm thấy bài tập nào phù hợp.
              </td>
            </tr>
          ) : (
            filteredAndSorted.map(problem => (
              // Gọi Component con thay vì viết nguyên cục HTML dài dòng
              <ProblemRow 
                key={problem.id}
                problem={problem}
                isSelected={selectedIds.includes(problem.id)}
                onSelectChange={onSelectChange}
                onPreviewClick={onPreviewClick}
                onAddToCart={onAddToCart}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataGrid;