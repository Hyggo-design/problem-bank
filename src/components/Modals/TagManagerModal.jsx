import React, { useMemo, useState } from 'react';
import { X, Pencil, Trash2, Check } from 'lucide-react';
import { buildTagIndex } from '../../utils/tagUtils';
import { normalizeVi } from '../../utils/searchText';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../ConfirmProvider';

// =============================================================================
// TagManagerModal — "Quản lý tag" (mở từ Cài đặt).
// Xem danh sách tag + số bài; đổi tên (kiêm gộp) / xoá tag trên TOÀN kho.
// Danh sách dựng từ mảng problems (buildTagIndex) — không có bảng tag riêng.
// Ghi hàng loạt qua onRenameTag/onDeleteTag (trả true/false — báo lỗi thật).
// =============================================================================
const TagManagerModal = ({ problems = [], onRenameTag, onDeleteTag, onClose }) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('az');       // 'az' | 'count'
  const [editing, setEditing] = useState(null);  // tag đang đổi tên
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();
  const confirm = useConfirm();

  const rows = useMemo(() => {
    let idx = buildTagIndex(problems);            // mặc định: số bài giảm dần
    const q = normalizeVi(query).trim();
    if (q) idx = idx.filter((it) => normalizeVi(it.tag).includes(q));
    if (sort === 'az') idx = [...idx].sort((a, b) => normalizeVi(a.tag).localeCompare(normalizeVi(b.tag)));
    return idx;
  }, [problems, query, sort]);

  const startRename = (row) => { setEditing(row.tag); setDraft(row.tag); };
  const doRename = async (row) => {
    const nt = draft.trim();
    if (!nt || nt === row.tag) { setEditing(null); return; }
    if (!(await confirm({ title: 'Đổi tên tag', message: `Đổi '${row.tag}' → '${nt}' trên ${row.count} bài?`, confirmLabel: 'Đổi' }))) return;
    setBusy(true);
    const ok = await onRenameTag(row.tag, nt);
    setBusy(false);
    if (ok) success(`Đã đổi '${row.tag}' → '${nt}'`);
    else error('Chưa đổi được — CSDL đang trục trặc. Thầy thử lại nhé.');
    setEditing(null);
  };
  const doDelete = async (row) => {
    if (!(await confirm({ title: 'Xoá tag', message: `Gỡ tag '${row.tag}' khỏi ${row.count} bài? (không xoá bài)`, danger: true, confirmLabel: 'Xoá' }))) return;
    setBusy(true);
    const ok = await onDeleteTag(row.tag);
    setBusy(false);
    if (ok) success(`Đã gỡ tag '${row.tag}'`);
    else error('Chưa xoá được — CSDL đang trục trặc. Thầy thử lại nhé.');
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '82vh', boxShadow: '0 25px 50px -12px var(--shadow)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text)' }}>Quản lý tag</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={24} /></button>
        </div>

        {/* Thanh tìm + sắp xếp */}
        <div style={{ display: 'flex', gap: 8, padding: '0.9rem 1.5rem', flexShrink: 0 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tag…"
            style={{ flex: 1, padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.9rem' }}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer' }}
          >
            <option value="az">A → Z</option>
            <option value="count">Số bài</option>
          </select>
        </div>

        {/* Danh sách tag */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1rem' }}>
          {rows.length === 0 && (
            <div style={{ color: 'var(--color-text-muted)', padding: '1.5rem', textAlign: 'center' }}>
              {buildTagIndex(problems).length === 0 ? 'Chưa có tag nào trong kho.' : 'Không có tag nào khớp.'}
            </div>
          )}
          {rows.map((row) => (
            <div key={row.tag} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              {editing === row.tag ? (
                <>
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') doRename(row); if (e.key === 'Escape') setEditing(null); }}
                    style={{ flex: 1, padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--color-cobalt)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                  <button className="card-btn card-btn-primary" disabled={busy} onClick={() => doRename(row)}><Check size={15} /> Lưu</button>
                  <button className="card-btn" disabled={busy} onClick={() => setEditing(null)}>Huỷ</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, color: 'var(--color-text)', wordBreak: 'break-word' }}>{row.tag}</span>
                  <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.82rem', minWidth: 52, textAlign: 'right' }}>{row.count} bài</span>
                  <button className="card-btn" disabled={busy} onClick={() => startRename(row)}><Pencil size={14} /> Đổi tên</button>
                  <button className="card-btn card-btn-danger" disabled={busy} onClick={() => doDelete(row)}><Trash2 size={14} /> Xoá</button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.9rem 1.5rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-muted)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button className="card-btn" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default TagManagerModal;
