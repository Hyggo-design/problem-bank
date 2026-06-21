import React, { useMemo } from 'react';
import { Eye, ShoppingCart, Trash2, Edit3 } from 'lucide-react';
import { TableVirtuoso } from 'react-virtuoso';
import { useTaxonomy, getDescendantIds } from '../hooks/useTaxonomy';
import LatexBlockRenderer from './LatexBlockRenderer';

// ==========================================
// COMPONENT BẢNG CHÍNH (Cuộn vô hạn với Virtuoso)
// ==========================================
const DataGrid = ({
  problems, sortBy, filterTopic, filterGrade, filterDifficulty, searchTerm, selectedIds,
  onSelectChange, onSelectAll, onPreviewClick, onAddToCart, onDelete, onEdit
}) => {
  
  // Task 15: tra cứu phân loại để (1) lọc theo nhánh + nhánh con, (2) hiển thị tên
  // chuyên đề & độ khó theo hệ ở các cột.
  const { categories, difficulties } = useTaxonomy();
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const diffById = useMemo(() => Object.fromEntries(difficulties.map((d) => [d.id, d])), [difficulties]);

  // childrenMap: parent_id -> [child id], để getDescendantIds lấy cả nhánh con khi lọc.
  const childrenMap = useMemo(() => {
    const m = {};
    for (const c of categories) {
      if (!c.parent_id) continue;
      (m[c.parent_id] = m[c.parent_id] || []).push(c.id);
    }
    return m;
  }, [categories]);

  // Tập nhánh hợp lệ khi lọc theo một chuyên đề = nhánh đó + mọi nhánh con.
  // null = không lọc theo chuyên đề (hiện tất cả).
  const validBranchIds = useMemo(() => {
    if (filterTopic === 'all') return null;
    return new Set(getDescendantIds(filterTopic, childrenMap));
  }, [filterTopic, childrenMap]);

  const filteredAndSorted = useMemo(() => {
    let filtered = problems.filter(p => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!p.statement.toLowerCase().includes(search) && !(p.tags && p.tags.toLowerCase().includes(search))) return false;
      }
      // Khớp nếu bài có ÍT NHẤT một nhánh nằm trong tập nhánh hợp lệ (gồm nhánh con).
      if (validBranchIds && !(p.categoryIds || []).some((id) => validBranchIds.has(id))) return false;
      // Task 16: lọc theo Lớp (gradeIds chứa lớp đã chọn).
      if (filterGrade !== 'all' && !(p.gradeIds || []).includes(filterGrade)) return false;
      // Task 16: lọc theo Độ khó (difficultyByHe có chứa mức đã chọn ở bất kỳ hệ nào).
      if (filterDifficulty !== 'all' && !Object.values(p.difficultyByHe || {}).includes(filterDifficulty)) return false;
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
  }, [problems, sortBy, validBranchIds, filterGrade, filterDifficulty, searchTerm]);

  const isAllSelected = filteredAndSorted.length > 0 && filteredAndSorted.every(p => selectedIds.includes(p.id));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', overflow: 'hidden' }}>
      
      <TableVirtuoso
        style={{ flex: 1 }}
        data={filteredAndSorted}
        components={{
          EmptyPlaceholder: () => (
            <tbody>
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                {problems.length === 0
                  ? 'Chưa có bài nào. Bấm "+ Thêm bài tập" để bắt đầu.'
                  : 'Không có bài nào khớp bộ lọc. Thử nới bộ lọc hoặc xoá ô tìm kiếm.'}
              </td></tr>
            </tbody>
          )
        }}
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

          // Task 15: tên nhánh đã gắn + độ khó theo hệ (bỏ qua id mồ côi).
          const catNames = (problem.categoryIds || []).map((id) => catById[id]).filter(Boolean);
          const diffList = Object.values(problem.difficultyByHe || {}).map((did) => diffById[did]).filter(Boolean);

          return (
            <>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <input type="checkbox" checked={isSelected} onChange={() => onSelectChange(problem.id)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
              </td>
              <td style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => onPreviewClick(problem)}>
                <div style={{ color: 'var(--color-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                  <LatexBlockRenderer text={problem.statement} />
                </div>
                {problem.tags && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {problem.tags.split(',').map(t => `#${t.trim()}`).join(' ')}
                  </div>
                )}
              </td>
              <td style={tdStyle}>
                {catNames.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {catNames.map((c) => (
                      <span key={c.id} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{c.name}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>Chưa phân loại</span>
                )}
              </td>
              <td style={tdStyle}>
                {diffList.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {diffList.map((d) => (
                      <span key={d.id} title={catById[d.he_id]?.name || ''} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{d.name}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                )}
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