import React, { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useTaxonomy, getDescendantIds } from '../hooks/useTaxonomy';
import { groupClassificationByHe } from '../utils/classification';
import { useToast } from '../hooks/useToast';
import ProblemCard from './ProblemCard';

// ==========================================
// FEED THẺ CHÍNH (cuộn vô tận với Virtuoso)
// ==========================================
const DataGrid = ({
  problems, sortBy, filterTopic, filterGrade, filterDifficulty, searchTerm, selectedIds,
  onSelectChange, onPreviewClick, onAddToCart, onDelete, onEdit,
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
  }, [problems, sortBy, validBranchIds, filterGrade, filterDifficulty, searchTerm]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', overflow: 'hidden' }}>

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
