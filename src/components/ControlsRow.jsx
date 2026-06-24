import React from 'react';
import { Search } from 'lucide-react';

// Thanh đỉnh feed: chỉ còn Ô TÌM + SẮP XẾP (GĐ3).
// Lọc chuyên đề/độ khó/lớp đã chuyển sang FilterSidebar (cột lọc hệ-first).
const ControlsRow = ({ searchTerm, onSearchChange, sortBy, onSortChange, searchInputRef }) => {
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '1rem 2rem', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>

      {/* Ô Tìm kiếm (Ctrl+F qua searchInputRef) */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-muted)', padding: '0.5rem 1rem', borderRadius: '8px', flex: 1, minWidth: '250px' }}>
        <Search size={18} color="var(--color-text-muted)" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Tìm kiếm theo ID, từ khóa, tag... (Ctrl + F)"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ border: 'none', background: 'transparent', marginLeft: '0.5rem', width: '100%', color: 'var(--color-text)' }}
        />
      </div>

      {/* Sắp xếp */}
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        style={{ padding: '0.5rem 1rem', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)', backgroundColor: 'var(--color-surface)', cursor: 'pointer' }}
      >
        <option value="date-new">Mới nhất trước</option>
        <option value="date-old">Cũ nhất trước</option>
        <option value="difficulty-easy">Dễ đến khó</option>
        <option value="difficulty-hard">Khó đến dễ</option>
      </select>

    </div>
  );
};

export default ControlsRow;
