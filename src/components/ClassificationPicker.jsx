import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTaxonomy } from '../hooks/useTaxonomy';

// =============================================================================
// ClassificationPicker — bộ điều khiển phân loại DÙNG CHUNG cho form Thêm/Sửa/Import.
//   value:    { categoryIds: string[], difficultyByHe: {}, gradeIds: string[] }
//   onChange: (newValue) => void
//
// Task 10 (bản này): cây có checkbox tick chọn NHIỀU nhánh + ô lọc nhanh — mới xử lý
//   `categoryIds`; các trường khác được giữ nguyên (spread) để Task 11–12 bổ sung:
//   - Task 11: ô chọn độ khó theo từng hệ (difficultyByHe)
//   - Task 12: chip Lớp + ô Tag tự do (gradeIds)
// =============================================================================

// Một nút trong cây (đệ quy). Đặt NGOÀI component cha cho gọn & ổn định.
const PickerNode = ({ node, depth, childrenMap, categoryIds, visibleIds, onToggle }) => {
  if (visibleIds && !visibleIds.has(node.id)) return null; // đang lọc & nút này không nằm trong tập hiện
  const children = childrenMap[node.id] || [];
  const checked = categoryIds.includes(node.id);
  return (
    <div>
      <label
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.3rem 0.5rem', paddingLeft: `${0.5 + depth * 1.4}rem`,
          borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem',
          backgroundColor: checked ? '#eff6ff' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!checked) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
        onMouseLeave={(e) => { if (!checked) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <input type="checkbox" checked={checked} onChange={() => onToggle(node.id)} style={{ cursor: 'pointer' }} />
        <span style={{ fontWeight: depth === 0 ? 700 : 500, color: depth === 0 ? '#1d4ed8' : '#334155' }}>
          {node.name}
        </span>
      </label>
      {children.map((child) => (
        <PickerNode
          key={child.id} node={child} depth={depth + 1}
          childrenMap={childrenMap} categoryIds={categoryIds} visibleIds={visibleIds} onToggle={onToggle}
        />
      ))}
    </div>
  );
};

const ClassificationPicker = ({ value, onChange }) => {
  const { categories } = useTaxonomy();
  const [filter, setFilter] = useState('');

  const v = value || {};
  const categoryIds = v.categoryIds || [];

  // childrenMap (parent_id -> các con, sắp theo position) + danh sách hệ gốc
  const { childrenMap, roots } = useMemo(() => {
    const map = {};
    for (const c of categories) {
      const key = c.parent_id || 'ROOT';
      (map[key] = map[key] || []).push(c);
    }
    for (const k in map) map[k].sort((a, b) => a.position - b.position);
    return { childrenMap: map, roots: map['ROOT'] || [] };
  }, [categories]);

  // Lọc: hiện các nút có tên KHỚP + mọi TỔ TIÊN của chúng (để thấy đường dẫn tới nhánh).
  // Trả về null = không lọc (hiện tất cả).
  const visibleIds = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return null;
    const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
    const visible = new Set();
    for (const c of categories) {
      if (c.name.toLowerCase().includes(q)) {
        let cur = c.id;
        while (cur && byId[cur]) { visible.add(cur); cur = byId[cur].parent_id; }
      }
    }
    return visible;
  }, [filter, categories]);

  const toggle = (id) => {
    const set = new Set(categoryIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange({ ...v, categoryIds: [...set] });
  };

  return (
    <div>
      {/* Ô lọc nhanh */}
      <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Lọc nhanh chuyên đề…"
          style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Cây có checkbox */}
      <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem' }}>
        {roots.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.88rem', padding: '0.75rem', textAlign: 'center' }}>
            Chưa có chuyên đề nào. Thầy tạo ở “Quản lý phân loại”.
          </div>
        ) : (
          <>
            {roots.map((node) => (
              <PickerNode
                key={node.id} node={node} depth={0}
                childrenMap={childrenMap} categoryIds={categoryIds} visibleIds={visibleIds} onToggle={toggle}
              />
            ))}
            {visibleIds && visibleIds.size === 0 && (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem', fontStyle: 'italic' }}>
                Không có nhánh nào khớp “{filter}”.
              </div>
            )}
          </>
        )}
      </div>

      {categoryIds.length > 0 && (
        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#2563eb' }}>Đã chọn {categoryIds.length} nhánh</div>
      )}
    </div>
  );
};

export default ClassificationPicker;
