import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useTaxonomy, getDescendantIds } from '../hooks/useTaxonomy';
import { groupClassificationByHe, buildRootHeMap } from '../utils/classification';
import { useToast } from '../hooks/useToast';
import ProblemCard from './ProblemCard';
import { makeSearchFields, matchFields } from '../utils/searchText';
import { rangeIds, unionSelection, clampIndex } from '../utils/feedSelection';
import { parseTags, matchTagFilter } from '../utils/tagUtils';

// ==========================================
// FEED THẺ CHÍNH (cuộn vô tận với Virtuoso)
// ==========================================
const DataGrid = ({
  problems, sortBy, filterTopic, filterGrade, filterDifficulty, searchTerm, selectedHe, unclassifiedMode, selectedIds,
  recentUsageByProblemId, onlyUnused, filterTags = [], filterTagMode = 'and',
  onSelectChange, onSetSelection, onPreviewClick, onAddToCart, onDelete, onEdit,
  onBulkAddToCart, onBulkDelete, onClearSelection, onExitUnclassified,
}) => {

  // Tra cứu phân loại để (1) lọc theo nhánh + nhánh con, (2) dựng đường cây/độ khó/lớp trên thẻ.
  const { categories, difficulties, grades } = useTaxonomy();
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const diffById = useMemo(() => Object.fromEntries(difficulties.map((d) => [d.id, d])), [difficulties]);
  const gradeById = useMemo(() => Object.fromEntries(grades.map((g) => [g.id, g])), [grades]);
  const parentMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.parent_id])), [categories]);
  // Bảng tra "nhánh -> hệ gốc" tính sẵn (một lần khi cây đổi), để lọc theo hệ khỏi leo cây mỗi lần.
  const rootHeByCatId = useMemo(() => buildRootHeMap(parentMap), [parentMap]);
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

  // Chỉ mục tìm kiếm: chuẩn hóa (bỏ dấu) đề + lời giải + tag của mỗi bài, nhớ lại
  // — chỉ tính lại khi kho đổi (không tính mỗi phím gõ).
  const searchIndex = useMemo(
    () => new Map(problems.map((p) => [p.id, makeSearchFields(p)])),
    [problems]
  );

  const filteredAndSorted = useMemo(() => {
    let filtered = problems.filter(p => {
      if (searchTerm && !matchFields(searchIndex.get(p.id), searchTerm).matched) return false;
      // GĐ3 — chế độ "chưa phân loại" đè mọi lọc khác: chỉ bài có 0 phân loại.
      if (unclassifiedMode) return (p.categoryIds || []).length === 0;
      // GĐ3 — khoá 1 hệ: chỉ giữ bài có nhánh leo về gốc đúng hệ đang chọn.
      if (!unclassifiedMode && selectedHe &&
          !(p.categoryIds || []).some((cid) => (rootHeByCatId[cid] ?? cid) === selectedHe)) return false;
      if (validBranchIds && !(p.categoryIds || []).some((id) => validBranchIds.has(id))) return false;
      if (filterGrade !== 'all' && !(p.gradeIds || []).includes(filterGrade)) return false;
      if (filterDifficulty !== 'all' && !Object.values(p.difficultyByHe || {}).includes(filterDifficulty)) return false;
      if (!matchTagFilter(parseTags(p.tags), filterTags, filterTagMode)) return false;
      if (onlyUnused && recentUsageByProblemId[p.id]) return false;
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
  }, [problems, sortBy, validBranchIds, filterGrade, filterDifficulty, searchTerm, selectedHe, unclassifiedMode, rootHeByCatId, searchIndex, onlyUnused, recentUsageByProblemId, filterTags, filterTagMode]);

  // Nhãn "khớp ở đâu" cho các bài đang hiển thị (chỉ khi đang tìm).
  const matchFieldsById = useMemo(() => {
    const map = {};
    if (!searchTerm) return map;
    for (const p of filteredAndSorted) {
      const r = matchFields(searchIndex.get(p.id), searchTerm);
      if (r.hitFields.length) map[p.id] = r.hitFields;
    }
    return map;
  }, [filteredAndSorted, searchIndex, searchTerm]);

  // Khung sáng ("thẻ đang ngắm") + mốc cho chọn dải.
  const [activeIndex, setActiveIndex] = useState(-1);
  const [anchorIndex, setAnchorIndex] = useState(-1);
  const ids = useMemo(() => filteredAndSorted.map((p) => p.id), [filteredAndSorted]);
  const virtuosoRef = useRef(null);   // để cuộn thẻ đang ngắm vào tầm nhìn
  const feedWrapRef = useRef(null);   // khung nhận phím (tabIndex)

  // Đổi bộ lọc/tìm/sắp xếp -> khung sáng về đầu danh sách.
  useEffect(() => {
    setActiveIndex(filteredAndSorted.length ? 0 : -1);
    setAnchorIndex(-1);
  }, [filteredAndSorted]);

  // Cuộn thẻ đang ngắm vào tầm nhìn mỗi khi nó đổi.
  useEffect(() => {
    if (activeIndex >= 0) virtuosoRef.current?.scrollIntoView({ index: activeIndex });
  }, [activeIndex]);

  // Tự lấy tiêu điểm khung feed khi vào màn (để gõ phím ngay).
  useEffect(() => { feedWrapRef.current?.focus(); }, []);

  // Bấm thẻ: Shift = gộp dải từ mốc; thường = tick/bỏ 1 thẻ và đặt mốc mới.
  const handleCardClick = (index, e) => {
    if (e.shiftKey && anchorIndex >= 0) {
      onSetSelection(unionSelection(selectedIds, rangeIds(ids, anchorIndex, index)));
      setActiveIndex(index);
      window.getSelection()?.removeAllRanges(); // lau vùng bôi đen text (nếu có) khi Shift-chọn dải
    } else {
      onSelectChange(ids[index]);
      setAnchorIndex(index);
      setActiveIndex(index);
    }
    feedWrapRef.current?.focus(); // giữ tiêu điểm để gõ phím tiếp
  };

  // Điều hướng bàn phím trong feed (khung có tabIndex nhận sự kiện).
  const onKeyDown = (e) => {
    const n = ids.length;
    if (n === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const cur = activeIndex < 0 ? 0 : activeIndex;
      const next = clampIndex(cur + (e.key === 'ArrowDown' ? 1 : -1), n);
      if (e.shiftKey && anchorIndex >= 0) {
        onSetSelection(unionSelection(selectedIds, rangeIds(ids, anchorIndex, next)));
      }
      setActiveIndex(next);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (activeIndex >= 0) { onSelectChange(ids[activeIndex]); setAnchorIndex(activeIndex); }
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) onPreviewClick(filteredAndSorted[activeIndex]);
    } else if ((e.key === 'a' || e.key === 'A') && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      onSetSelection([...ids]); // chọn tất cả bài đang hiện (theo bộ lọc)
    }
  };

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

      {unclassifiedMode && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 16px 8px',
          padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-amber-bg)', color: 'var(--color-amber-text)' }}>
          <span>Đang xem: Bài chưa phân loại</span>
          <button className="card-btn" onClick={onExitUnclassified}>✕ Thoát</button>
        </div>
      )}

      <div
        ref={feedWrapRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }} // chặn bôi đen text khi Shift-bấm chọn dải
        style={{ flex: 1, minHeight: 0, outline: 'none' }}
      >
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
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
                active={index === activeIndex}
                matchFields={matchFieldsById[problem.id]}
                recentUsage={recentUsageByProblemId[problem.id] || null}
                onSelect={(e) => handleCardClick(index, e)}
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
      </div>

      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Tổng cộng <strong style={{ color: 'var(--color-text)' }}>{filteredAndSorted.length}</strong> bài thỏa điều kiện.
      </div>

    </div>
  );
};

export default DataGrid;
