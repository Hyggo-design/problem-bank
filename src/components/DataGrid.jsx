import React, { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useTaxonomy, getDescendantIds, getRootHeId } from '../hooks/useTaxonomy';
import { groupClassificationByHe } from '../utils/classification';
import { useToast } from '../hooks/useToast';
import ProblemCard from './ProblemCard';

// ==========================================
// FEED THẺ CHÍNH (cuộn vô tận với Virtuoso)
// ==========================================
const DataGrid = ({
  problems, sortBy, filterTopic, filterGrade, filterDifficulty, searchTerm, selectedHe, unclassifiedMode, selectedIds,
  onSelectChange, onPreviewClick, onAddToCart, onDelete, onEdit,
  onBulkAddToCart, onBulkDelete, onClearSelection,
}) => {

  // Tra cứu phân loại để (1) lọc theo nhánh + nhánh con, (2) dựng đường cây/độ khó/lớp trên thẻ.
  const { categories, difficulties, grades } = useTaxonomy();
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const diffById = useMemo(() => Object.fromEntries(difficulties.map((d) => [d.id, d])), [difficulties]);
  const gradeById = useMemo(() => Object.fromEntries(grades.map((g) => [g.id, g])), [grades]);
  const parentMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.parent_id])), [categories]);
  const { success } = useToast();

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
      // GĐ3 — khoá 1 hệ: chỉ giữ bài có nhánh leo về gốc đúng hệ đang chọn.
      if (!unclassifiedMode && selectedHe &&
          !(p.categoryIds || []).some((cid) => getRootHeId(cid, parentMap) === selectedHe)) return false;
      if (validBranchIds && !(p.categoryIds || []).some((id) => validBranchIds.has(id))) return false;
      if (filterGrade !== 'all' && !(p.gradeIds || []).includes(filterGrade)) return false;
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
  }, [problems, sortBy, validBranchIds, filterGrade, filterDifficulty, searchTerm, selectedHe, unclassifiedMode, parentMap]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' }}>

      {/* Thanh hành động hàng loạt — sáng lên khi có bài được chọn */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, margin: '12px 16px',
        padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)',
      }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          {selectedIds.length > 0 ? `Đã chọn ${selectedIds.length} bài` : 'Bấm vào thẻ để chọn — nút hàng loạt sẽ sáng lên'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="card-btn card-btn-primary" disabled={selectedIds.length === 0} onClick={onBulkAddToCart}>
            <ShoppingCart size={16} /> Thêm {selectedIds.length || ''} vào giỏ
          </button>
          <button className="card-btn card-btn-danger" disabled={selectedIds.length === 0} onClick={onBulkDelete}>
            <Trash2 size={16} /> Xoá {selectedIds.length || ''}
          </button>
          <button className="card-btn" disabled={selectedIds.length === 0} onClick={onClearSelection}>Bỏ chọn</button>
        </div>
      </div>

      <Virtuoso
        style={{ flex: 1 }}
        data={filteredAndSorted}
        components={{
          EmptyPlaceholder: () => (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
              {problems.length === 0
                ? 'Chưa có bài nào. Bấm "+ Thêm bài tập" để bắt đầu.'
                : 'Không có bài nào khớp bộ lọc'}
            </div>
          ),
        }}
        itemContent={(index, problem) => {
          const classification = groupClassificationByHe(problem, catById, parentMap, diffById);
          const gradeNames = (problem.gradeIds || []).map((id) => gradeById[id]?.name).filter(Boolean);
          return (
            <div style={{ padding: '0 16px' }}>
              <ProblemCard
                problem={{ ...problem, gradeNames }}
                classification={classification}
                selected={selectedIds.includes(problem.id)}
                onToggleSelect={() => onSelectChange(problem.id)}
                onPreview={() => onPreviewClick(problem)}
                onAddToCart={() => onAddToCart(problem)}
                onEdit={() => onEdit(problem)}
                onDelete={() => onDelete(problem.id)}
                onCopied={() => success('Đã chép mã LaTeX')}
              />
            </div>
          );
        }}
      />

      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Tổng cộng <strong style={{ color: 'var(--color-text)' }}>{filteredAndSorted.length}</strong> bài thỏa điều kiện.
      </div>

    </div>
  );
};

export default DataGrid;
