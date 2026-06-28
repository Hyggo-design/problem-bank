import React, { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { RotateCcw, Trash2, Trash } from 'lucide-react';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { groupClassificationByHe } from '../utils/classification';
import LatexBlockRenderer from './LatexBlockRenderer';
import { useConfirm } from './ConfirmProvider';

const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('vi-VN'); } catch { return ''; } };

// Trang Thùng rác: bài đã xoá mềm. Khôi phục để dùng lại, hoặc xoá hẳn (không hoàn tác).
const TrashPage = ({ items, onRestore, onPurge, onEmptyAll }) => {
  const { categories, difficulties } = useTaxonomy();
  const confirm = useConfirm();
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const diffById = useMemo(() => Object.fromEntries(difficulties.map((d) => [d.id, d])), [difficulties]);
  const parentMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.parent_id])), [categories]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--color-text)' }}>Thùng rác</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Bài đã xoá. Khôi phục để dùng lại, hoặc xoá hẳn để giải phóng.</div>
        </div>
        <button className="card-btn card-btn-danger" disabled={items.length === 0}
          onClick={async () => { if (await confirm({ title: 'Xoá sạch thùng rác', message: `Xoá hẳn toàn bộ ${items.length} bài trong thùng rác? Không thể hoàn tác.`, danger: true, confirmLabel: 'Xoá hẳn' })) onEmptyAll(); }}>
          <Trash size={16} /> Xoá sạch thùng rác
        </button>
      </div>

      <Virtuoso
        style={{ flex: 1 }}
        data={items}
        components={{
          EmptyPlaceholder: () => (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>Thùng rác trống.</div>
          ),
        }}
        itemContent={(index, p) => {
          const classification = groupClassificationByHe(p, catById, parentMap, diffById);
          const clsText = classification.length === 0
            ? 'Chưa phân loại'
            : classification.map((g) => g.paths.map((path) => path.join(' › ')).join('  |  ')).join('  ·  ');
          return (
            <div style={{ padding: '0 16px' }}>
              <div style={{ margin: '12px 0 0', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', maxHeight: '6em', overflowY: 'auto', color: 'var(--color-text)', lineHeight: 1.55 }}>
                  <LatexBlockRenderer text={p.statement} />
                </div>
                <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border-subtle)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  {clsText}<span> · Đã xoá {fmtDate(p.deletedAt)}</span>
                </div>
                <div style={{ padding: '9px 16px', background: 'var(--color-surface-muted)', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 8 }}>
                  <button className="card-btn card-btn-primary" onClick={() => onRestore(p.id)}><RotateCcw size={16} /> Khôi phục</button>
                  <button className="card-btn card-btn-danger" onClick={async () => { if (await confirm({ title: 'Xoá hẳn bài', message: 'Xoá hẳn bài này? Không thể hoàn tác.', danger: true, confirmLabel: 'Xoá hẳn' })) onPurge(p.id); }}><Trash2 size={16} /> Xoá hẳn</button>
                </div>
              </div>
            </div>
          );
        }}
      />

      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Thùng rác có <strong style={{ color: 'var(--color-text)' }}>{items.length}</strong> bài.
      </div>
    </div>
  );
};

export default TrashPage;
