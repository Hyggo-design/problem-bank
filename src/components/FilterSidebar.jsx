import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { useTaxonomy } from '../hooks/useTaxonomy';

// ==========================================
// CỘT LỌC HỆ-FIRST (cột 2). Khoá 1 hệ → cây + độ khó của riêng hệ đó.
// ==========================================
const FilterSidebar = ({
  selectedHe, onSelectHe,
  filterTopic, onSelectBranch,
  filterDifficulty, onDifficulty,
  filterGrade, onGrade,
  onClear, onCollapse,
}) => {
  const { categories, difficulties, grades } = useTaxonomy();
  const [expanded, setExpanded] = useState({});

  const roots = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position),
    [categories]
  );
  const heLevels = useMemo(
    () => difficulties.filter((d) => d.he_id === selectedHe),
    [difficulties, selectedHe]
  );
  // childrenMap: parent_id ('ROOT' cho gốc) -> [node] đã sắp theo position.
  const childrenMap = useMemo(() => {
    const m = {};
    for (const c of categories) {
      const key = c.parent_id || 'ROOT';
      (m[key] = m[key] || []).push(c);
    }
    for (const k in m) m[k].sort((a, b) => a.position - b.position);
    return m;
  }, [categories]);

  // Vẽ đệ quy cây con của một nút. Bấm tên = lọc theo nhánh (gồm nhánh con).
  const renderNodes = (parentId, depth) =>
    (childrenMap[parentId] || []).map((node) => {
      const kids = childrenMap[node.id] || [];
      const open = expanded[node.id];
      return (
        <div key={node.id}>
          <div className={`tree-row ${filterTopic === node.id ? 'on' : ''}`} style={{ paddingLeft: 7 + depth * 14 }}>
            {kids.length > 0 ? (
              <button
                onClick={() => setExpanded((e) => ({ ...e, [node.id]: !e[node.id] }))}
                aria-label={open ? 'Gập nhánh' : 'Mở nhánh'}
                style={{ border: 'none', background: 'transparent', padding: 0, display: 'flex', color: 'var(--color-text-subtle)' }}
              >
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span style={{ width: 14, flex: 'none' }} />
            )}
            <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => onSelectBranch(node.id)}>{node.name}</span>
          </div>
          {open && renderNodes(node.id, depth + 1)}
        </div>
      );
    });

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

      {/* Cây chuyên đề (của riêng hệ đang chọn) */}
      <div>
        <div className="sidebar-label">Cây chuyên đề</div>
        <div
          className={`tree-row ${filterTopic === 'all' ? 'on' : ''}`}
          style={{ cursor: 'pointer', paddingLeft: 7 }}
          onClick={() => onSelectBranch('all')}
        >
          Tất cả chuyên đề của hệ
        </div>
        {selectedHe && renderNodes(selectedHe, 0)}
      </div>

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
