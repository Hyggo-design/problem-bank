import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTaxonomy, getRootHeId } from '../hooks/useTaxonomy';
import TagChipInput from './TagChipInput';

// =============================================================================
// ClassificationPicker — bộ điều khiển phân loại DÙNG CHUNG cho form Thêm/Sửa/Import.
//   value:    { categoryIds: string[], difficultyByHe: {}, gradeIds: string[], tags: string }
//   onChange: (newValue) => void
//
// Đã có:
//   - Task 10: cây có checkbox tick chọn NHIỀU nhánh + ô lọc nhanh (categoryIds).
//   - Task 11: tick nhánh ở hệ nào thì hiện ô chọn ĐỘ KHÓ của hệ đó (difficultyByHe).
//     Bỏ hết nhánh của một hệ → tự xóa độ khó của hệ đó.
//   - Task 12: chip LỚP (chọn nhiều) + ô TAG tự do (chuỗi ngăn cách dấu phẩy như form cũ).
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
          backgroundColor: checked ? 'var(--color-cobalt-bg)' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!checked) e.currentTarget.style.backgroundColor = 'var(--color-surface-muted)'; }}
        onMouseLeave={(e) => { if (!checked) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <input type="checkbox" checked={checked} onChange={() => onToggle(node.id)} style={{ cursor: 'pointer' }} />
        <span style={{ fontWeight: depth === 0 ? 700 : 500, color: depth === 0 ? 'var(--color-cobalt-text)' : 'var(--color-text)' }}>
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

const ClassificationPicker = ({ value, onChange, allTags = [] }) => {
  const { categories, difficulties, grades } = useTaxonomy();
  const [filter, setFilter] = useState('');

  const v = value || {};
  // categoryIds được dùng trong dependency của useMemo (heIds) nên phải giữ tham chiếu
  // ổn định — bọc useMemo để không tạo mảng mới mỗi lần render.
  const categoryIds = useMemo(() => v.categoryIds || [], [v.categoryIds]);
  const difficultyByHe = v.difficultyByHe || {};
  const gradeIds = v.gradeIds || [];
  const tags = v.tags || '';

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

  // Tra cứu nhanh theo id + bản đồ cha (để leo ngược tìm hệ gốc của một nhánh).
  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const parentMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.parent_id])), [categories]);

  // Task 11: các HỆ (nút gốc) mà những nhánh đã tick đang chạm tới — riêng biệt,
  // sắp theo position của hệ cho ổn định.
  const heIds = useMemo(() => {
    const ids = [...new Set(categoryIds.map((id) => getRootHeId(id, parentMap)))];
    return ids.sort((a, b) => (byId[a]?.position ?? 0) - (byId[b]?.position ?? 0));
  }, [categoryIds, parentMap, byId]);

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
    const newCategoryIds = [...set];
    // Bỏ nhánh có thể khiến một hệ không còn nhánh nào → xóa độ khó của hệ đó.
    const stillTouched = new Set(newCategoryIds.map((cid) => getRootHeId(cid, parentMap)));
    const prunedDiff = {};
    for (const [heId, diffId] of Object.entries(difficultyByHe)) {
      if (stillTouched.has(heId)) prunedDiff[heId] = diffId;
    }
    onChange({ ...v, categoryIds: newCategoryIds, difficultyByHe: prunedDiff });
  };

  // Task 11: đặt/đổi độ khó cho một hệ ("" = bỏ chọn → xóa khỏi difficultyByHe).
  const setDifficulty = (heId, diffId) => {
    const next = { ...difficultyByHe };
    if (diffId) next[heId] = diffId; else delete next[heId];
    onChange({ ...v, difficultyByHe: next });
  };

  // Task 12: bật/tắt một Lớp (chip).
  const toggleGrade = (id) => {
    const set = new Set(gradeIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange({ ...v, gradeIds: [...set] });
  };

  return (
    <div>
      {/* Ô lọc nhanh */}
      <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Lọc nhanh chuyên đề…"
          style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.9rem', boxSizing: 'border-box' }}
        />
      </div>

      {/* Cây có checkbox */}
      <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.5rem' }}>
        {roots.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', padding: '0.75rem', textAlign: 'center' }}>
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
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '0.5rem', fontStyle: 'italic' }}>
                Không có nhánh nào khớp “{filter}”.
              </div>
            )}
          </>
        )}
      </div>

      {categoryIds.length > 0 && (
        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--color-cobalt)' }}>Đã chọn {categoryIds.length} nhánh</div>
      )}

      {/* Task 11: mỗi hệ đang được chạm tới hiện một ô chọn độ khó (thang riêng của hệ). */}
      {heIds.length > 0 && (
        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Độ khó theo hệ</div>
          {heIds.map((heId) => {
            const levels = difficulties.filter((d) => d.he_id === heId);
            return (
              <div key={heId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text)', minWidth: '110px', fontWeight: 600 }}>
                  {byId[heId]?.name || 'Hệ'}
                </span>
                <select
                  value={difficultyByHe[heId] || ''}
                  onChange={(e) => setDifficulty(heId, e.target.value)}
                  style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer' }}
                >
                  <option value="">— Chọn độ khó —</option>
                  {levels.map((lv) => (
                    <option key={lv.id} value={lv.id}>{lv.name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {/* Task 12: chip LỚP — chọn nhiều, dùng chung cho mọi hệ. */}
      {grades.length > 0 && (
        <div style={{ marginTop: '0.7rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Lớp</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {grades.map((g) => {
              const on = gradeIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGrade(g.id)}
                  style={{
                    padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.82rem', cursor: 'pointer',
                    border: on ? '1px solid var(--color-cobalt)' : '1px solid var(--color-border)',
                    backgroundColor: on ? 'var(--color-cobalt)' : 'var(--color-surface)',
                    color: on ? '#fff' : 'var(--color-text-muted)', fontWeight: on ? 600 : 500,
                  }}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ô TAG kiểu viên (chip) + gợi ý — thay ô chữ tự do cũ (Task quản lý tag). */}
      <div style={{ marginTop: '0.7rem' }}>
        <TagChipInput value={tags} onChange={(newTags) => onChange({ ...v, tags: newTags })} allTags={allTags} />
      </div>
    </div>
  );
};

export default ClassificationPicker;
