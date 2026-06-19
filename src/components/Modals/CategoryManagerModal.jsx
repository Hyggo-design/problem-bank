import React, { useMemo, useState } from 'react';
import { X, FolderTree, FolderPlus, Plus, Pencil, Trash2, Check, FolderInput } from 'lucide-react';
import { useTaxonomy, getDescendantIds } from '../../hooks/useTaxonomy';

// =============================================================================
// CategoryManagerModal — màn hình "Quản lý phân loại"
// Task 6: khung + cây (chỉ xem).
// Task 7: thêm/đổi tên/xóa/di chuyển nhánh ngay trên cây (ô nhập inline).
// Task 8-9 (sắp tới): thang độ khó theo hệ + danh sách lớp ở cột phải.
// =============================================================================

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
  padding: '0.2rem', borderRadius: '5px', display: 'inline-flex', alignItems: 'center',
};
const inputStyle = {
  padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #93c5fd',
  fontSize: '0.9rem', outline: 'none', flex: 1, minWidth: 0,
};

// Ô nhập inline dùng chung cho "thêm" và "đổi tên".
const InlineInput = ({ value, onChange, onCommit, onCancel, placeholder }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
    <input
      autoFocus
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit();
        if (e.key === 'Escape') onCancel();
      }}
      style={inputStyle}
    />
    <button onClick={onCommit} title="Lưu" style={{ ...iconBtn, color: '#16a34a' }}><Check size={17} /></button>
    <button onClick={onCancel} title="Hủy" style={{ ...iconBtn, color: '#ef4444' }}><X size={17} /></button>
  </div>
);

// Một nút trong cây (đệ quy). Định nghĩa NGOÀI modal để ô nhập inline không bị
// remount (mất focus) mỗi lần re-render. Mọi handler/state truyền qua `ctx`.
const CategoryNode = ({ node, depth, ctx }) => {
  const children = ctx.childrenMap[node.id] || [];
  const isRenaming = ctx.renaming && ctx.renaming.nodeId === node.id;
  const isMoving = ctx.moving === node.id;

  // Đích di chuyển hợp lệ = mọi nhánh TRỪ chính nó và con cháu (tránh tạo vòng lặp).
  const moveTargets = useMemo(() => {
    if (!isMoving) return [];
    const banned = new Set(getDescendantIds(node.id, ctx.childrenMap));
    return ctx.categories.filter((c) => !banned.has(c.id));
  }, [isMoving, node.id, ctx.childrenMap, ctx.categories]);

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.35rem 0.5rem', paddingLeft: `${0.5 + depth * 1.4}rem`,
          borderRadius: '6px', fontSize: '0.95rem', color: '#1e293b',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <span style={{ color: depth === 0 ? '#2563eb' : '#94a3b8' }}>{depth === 0 ? '■' : '•'}</span>

        {isRenaming ? (
          <InlineInput
            value={ctx.renaming.value}
            onChange={ctx.setRenameValue}
            onCommit={ctx.commitRename}
            onCancel={ctx.cancel}
          />
        ) : (
          <>
            <span style={{ fontWeight: depth === 0 ? 700 : 500, flex: 1 }}>{node.name}</span>
            <button onClick={() => ctx.startAdd(node.id)} title="Thêm nhánh con" style={iconBtn}><Plus size={16} /></button>
            <button onClick={() => ctx.startRename(node)} title="Đổi tên" style={iconBtn}><Pencil size={15} /></button>
            <button onClick={() => ctx.startMove(node.id)} title="Di chuyển" style={iconBtn}><FolderInput size={15} /></button>
            <button onClick={() => ctx.remove(node)} title="Xóa" style={{ ...iconBtn, color: '#f87171' }}><Trash2 size={15} /></button>
          </>
        )}
      </div>

      {/* Ô chọn nơi chuyển nhánh tới */}
      {isMoving && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.5rem', paddingLeft: `${0.5 + (depth + 1) * 1.4}rem` }}>
          <select
            autoFocus
            defaultValue=""
            onChange={(e) => ctx.commitMove(node.id, e.target.value === '__ROOT__' ? null : e.target.value)}
            style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}
          >
            <option value="" disabled>Chuyển “{node.name}” vào…</option>
            <option value="__ROOT__">▲ Tầng gốc (thành hệ riêng)</option>
            {moveTargets.map((t) => (
              <option key={t.id} value={t.id}>{ctx.pathOf(t.id)}</option>
            ))}
          </select>
          <button onClick={ctx.cancel} title="Hủy" style={{ ...iconBtn, color: '#ef4444' }}><X size={17} /></button>
        </div>
      )}

      {/* Ô nhập thêm nhánh con dưới nút này */}
      {ctx.adding && ctx.adding.parentId === node.id && (
        <div style={{ display: 'flex', padding: '0.35rem 0.5rem', paddingLeft: `${0.5 + (depth + 1) * 1.4}rem` }}>
          <InlineInput
            value={ctx.adding.value}
            onChange={ctx.setAddValue}
            onCommit={ctx.commitAdd}
            onCancel={ctx.cancel}
            placeholder="Tên nhánh con mới…"
          />
        </div>
      )}

      {children.map((child) => (
        <CategoryNode key={child.id} node={child} depth={depth + 1} ctx={ctx} />
      ))}
    </div>
  );
};

const CategoryManagerModal = ({ onClose }) => {
  const tax = useTaxonomy();
  const { categories } = tax;

  const [adding, setAdding] = useState(null);     // { parentId, value } | null
  const [renaming, setRenaming] = useState(null); // { nodeId, value } | null
  const [moving, setMoving] = useState(null);     // nodeId | null

  // map parent_id -> con (đã sắp theo position) + danh sách hệ gốc
  const { childrenMap, roots } = useMemo(() => {
    const map = {};
    for (const c of categories) {
      const key = c.parent_id || 'ROOT';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    for (const k in map) map[k].sort((a, b) => a.position - b.position);
    return { childrenMap: map, roots: map['ROOT'] || [] };
  }, [categories]);

  // Đường dẫn đầy đủ của mỗi nhánh, ví dụ "Toán THPT › Đạo hàm" (cho ô di chuyển)
  const pathMap = useMemo(() => {
    const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
    const m = {};
    for (const c of categories) {
      const names = [];
      let cur = c.id;
      while (cur && byId[cur]) { names.unshift(byId[cur].name); cur = byId[cur].parent_id; }
      m[c.id] = names.join(' › ');
    }
    return m;
  }, [categories]);

  const cancel = () => { setAdding(null); setRenaming(null); setMoving(null); };

  const ctx = {
    categories,
    childrenMap,
    adding, renaming, moving,
    pathOf: (id) => pathMap[id] || '',
    setAddValue: (v) => setAdding((a) => ({ ...a, value: v })),
    setRenameValue: (v) => setRenaming((r) => ({ ...r, value: v })),
    startAdd: (parentId) => { cancel(); setAdding({ parentId, value: '' }); },
    startRename: (node) => { cancel(); setRenaming({ nodeId: node.id, value: node.name }); },
    startMove: (nodeId) => { cancel(); setMoving(nodeId); },
    cancel,
    commitAdd: async () => {
      if (adding && adding.value.trim()) await tax.addCategory(adding.value, adding.parentId);
      setAdding(null);
    },
    commitRename: async () => {
      if (renaming && renaming.value.trim()) await tax.renameCategory(renaming.nodeId, renaming.value);
      setRenaming(null);
    },
    commitMove: async (nodeId, newParentId) => { await tax.moveCategory(nodeId, newParentId); setMoving(null); },
    remove: async (node) => {
      if (window.confirm(`Xóa nhánh “${node.name}” và TẤT CẢ nhánh con bên dưới?\n\nCác bài đang gắn sẽ bị gỡ nhãn nhưng KHÔNG bị xóa.`)) {
        await tax.deleteCategory(node.id);
      }
    },
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px', height: '80vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FolderTree size={22} color="#2563eb" /> Quản lý phân loại
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>

        {/* Body: 2 cột */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Cột trái: CÂY PHÂN LOẠI (có sửa) */}
          <div style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cây chuyên đề</span>
              <button onClick={() => ctx.startAdd(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem', borderRadius: '7px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                <FolderPlus size={15} /> Thêm hệ
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
              {/* Ô nhập thêm hệ mới ở tầng gốc */}
              {adding && adding.parentId === null && (
                <div style={{ display: 'flex', padding: '0.35rem 0.5rem' }}>
                  <InlineInput value={adding.value} onChange={ctx.setAddValue} onCommit={ctx.commitAdd} onCancel={ctx.cancel} placeholder="Tên hệ mới…" />
                </div>
              )}
              {roots.length === 0 && !adding ? (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '1rem', textAlign: 'center' }}>
                  Chưa có hệ nào. Bấm “Thêm hệ” để bắt đầu.
                </div>
              ) : (
                roots.map((node) => (
                  <CategoryNode key={node.id} node={node} depth={0} ctx={ctx} />
                ))
              )}
            </div>
          </div>

          {/* Cột phải: placeholder cho Thang độ khó (Task 8) & Lớp (Task 9) */}
          <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.25rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            Chọn một hệ để xem thang độ khó. (Sắp có)
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Đóng</button>
        </div>

      </div>
    </div>
  );
};

export default CategoryManagerModal;
