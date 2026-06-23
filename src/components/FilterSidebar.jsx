import React, { useMemo } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { useTaxonomy } from '../hooks/useTaxonomy';

// ==========================================
// CỘT LỌC HỆ-FIRST (cột 2). Khoá 1 hệ → cây + độ khó của riêng hệ đó.
// (Cây chuyên đề được thêm ở Task 6 tại chỗ đánh dấu.)
// ==========================================
const FilterSidebar = ({
  selectedHe, onSelectHe,
  filterDifficulty, onDifficulty,
  filterGrade, onGrade,
  onClear, onCollapse,
}) => {
  const { categories, difficulties, grades } = useTaxonomy();
  const roots = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position),
    [categories]
  );
  const heLevels = useMemo(
    () => difficulties.filter((d) => d.he_id === selectedHe),
    [difficulties, selectedHe]
  );

  return (
    <aside className="filter-sidebar">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="rail-item" onClick={onCollapse} aria-label="Gập cột lọc" style={{ padding: 4, flex: 'none' }}>
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Dải tab hệ */}
      <div className="he-tabs">
        {roots.map((he) => (
          <button key={he.id} className={`he-tab ${selectedHe === he.id ? 'on' : ''}`} onClick={() => onSelectHe(he.id)}>
            {he.name}
          </button>
        ))}
      </div>

      {/* === CHÈN CÂY CHUYÊN ĐỀ Ở TASK 6 (ngay dưới dòng này) === */}

      {/* Độ khó (của hệ) */}
      <div>
        <div className="sidebar-label">Độ khó (của hệ)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button className={`chip ${filterDifficulty === 'all' ? 'on' : ''}`} onClick={() => onDifficulty('all')}>Tất cả</button>
          {heLevels.map((lv) => (
            <button key={lv.id} className={`chip ${filterDifficulty === lv.id ? 'on' : ''}`} onClick={() => onDifficulty(lv.id)}>
              {lv.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lớp (dùng chung mọi hệ) */}
      <div>
        <div className="sidebar-label">Lớp</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button className={`chip ${filterGrade === 'all' ? 'on' : ''}`} onClick={() => onGrade('all')}>Tất cả</button>
          {grades.map((g) => (
            <button key={g.id} className={`chip ${filterGrade === g.id ? 'on' : ''}`} onClick={() => onGrade(g.id)}>
              {g.name}
            </button>
          ))}
        </div>
      </div>

      <button className="card-btn" style={{ alignSelf: 'flex-start' }} onClick={onClear}>
        <X size={14} /> Xoá lọc
      </button>
    </aside>
  );
};

export default FilterSidebar;
