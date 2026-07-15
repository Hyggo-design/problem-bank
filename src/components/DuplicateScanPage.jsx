import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Eye, Trash2, CopyCheck } from 'lucide-react';
import MathText from './MathText';
import { scanDuplicates } from '../utils/scanDuplicates';

const pct = (v) => `${Math.round(v * 100)}%`;
const readThreshold = () => {
  const p = parseInt(localStorage.getItem('pb-dup-threshold') ?? '85', 10);
  return (Number.isNaN(p) ? 85 : p) / 100;
};
const fmtDate = (s) => {
  const d = new Date(s);
  return s && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('vi-VN') : '';
};

// Màn "Quét trùng toàn kho" (currentView === 'duplicates'). Mở từ Cài đặt.
const DuplicateScanPage = ({ problems = [], onPreview, onDelete, onBack }) => {
  const [groups, setGroups] = useState([]);
  const [scanning, setScanning] = useState(true);
  const [threshold, setThreshold] = useState(readThreshold);
  const [removedIds, setRemovedIds] = useState(() => new Set());

  // Quét: đọc ngưỡng mới nhất từ Cài đặt, hiện "Đang quét…" rồi tính (nhường 1 nhịp cho giao diện vẽ).
  const runScan = () => {
    const thr = readThreshold();
    setThreshold(thr);
    setScanning(true);
    setRemovedIds(new Set());
    setTimeout(() => {
      setGroups(scanDuplicates(problems, thr));
      setScanning(false);
    }, 0);
  };

  // Tự quét MỘT LẦN khi mở màn. KHÔNG tự quét lại khi 'problems' đổi do xoá (quyết định 4b) — muốn rà mới thì bấm "Quét lại".
  useEffect(() => {
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id) => {
    await onDelete(id);
    setRemovedIds((prev) => new Set(prev).add(id));
  };

  // Bỏ bài đã xoá khỏi nhóm; nhóm còn < 2 bài thì bỏ luôn.
  const visibleGroups = groups
    .map((g) => ({ ...g, members: g.members.filter((m) => !removedIds.has(m.id)) }))
    .filter((g) => g.members.length >= 2);
  const totalProblems = visibleGroups.reduce((s, g) => s + g.members.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* thanh đầu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
        <button className="card-btn" onClick={onBack}><ArrowLeft size={16} /> Cài đặt</button>
        <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CopyCheck size={20} /> Quét trùng toàn kho
        </h2>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Ngưỡng: {pct(threshold)}</span>
        <button className="card-btn" style={{ marginLeft: 'auto' }} onClick={runScan} disabled={scanning}>
          <RefreshCw size={15} /> Quét lại
        </button>
      </div>

      {/* nội dung */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
        {scanning ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>Đang quét…</div>
        ) : visibleGroups.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem', lineHeight: 1.6 }}>
            <div style={{ fontSize: '1.05rem', marginBottom: 6 }}>Không tìm thấy bài nào nghi trùng ở ngưỡng {pct(threshold)}.</div>
            <div style={{ fontSize: '0.88rem' }}>Muốn bắt cả bài gần giống, hạ ngưỡng trong Cài đặt rồi bấm “Quét lại”.</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14, color: 'var(--color-text)', fontWeight: 600 }}>
              Tìm thấy {visibleGroups.length} nhóm nghi trùng ({totalProblems} bài)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {visibleGroups.map((g, gi) => (
                <div key={gi} style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '0.6rem 0.9rem', background: 'var(--color-amber-bg)', color: 'var(--color-amber-text)', fontWeight: 700, fontSize: '0.85rem' }}>
                    Nhóm {gi + 1} · Đề {pct(g.maxStmtSim)} · Lời giải {pct(g.maxSolSim)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {g.members.map((m) => (
                      <div key={m.id} style={{ display: 'flex', gap: 12, padding: '0.9rem', borderTop: '1px solid var(--color-border-subtle)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ maxHeight: 120, overflowY: 'auto', color: 'var(--color-text)', fontSize: '0.92rem' }}>
                            <MathText text={m.statement} />
                          </div>
                          <div style={{ marginTop: 6, color: 'var(--color-text-subtle)', fontSize: '0.78rem' }}>
                            Thêm {fmtDate(m.dateAdded)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                          <button className="card-btn" onClick={() => onPreview(m)}><Eye size={15} /> Xem đầy đủ</button>
                          <button className="card-btn card-btn-danger" onClick={() => handleDelete(m.id)}><Trash2 size={15} /> Xoá</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DuplicateScanPage;
