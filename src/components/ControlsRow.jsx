import React, { useMemo } from 'react';
import { Search } from 'lucide-react';
import { useTaxonomy } from '../hooks/useTaxonomy';

const ControlsRow = ({
  searchTerm,
  onSearchChange,
  filterTopic,
  onFilterTopicChange,
  filterLevel,
  onFilterLevelChange,
  sortBy,
  onSortChange,
  searchInputRef
}) => {
  // Task 15: danh sách chuyên đề lấy từ cây phân loại (useTaxonomy), làm phẳng theo
  // thứ tự cây + ghi độ sâu để thụt lề — Thầy chọn đúng nhánh muốn lọc.
  const { categories } = useTaxonomy();
  const flatTopics = useMemo(() => {
    const childrenMap = {};
    for (const c of categories) {
      const key = c.parent_id || 'ROOT';
      (childrenMap[key] = childrenMap[key] || []).push(c);
    }
    for (const k in childrenMap) childrenMap[k].sort((a, b) => a.position - b.position);
    const out = [];
    const walk = (nodes, depth) => {
      for (const n of nodes) {
        out.push({ id: n.id, name: n.name, depth });
        walk(childrenMap[n.id] || [], depth + 1);
      }
    };
    walk(childrenMap['ROOT'] || [], 0);
    return out;
  }, [categories]);

  // Thụt lề tên nhánh trong dropdown. Dùng nbsp ( ) vì trình duyệt nuốt khoảng
  // trắng thường ở đầu <option>.
  const indentLabel = (t) =>
    t.depth > 0 ? '  '.repeat(t.depth - 1) + '└ ' + t.name : t.name;

  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '1rem 2rem', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>

      {/* Ô Tìm kiếm (Kết nối với phím tắt Ctrl+F qua searchInputRef) */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '8px', flex: 1, minWidth: '250px' }}>
        <Search size={18} color="#64748b" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Tìm kiếm theo ID, từ khóa, tag... (Ctrl + F)"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '0.5rem', width: '100%', color: '#334155' }}
        />
      </div>

      {/* Lọc theo Chuyên đề (cây phân loại) */}
      <select
        value={filterTopic}
        onChange={(e) => onFilterTopicChange(e.target.value)}
        style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', color: '#334155', backgroundColor: '#fff', cursor: 'pointer' }}
      >
        <option value="all">Tất cả chuyên đề</option>
        {flatTopics.map(t => (
          <option key={t.id} value={t.id}>{indentLabel(t)}</option>
        ))}
      </select>

      {/* Lọc theo Độ khó */}
      <select
        value={filterLevel}
        onChange={(e) => onFilterLevelChange(e.target.value)}
        style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', color: '#334155', backgroundColor: '#fff', cursor: 'pointer' }}
      >
        <option value="all">Tất cả cấp độ</option>
        <option value="1">Level 1 - Cơ bản</option>
        <option value="2">Level 2 - Trung bình</option>
        <option value="3">Level 3 - Nâng cao</option>
      </select>

      {/* Sắp xếp dữ liệu */}
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', color: '#334155', backgroundColor: '#fff', cursor: 'pointer' }}
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
