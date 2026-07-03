import React, { useMemo } from 'react';
import { useTaxonomy, getDescendantIds } from '../hooks/useTaxonomy';

// ==========================================
// MÀN THỐNG KÊ TỔNG QUAN — mặc định khi mở app.
// Đếm bài theo Hệ + theo nhánh chủ đề cấp 1 (gộp cả nhánh con bên trong).
// Bấm vào một số = nhảy sang "Bài" đã lọc đúng hệ/nhánh đó.
// ==========================================
const DashboardPage = ({ problems, onNavigateToHe, onNavigateToBranch, onNavigateToUnclassified }) => {
  const { categories } = useTaxonomy();

  const heList = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position),
    [categories]
  );
  // childrenMap: parent_id -> [id con], để getDescendantIds gộp cả nhánh con khi đếm.
  const childrenMap = useMemo(() => {
    const m = {};
    for (const c of categories) {
      if (!c.parent_id) continue;
      (m[c.parent_id] = m[c.parent_id] || []).push(c.id);
    }
    return m;
  }, [categories]);

  const countInSet = (ids) => {
    const set = new Set(ids);
    return problems.filter((p) => (p.categoryIds || []).some((cid) => set.has(cid))).length;
  };
  const unclassifiedCount = problems.filter((p) => (p.categoryIds || []).length === 0).length;

  const cardStyle = { padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: 'var(--color-text)' }}>Thống kê tổng quan</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 720 }}>
        <div style={cardStyle}>
          <div style={rowStyle} onClick={onNavigateToUnclassified} title="Bấm để xem bài chưa phân loại">
            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Chưa phân loại</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-amber)' }}>{unclassifiedCount}</span>
          </div>
        </div>

        {heList.map((he) => {
          const heIds = getDescendantIds(he.id, childrenMap);
          const branches = (childrenMap[he.id] || [])
            .map((id) => categories.find((c) => c.id === id))
            .filter(Boolean)
            .sort((a, b) => a.position - b.position);

          return (
            <div key={he.id} style={cardStyle}>
              <div
                style={{ ...rowStyle, marginBottom: branches.length ? '0.9rem' : 0, paddingBottom: branches.length ? '0.9rem' : 0, borderBottom: branches.length ? '1px solid var(--color-border-subtle)' : 'none' }}
                onClick={() => onNavigateToHe(he.id)}
                title={`Bấm để xem bài thuộc ${he.name}`}
              >
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)' }}>{he.name}</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-cobalt)' }}>{countInSet(heIds)}</span>
              </div>

              {branches.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Hệ này chưa có nhánh chủ đề nào.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {branches.map((b) => (
                    <div
                      key={b.id}
                      style={{ ...rowStyle, fontSize: '0.9rem', padding: '0.15rem 0' }}
                      onClick={() => onNavigateToBranch(he.id, b.id)}
                      title={`Bấm để xem bài thuộc nhánh ${b.name}`}
                    >
                      <span style={{ color: 'var(--color-text-muted)' }}>{b.name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{countInSet(getDescendantIds(b.id, childrenMap))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardPage;
