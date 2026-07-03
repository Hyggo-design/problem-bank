import React, { useMemo, useState } from 'react';
import { LayoutGrid, Plus, X, RefreshCw, Pencil, ShoppingCart } from 'lucide-react';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { useToast } from '../hooks/useToast';
import LatexBlockRenderer from './LatexBlockRenderer';
import { generateExamMatrix, countAvailableForCell, pickReplacementProblem } from '../utils/examMatrix';

// ==========================================
// TRANG "TẠO ĐỀ THEO MA TRẬN"
// Dựng ma trận Chủ đề × Mức độ trong 1 hệ (+ lọc lớp tuỳ chọn) -> app bốc câu ngẫu nhiên,
// né câu đã dùng <=30 ngày, không lặp trong 1 đề -> xem lại/đổi/bỏ -> "Đưa vào Giỏ đề".
// KHÔNG đụng đường xuất .tex: chỉ rót câu vào Giỏ (App lo phần thêm giỏ qua onAddManyToCart).
// ==========================================
const MatrixPage = ({ problems, recentUsageByProblemId, defaultHeId, onAddManyToCart }) => {
  const { categories, difficulties, grades } = useTaxonomy();
  const { info } = useToast();

  const roots = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position),
    [categories]
  );
  const [heId, setHeId] = useState(defaultHeId || null);
  const effectiveHeId = heId && roots.some((r) => r.id === heId) ? heId : (roots[0]?.id || null);

  const [gradeId, setGradeId] = useState('');          // '' = mọi lớp
  const [rows, setRows] = useState([]);                 // [{ rowId, categoryId, counts: { [diffId]: number } }]
  const [mode, setMode] = useState('build');            // 'build' | 'review'
  const [reviewCells, setReviewCells] = useState([]);   // [{ rowId, categoryId, difficultyId, requested, picked: [] }]
  const [addPick, setAddPick] = useState('');           // dropdown "Thêm chủ đề"

  // Bản đồ cây (dựng 1 lần)
  const parentMap = useMemo(() => {
    const m = {}; for (const c of categories) m[c.id] = c.parent_id; return m;
  }, [categories]);
  const childrenMap = useMemo(() => {
    const m = {}; for (const c of categories) { if (c.parent_id) (m[c.parent_id] = m[c.parent_id] || []).push(c.id); } return m;
  }, [categories]);
  const nameById = useMemo(() => {
    const m = {}; for (const c of categories) m[c.id] = c.name; return m;
  }, [categories]);
  const diffNameById = useMemo(() => {
    const m = {}; for (const d of difficulties) m[d.id] = d.name; return m;
  }, [difficulties]);

  const rootOf = (id) => { let cur = id; while (parentMap[cur]) cur = parentMap[cur]; return cur; };
  const pathWithinHe = (id) => {
    const names = []; let cur = id;
    while (cur && parentMap[cur]) { names.unshift(nameById[cur]); cur = parentMap[cur]; } // dừng ngay dưới nút hệ
    return names.join(' › ');
  };

  const heDifficulties = useMemo(
    () => difficulties.filter((d) => d.he_id === effectiveHeId).sort((a, b) => a.position - b.position),
    [difficulties, effectiveHeId]
  );
  const branchOptions = useMemo(() => {
    if (!effectiveHeId) return [];
    return categories
      .filter((c) => c.id !== effectiveHeId && rootOf(c.id) === effectiveHeId)
      .map((c) => ({ id: c.id, label: pathWithinHe(c.id) }))
      .filter((o) => o.label)
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, effectiveHeId, parentMap, nameById]);

  const recentUsageIds = useMemo(
    () => new Set(Object.keys(recentUsageByProblemId || {})),
    [recentUsageByProblemId]
  );

  // Đổi hệ: xoá dòng cũ (thuộc hệ cũ) + reset
  const changeHe = (newHeId) => { setHeId(newHeId); setRows([]); setReviewCells([]); setMode('build'); setAddPick(''); };

  // Thêm/bớt dòng chủ đề
  const addRow = (categoryId) => {
    if (!categoryId || rows.some((r) => r.categoryId === categoryId)) return;
    setRows((prev) => [...prev, { rowId: crypto.randomUUID(), categoryId, counts: {} }]);
  };
  const addAllLevel1 = () => {
    const level1 = childrenMap[effectiveHeId] || [];
    setRows((prev) => {
      const have = new Set(prev.map((r) => r.categoryId));
      const add = level1.filter((id) => !have.has(id)).map((id) => ({ rowId: crypto.randomUUID(), categoryId: id, counts: {} }));
      return [...prev, ...add];
    });
  };
  const removeRow = (rowId) => setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  const setCount = (rowId, diffId, value) => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, counts: { ...r.counts, [diffId]: n } } : r)));
  };

  const totalRequested = rows.reduce((s, r) => s + Object.values(r.counts).reduce((a, b) => a + (b || 0), 0), 0);

  // Tạo đề
  const runGenerate = () => {
    const res = generateExamMatrix({ problems, childrenMap, heId: effectiveHeId, gradeId: gradeId || null, rows, recentUsageIds });
    setReviewCells(res.cells.map((c) => ({ ...c })));
    setMode('review');
  };

  // Nút trong xem lại
  const excludeAll = () => new Set(reviewCells.flatMap((c) => c.picked.map((p) => p.id)));
  const swapOne = (cellIdx, problemId) => {
    const cell = reviewCells[cellIdx];
    const rep = pickReplacementProblem({
      problems, childrenMap, heId: effectiveHeId, gradeId: gradeId || null,
      categoryId: cell.categoryId, difficultyId: cell.difficultyId, excludeIds: excludeAll(), recentUsageIds,
    });
    if (!rep) { info('Không còn câu khác để đổi.'); return; }
    setReviewCells((prev) => prev.map((c, i) => (i === cellIdx ? { ...c, picked: c.picked.map((p) => (p.id === problemId ? rep : p)) } : c)));
  };
  const removeOne = (cellIdx, problemId) =>
    setReviewCells((prev) => prev.map((c, i) => (i === cellIdx ? { ...c, picked: c.picked.filter((p) => p.id !== problemId) } : c)));

  const pickedAll = () => {
    const seen = new Set(); const out = [];
    for (const c of reviewCells) for (const p of c.picked) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
    return out;
  };
  const handleAddToCart = () => {
    const all = pickedAll();
    if (all.length === 0) { info('Chưa có câu nào để đưa vào Giỏ.'); return; }
    onAddManyToCart(all);
  };

  // Styles nhỏ (dùng token màu chung)
  const wrap = { flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' };
  const th = { textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--color-border)' };
  const td = { padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--color-border-subtle)', verticalAlign: 'top' };
  const numInput = { width: 56, padding: '0.35rem', textAlign: 'center', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text)' };
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.45rem 0.9rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 600 };
  const ctaBtn = { ...btn, background: 'var(--color-amber)', color: 'var(--color-on-amber)', border: 'none' };
  const selBox = { padding: '0.4rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text)' };

  if (!effectiveHeId) {
    return <div style={wrap}><p style={{ color: 'var(--color-text-muted)' }}>Chưa có hệ nào. Hãy tạo hệ trong Cài đặt › Quản lý phân loại.</p></div>;
  }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <LayoutGrid size={22} color="var(--color-cobalt)" />
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text)' }}>Tạo đề theo ma trận</h2>
      </div>

      {/* Chọn hệ (dải tab) + lớp (tuỳ chọn) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {roots.map((r) => {
            const on = r.id === effectiveHeId;
            return (
              <button key={r.id} onClick={() => changeHe(r.id)}
                style={{ ...btn, padding: '0.35rem 0.8rem',
                  background: on ? 'var(--color-cobalt)' : 'var(--color-surface)',
                  color: on ? '#fff' : 'var(--color-text)', border: on ? 'none' : '1px solid var(--color-border)' }}>
                {r.name}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Lớp:</span>
          <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} style={selBox}>
            <option value="">Tất cả lớp</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {mode === 'build' ? (
        heDifficulties.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            Hệ này chưa có mức độ khó — hãy thêm trong Cài đặt › Quản lý phân loại.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              <select value={addPick} onChange={(e) => setAddPick(e.target.value)} style={{ ...selBox, minWidth: 220 }}>
                <option value="">— Chọn chủ đề —</option>
                {branchOptions.filter((o) => !rows.some((r) => r.categoryId === o.id)).map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <button style={btn} onClick={() => { addRow(addPick); setAddPick(''); }}><Plus size={16} /> Thêm chủ đề</button>
              <button style={btn} onClick={addAllLevel1}>Thêm tất cả nhánh cấp 1</button>
            </div>

            {rows.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Chưa có chủ đề nào. Bấm “Thêm chủ đề” để bắt đầu.</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={th}>Chủ đề</th>
                    {heDifficulties.map((d) => <th key={d.id} style={{ ...th, textAlign: 'center' }}>{d.name}</th>)}
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowId}>
                      <td style={{ ...td, fontWeight: 600, color: 'var(--color-text)' }}>{pathWithinHe(r.categoryId)}</td>
                      {heDifficulties.map((d) => {
                        const avail = countAvailableForCell({ problems, childrenMap, heId: effectiveHeId, gradeId: gradeId || null, categoryId: r.categoryId, difficultyId: d.id });
                        return (
                          <td key={d.id} style={{ ...td, textAlign: 'center' }}>
                            <input type="number" min="0" style={numInput} value={r.counts[d.id] || ''} onChange={(e) => setCount(r.rowId, d.id, e.target.value)} />
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>còn {avail}</div>
                          </td>
                        );
                      })}
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button title="Bỏ dòng" onClick={() => removeRow(r.rowId)} style={{ ...btn, padding: 6 }}><X size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
              <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>Tổng: {totalRequested} câu</span>
              <button disabled={totalRequested === 0} onClick={runGenerate}
                style={{ ...ctaBtn, opacity: totalRequested === 0 ? 0.5 : 1, cursor: totalRequested === 0 ? 'not-allowed' : 'pointer' }}>
                Tạo đề
              </button>
            </div>
          </>
        )
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
            {reviewCells.map((c, idx) => {
              const short = c.requested - c.picked.length;
              return (
                <div key={`${c.rowId}:${c.difficultyId}`} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.9rem 1.1rem', background: 'var(--color-surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{pathWithinHe(c.categoryId)} — {diffNameById[c.difficultyId] || ''}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>(đã lấy {c.picked.length}/{c.requested})</span>
                    {short > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-on-amber)', background: 'var(--color-amber-bg)', border: '1px solid var(--color-amber)', borderRadius: 999, padding: '2px 10px' }}>
                        cần {c.requested}, chỉ có {c.picked.length}
                      </span>
                    )}
                  </div>

                  {c.picked.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Kho không có câu nào khớp ô này.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {c.picked.map((p) => (
                        <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 8 }}>
                          <div style={{ flex: 1, minWidth: 0, maxHeight: 90, overflow: 'hidden', fontSize: '0.9rem', color: 'var(--color-text)' }}>
                            <LatexBlockRenderer text={p.statement} />
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button style={{ ...btn, padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => swapOne(idx, p.id)}>Đổi câu khác</button>
                            <button style={{ ...btn, padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => removeOne(idx, p.id)}>Bỏ</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button style={btn} onClick={runGenerate}><RefreshCw size={16} /> Bốc lại toàn bộ</button>
            <button style={btn} onClick={() => setMode('build')}><Pencil size={16} /> Sửa ma trận</button>
            <button style={ctaBtn} onClick={handleAddToCart}><ShoppingCart size={16} /> Đưa vào Giỏ đề ({pickedAll().length} câu)</button>
          </div>
        </>
      )}
    </div>
  );
};

export default MatrixPage;
