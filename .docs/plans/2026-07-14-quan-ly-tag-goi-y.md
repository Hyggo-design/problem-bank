# Quản lý Tag + Gợi ý gõ — Build Plan

**What we're building:** Tag thông minh cho Problem Bank — gõ tag thì có gợi ý (kiểu viên/chip), lọc bài theo nhiều tag (VÀ/HOẶC), và một màn quản lý để đổi tên / gộp / xoá tag trên toàn kho.

**Why:** Tag đang gõ tay ngăn dấu phẩy nên dễ đẻ biến thể (`so hoc` / `số học` / `Số Học`) làm phân mảnh kho. Bốn phần này chặn phân mảnh từ lúc nhập và chữa phân mảnh về sau.

**Approach:** KHÔNG đổi schema — tag vẫn là cột chữ ngăn phẩy. Toàn bộ "danh sách tag" tính từ mảng `problems` đã nạp sẵn. Gom mọi logic thuần vào `tagUtils.js` (viết test trước), rồi ráp UI: ô chip trong form, mục lọc bên trái, và modal quản lý mở từ Cài đặt. Đường xuất `.tex` KHÔNG bị chạm (golden-file phải giữ nguyên); đổi tên hàng loạt báo lỗi thật (bám Đợt A #1).

**Files we'll create or change:**
- `src/utils/tagUtils.js` *(mới)* — hàm thuần: parse/serialize/đếm/gợi ý/đổi tên/xoá/lọc tag.
- `src/utils/tagUtils.test.js` *(mới)* — test cho tagUtils.
- `src/components/TagChipInput.jsx` *(mới)* — ô nhập tag kiểu viên + gợi ý.
- `src/components/ClassificationPicker.jsx` — thay ô tag chữ bằng `TagChipInput`; nhận prop `allTags`.
- `src/components/Modals/AddProblemModal.jsx`, `EditProblemModal.jsx`, `SmartImportModal.jsx` — nhận `allTags`, chuyền xuống picker.
- `src/hooks/useUIState.js` — thêm state lọc tag (`filterTags`, `filterTagMode`) + `showTagManager`.
- `src/components/FilterSidebar.jsx` — thêm mục "Tag" (chọn nhiều + VÀ/HOẶC).
- `src/components/DataGrid.jsx` — áp lọc theo tag.
- `src/utils/problemWrites.js` — helper `updateProblemTags`.
- `src/hooks/useProblems.js` — `renameTag` / `deleteTag` (báo lỗi thật).
- `src/components/Modals/TagManagerModal.jsx` *(mới)* — màn quản lý tag.
- `src/components/SettingsPage.jsx` — thêm Row "Quản lý tag"; gỡ Row "Cỡ chữ — Sắp có".
- `src/App.jsx` — nối tất cả (tính `allTags`, chuyền props, mở modal).

**Spec:** `.docs/specs/2026-07-14-quan-ly-tag-goi-y-design.md`

> Ghi chú thuật ngữ: **hàm thuần** = hàm chỉ nhận vào → trả ra, không đụng màn hình/CSDL, nên dễ viết test. **TDD** = viết test trước (đỏ) rồi mới viết code cho xanh. **chip/viên** = tag hiện thành nút bo tròn có nút ✕.

---

### Task 1: Chuẩn bị an toàn (nhánh mới + sao lưu + mốc "trước")

**What you'll have when this is done:** Nhánh git riêng, một bản sao DB phòng hờ, và số liệu "trước khi sửa" (test/build) để so.

- [ ] Bước 1: Tạo nhánh làm việc riêng
      Chạy: `git checkout -b feat-quan-ly-tag`
      Sẽ thấy: `Switched to a new branch 'feat-quan-ly-tag'`

- [ ] Bước 2: Sao lưu DB (tính năng KHÔNG đổi cấu trúc DB — vẫn phòng hờ vì có ghi hàng loạt cột `tags`)
      Chạy (PowerShell): `Copy-Item "D:\0. Problems Bank\app-data\problem_bank.db" "D:\0. Problems Bank\app-data\problem_bank.backup-tag-2026-07-14.db"`
      Sẽ thấy: file backup xuất hiện trong `app-data`.

- [ ] Bước 3: Ghi mốc "trước" — chạy toàn bộ test
      Chạy: `CI=true npm test`
      Sẽ thấy: tất cả XANH (ghi lại tổng, kỳ vọng **94 passed** như NK31). Gồm golden-file `buildContentFile` (khoá định dạng xuất `.tex`).

- [ ] Bước 4: Ghi mốc "trước" — build sạch
      Chạy: `CI=true npm run build`
      Sẽ thấy: `Compiled successfully` (0 warning). Mọi task sau phải giữ 0 warning.

*(Task này không đổi code nên chưa commit.)*

---

### Task 2: Bộ não tag — `tagUtils.js` (viết test trước)

**What you'll have when this is done:** Một file hàm thuần lo hết logic tag, có test chứng minh: gộp biến thể khi đổi tên, gợi ý không dấu, lọc VÀ/HOẶC.

- [ ] Bước 1: Viết test TRƯỚC (sẽ đỏ) — tạo `src/utils/tagUtils.test.js`
      Các ca cần có:
      ```js
      import { parseTags, serializeTags, buildTagIndex, suggestTags, applyTagRename, applyTagDelete, matchTagFilter } from './tagUtils';

      test('parseTags: trim, bỏ rỗng, khử trùng, giữ thứ tự', () => {
        expect(parseTags('a, , b ,a')).toEqual(['a', 'b']);
        expect(parseTags('')).toEqual([]);
      });
      test('serializeTags: nối bằng ", "', () => {
        expect(serializeTags(['a', 'b'])).toBe('a, b');
        expect(serializeTags([])).toBe('');
      });
      test('buildTagIndex: đếm số BÀI mỗi tag', () => {
        const idx = buildTagIndex([{ tags: 'a, a, b' }, { tags: 'b' }, { tags: '' }]);
        expect(idx.find((x) => x.tag === 'a').count).toBe(1); // 1 bài dù ghi 2 lần
        expect(idx.find((x) => x.tag === 'b').count).toBe(2);
      });
      test('suggestTags: khớp không dấu, bỏ tag đã chọn, khớp-đầu trước', () => {
        const idx = [{ tag: 'cực trị', count: 5 }, { tag: 'bất đẳng thức cực', count: 1 }];
        const s = suggestTags(idx, 'cuc', []);
        expect(s[0].tag).toBe('cực trị');           // khớp đầu trước
        expect(suggestTags(idx, 'cuc', ['cực trị'])).toHaveLength(1); // bỏ đã chọn
      });
      test('applyTagRename: đổi thường + GỘP khi trùng tên', () => {
        expect(applyTagRename('a, b', 'a', 'c')).toBe('c, b');
        expect(applyTagRename('a, b', 'a', 'b')).toBe('b');   // gộp
        expect(applyTagRename('x', 'a', 'b')).toBe('x');       // không chứa -> nguyên
      });
      test('applyTagDelete: bỏ đúng tag', () => {
        expect(applyTagDelete('a, b, c', 'b')).toBe('a, c');
      });
      test('matchTagFilter: rỗng=true, and đủ mọi, or bất kỳ', () => {
        expect(matchTagFilter(['a', 'b'], [], 'and')).toBe(true);
        expect(matchTagFilter(['a', 'b'], ['a', 'b'], 'and')).toBe(true);
        expect(matchTagFilter(['a'], ['a', 'b'], 'and')).toBe(false);
        expect(matchTagFilter(['a'], ['a', 'b'], 'or')).toBe(true);
        expect(matchTagFilter([], ['a'], 'or')).toBe(false);
      });
      ```
      Chạy: `CI=true npm test` → thấy các test tag ĐỎ (chưa có file code) là đúng.

- [ ] Bước 2: Viết code cho xanh — tạo `src/utils/tagUtils.js`
      ```js
      // Tiện ích TAG — hàm THUẦN, tách riêng để viết test. KHÔNG đụng CSDL / đường xuất .tex.
      import { normalizeVi } from './searchText';

      // "a, , b ,a" -> ["a","b"]: trim, bỏ rỗng, khử trùng (danh tính = chuỗi đã trim).
      export const parseTags = (str = '') => {
        const seen = new Set();
        const out = [];
        for (const raw of String(str).split(',')) {
          const t = raw.trim();
          if (t && !seen.has(t)) { seen.add(t); out.push(t); }
        }
        return out;
      };

      export const serializeTags = (arr = []) => arr.join(', ');

      // Đếm số BÀI dùng mỗi tag -> [{tag,count}], sắp số bài giảm dần rồi A→Z không dấu.
      export const buildTagIndex = (problems = []) => {
        const count = new Map();
        for (const p of problems) {
          for (const t of parseTags(p.tags)) count.set(t, (count.get(t) || 0) + 1);
        }
        return [...count.entries()]
          .map(([tag, c]) => ({ tag, count: c }))
          .sort((a, b) => b.count - a.count || normalizeVi(a.tag).localeCompare(normalizeVi(b.tag)));
      };

      // Gợi ý khi gõ: khớp không dấu/không hoa-thường; bỏ tag đã chọn; khớp-đầu trước.
      export const suggestTags = (index = [], query = '', chosen = [], limit = 8) => {
        const q = normalizeVi(query).trim();
        const chosenSet = new Set(chosen);
        const pool = index.filter((it) => !chosenSet.has(it.tag));
        if (!q) return pool.slice(0, limit);
        const scored = [];
        for (const it of pool) {
          const pos = normalizeVi(it.tag).indexOf(q);
          if (pos >= 0) scored.push({ it, prefix: pos === 0 ? 0 : 1 });
        }
        scored.sort((a, b) => a.prefix - b.prefix || b.it.count - a.it.count);
        return scored.slice(0, limit).map((s) => s.it);
      };

      // Đổi tên/gộp trên MỘT bài: thay old->new (khớp chính xác), khử trùng (gộp), bỏ rỗng.
      export const applyTagRename = (tagsStr = '', oldTag = '', newTag = '') => {
        const nt = String(newTag).trim();
        const renamed = parseTags(tagsStr).map((t) => (t === oldTag ? nt : t)).filter(Boolean);
        return serializeTags([...new Set(renamed)]);
      };

      export const applyTagDelete = (tagsStr = '', tag = '') =>
        serializeTags(parseTags(tagsStr).filter((t) => t !== tag));

      // Lọc theo nhiều tag: rỗng -> true; 'and' đủ mọi tag; 'or' có ít nhất 1.
      export const matchTagFilter = (problemTags = [], selectedTags = [], mode = 'and') => {
        if (!selectedTags.length) return true;
        const set = new Set(problemTags);
        return mode === 'or'
          ? selectedTags.some((t) => set.has(t))
          : selectedTags.every((t) => set.has(t));
      };
      ```

- [ ] Bước 3: Chạy test cho xanh
      Chạy: `CI=true npm test`
      Sẽ thấy: mọi test tag XANH; **tổng test = 94 + số ca tag mới**; golden `buildContentFile` KHÔNG đổi.

- [ ] Bước 4: Build sạch
      Chạy: `CI=true npm run build` → `Compiled successfully`, 0 warning.

- [ ] Bước 5: Lưu tiến độ
      Chạy: `git add -A && git commit -m "feat(tag): tagUtils thuan + test (parse/index/suggest/rename/delete/filter)"`

---

### Task 3: Ô nhập tag kiểu viên (chip) + gợi ý

**What you'll have when this is done:** Trong form Thêm/Sửa/Nhập AI, tag hiện thành viên bấm ✕; gõ ra gợi ý (kể cả gõ không dấu); tạo tag mới được; lưu ra vẫn đúng chuỗi ngăn phẩy cũ.

- [ ] Bước 1: Tạo `src/components/TagChipInput.jsx`
      ```jsx
      import React, { useMemo, useState } from 'react';
      import { X } from 'lucide-react';
      import { parseTags, serializeTags, suggestTags } from '../utils/tagUtils';

      // Ô nhập tag kiểu viên + gợi ý. value = chuỗi ngăn phẩy; onChange(chuỗi mới); allTags = [{tag,count}].
      const TagChipInput = ({ value = '', onChange, allTags = [] }) => {
        const [draft, setDraft] = useState('');
        const [open, setOpen] = useState(false);
        const chips = useMemo(() => parseTags(value), [value]);

        const setChips = (arr) => onChange(serializeTags(arr));
        const addTag = (t) => {
          const tag = String(t).trim();
          if (!tag || chips.includes(tag)) { setDraft(''); return; }
          setChips([...chips, tag]);
          setDraft('');
        };
        const removeTag = (t) => setChips(chips.filter((x) => x !== t));
        const suggestions = useMemo(
          () => (open ? suggestTags(allTags, draft, chips) : []),
          [open, draft, chips, allTags]
        );

        const onKeyDown = (e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(draft); }
          else if (e.key === 'Backspace' && !draft && chips.length) removeTag(chips[chips.length - 1]);
        };

        return (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-surface)' }}>
              {chips.map((t) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'var(--color-cobalt)', color: '#fff', fontSize: '0.8rem' }}>
                  {t}
                  <X size={13} style={{ cursor: 'pointer' }} onClick={() => removeTag(t)} />
                </span>
              ))}
              <input
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                onKeyDown={onKeyDown}
                placeholder={chips.length ? '' : 'gõ tag rồi Enter…'}
                style={{ flex: 1, minWidth: 90, border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-text)', fontSize: '0.88rem' }}
              />
            </div>
            {suggestions.length > 0 && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: 4, background: 'var(--color-surface)', boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1))', maxHeight: 180, overflowY: 'auto' }}>
                {suggestions.map((s) => (
                  <div
                    key={s.tag}
                    onMouseDown={(e) => { e.preventDefault(); addTag(s.tag); }}
                    style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.86rem', color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{s.tag}</span>
                    <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.78rem' }}>{s.count} bài</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      };

      export default TagChipInput;
      ```
      *(Dùng `onMouseDown` + `preventDefault` cho gợi ý để click kịp trước khi input mất tiêu điểm.)*

- [ ] Bước 2: Nối vào `ClassificationPicker.jsx`
      - Thêm import đầu file: `import TagChipInput from './TagChipInput';`
      - Đổi chữ ký nhận thêm prop: `const ClassificationPicker = ({ value, onChange, allTags = [] }) => {`
      - Thay CẢ khối "ô TAG tự do" (khối `{/* Task 12: ô TAG tự do ... */}` với `<input ... value={tags} ... />`) bằng:
        ```jsx
        <div style={{ marginTop: '0.7rem' }}>
          <TagChipInput value={tags} onChange={(newTags) => onChange({ ...v, tags: newTags })} allTags={allTags} />
        </div>
        ```

- [ ] Bước 3: Chuyền `allTags` từ App xuống 3 modal
      - `App.jsx` — thêm sau khi có `problems`: `const tagIndex = useMemo(() => buildTagIndex(problems), [problems]);` và import `import { buildTagIndex } from './utils/tagUtils';`
      - Trong `App.jsx`, thêm prop `allTags={tagIndex}` cho `<AddProblemModal ...>`, `<EditProblemModal ...>`, `<SmartImportModal ...>`.
      - `AddProblemModal.jsx`: đổi chữ ký thành `({ onClose, onSave, allTags })`; sửa `<ClassificationPicker value={cls} onChange={setCls} />` → thêm `allTags={allTags}`.
      - `EditProblemModal.jsx`: đổi chữ ký thêm `allTags`; sửa `<ClassificationPicker value={cls} onChange={setCls} allTags={allTags} />`.
      - `SmartImportModal.jsx`: đổi chữ ký thêm `allTags`; thêm `allTags={allTags}` cho **cả 2** chỗ `<ClassificationPicker ...>` (khối `bulkCls` và khối per-result).

- [ ] Bước 4: Build + kiểm GUI (Thầy chạy `npx tauri dev`)
      Chạy: `CI=true npm run build` → 0 warning.
      Checklist GUI: mở Thêm bài → gõ `cuc` thấy gợi ý (nếu có tag cũ) · Enter tạo viên · ✕ xoá viên · Sửa một bài có tag cũ thấy đúng viên · Lưu rồi mở lại thấy tag còn nguyên.

- [ ] Bước 5: Lưu tiến độ
      Chạy: `git add -A && git commit -m "feat(tag): o nhap tag kieu chip + goi y (TagChipInput) noi vao form"`

---

### Task 4: Lọc bài theo nhiều tag (VÀ / HOẶC)

**What you'll have when this is done:** Cột lọc trái có mục "Tag": chọn nhiều tag, gạt VÀ/HOẶC, feed lọc đúng.

- [ ] Bước 1: Thêm state vào `src/hooks/useUIState.js`
      - Thêm: `const [filterTags, setFilterTags] = useState([]);` và `const [filterTagMode, setFilterTagMode] = useState('and');`
      - Thêm hàm bật/tắt 1 tag:
        ```js
        const toggleFilterTag = (tag) =>
          setFilterTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
        ```
      - Trong `clearFilters`, thêm: `setFilterTags([]); setFilterTagMode('and');`
      - Ở `return { ... }`, xuất thêm: `filterTags, setFilterTags, toggleFilterTag, filterTagMode, setFilterTagMode,`
      - *(Giữ nguyên `selectHe` — tag là toàn cục, không reset theo hệ.)*

- [ ] Bước 2: Thêm mục "Tag" vào `src/components/FilterSidebar.jsx`
      - Đổi chữ ký nhận thêm: `allTags = [], filterTags = [], filterTagMode = 'and', onToggleTag, onSetTagMode` (thêm vào danh sách props).
      - Thêm `import React, { useMemo, useState } from 'react';` (đã có `useState`). Trong component thêm: `const [tagQuery, setTagQuery] = useState('');`
      - Ngay TRƯỚC ô "Chỉ hiện bài chưa dùng", chèn khối:
        ```jsx
        {allTags.length > 0 && (
          <div>
            <div className="sidebar-label">Tag</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <button className={`chip ${filterTagMode === 'and' ? 'on' : ''}`} onClick={() => onSetTagMode('and')}>Đủ mọi tag</button>
              <button className={`chip ${filterTagMode === 'or' ? 'on' : ''}`} onClick={() => onSetTagMode('or')}>Bất kỳ tag</button>
            </div>
            <input value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} placeholder="tìm tag…"
              style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: 6 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {allTags
                .filter((it) => filterTags.includes(it.tag) || it.tag.toLowerCase().includes(tagQuery.trim().toLowerCase()))
                .map((it) => (
                  <button key={it.tag} className={`chip ${filterTags.includes(it.tag) ? 'on' : ''}`} onClick={() => onToggleTag(it.tag)}>
                    {it.tag} ({it.count})
                  </button>
                ))}
            </div>
            {filterTags.length > 0 && (
              <button className="card-btn" style={{ marginTop: 6 }} onClick={() => filterTags.forEach(onToggleTag)}>Bỏ chọn tag</button>
            )}
          </div>
        )}
        ```

- [ ] Bước 3: Áp lọc trong `src/components/DataGrid.jsx`
      - Thêm import: `import { parseTags, matchTagFilter } from '../utils/tagUtils';`
      - Đổi chữ ký nhận thêm: `filterTags = [], filterTagMode = 'and'` (thêm vào danh sách props).
      - Trong `filteredAndSorted`, thêm một dòng lọc (sau dòng `filterDifficulty`):
        `if (!matchTagFilter(parseTags(p.tags), filterTags, filterTagMode)) return false;`
      - Thêm `filterTags, filterTagMode` vào mảng dependency của `useMemo` `filteredAndSorted`.

- [ ] Bước 4: Nối props ở `src/App.jsx`
      - `<FilterSidebar ...>` thêm: `allTags={tagIndex} filterTags={ui.filterTags} onToggleTag={ui.toggleFilterTag} filterTagMode={ui.filterTagMode} onSetTagMode={ui.setFilterTagMode}`
      - `<DataGrid ...>` thêm: `filterTags={ui.filterTags} filterTagMode={ui.filterTagMode}`

- [ ] Bước 5: Build + kiểm GUI + lưu
      Chạy: `CI=true npm run build` → 0 warning.
      GUI: chọn 2 tag, gạt **Đủ mọi tag** (VÀ) vs **Bất kỳ tag** (HOẶC) thấy số bài đổi đúng; "Xoá lọc" xoá cả tag.
      Chạy: `git add -A && git commit -m "feat(tag): loc bai theo nhieu tag (VA/HOAC) o cot loc"`

---

### Task 5: Đường ghi đổi tên / xoá tag hàng loạt (báo lỗi thật)

**What you'll have when this is done:** Hai hàm `renameTag` / `deleteTag` sửa tag trên mọi bài liên quan, trả `true/false` trung thực (bám Đợt A #1) — chưa có UI, sẽ dùng ở Task 6.

- [ ] Bước 1: Helper ghi 1 cột `tags` — `src/utils/problemWrites.js`
      Thêm hàm (đặt cạnh `updateProblemRow`):
      ```js
      // Chỉ đụng cột tags của MỘT bài (dùng cho đổi tên/xoá tag hàng loạt).
      export const updateProblemTags = async (db, id, tagsStr) => {
        await db.execute(`UPDATE problems SET tags = $1 WHERE id = $2`, [tagsStr, id]);
      };
      ```

- [ ] Bước 2: `renameTag` / `deleteTag` trong `src/hooks/useProblems.js`
      - Thêm import: `import { applyTagRename, applyTagDelete } from '../utils/tagUtils';` và thêm `updateProblemTags` vào cụm import từ `../utils/problemWrites`.
      - Thêm 2 hàm (đặt gần các hàm ghi khác); trả `true/false`, ghi từng bài bị ảnh hưởng rồi nạp lại:
        ```js
        // Đổi tên (kiêm gộp) 1 tag trên MỌI bài đang dùng. Trả true nếu ghi xong hết.
        const renameTag = async (oldTag, newTag) => {
          try {
            const db = await getDb();
            for (const p of problems) {
              const next = applyTagRename(p.tags || '', oldTag, newTag);
              if (next !== (p.tags || '')) await updateProblemTags(db, p.id, next);
            }
            await loadProblems();
            return true;
          } catch (error) { console.error('Lỗi đổi tên tag:', error); return false; }
        };

        // Xoá 1 tag khỏi MỌI bài. Trả true nếu ghi xong hết.
        const deleteTag = async (tag) => {
          try {
            const db = await getDb();
            for (const p of problems) {
              const next = applyTagDelete(p.tags || '', tag);
              if (next !== (p.tags || '')) await updateProblemTags(db, p.id, next);
            }
            await loadProblems();
            return true;
          } catch (error) { console.error('Lỗi xoá tag:', error); return false; }
        };
        ```
      - Thêm `renameTag, deleteTag` vào object `return { ... }` của hook.

- [ ] Bước 3: Build sạch (chưa có UI gọi, chỉ chắc không lỗi biên dịch)
      Chạy: `CI=true npm run build` → `Compiled successfully`, 0 warning.

- [ ] Bước 4: Lưu tiến độ
      Chạy: `git add -A && git commit -m "feat(tag): duong ghi doi ten/xoa tag hang loat (bao loi that)"`

---

### Task 6: Màn quản lý tag + mở từ Cài đặt

**What you'll have when this is done:** Nút "Quản lý tag" trong Cài đặt mở modal liệt kê tag + số bài, đổi tên/gộp/xoá trên toàn kho, có xác nhận + báo lỗi thật. Đồng thời gỡ Row "Cỡ chữ — Sắp có" (món đã bỏ).

- [ ] Bước 1: Tạo `src/components/Modals/TagManagerModal.jsx`
      ```jsx
      import React, { useMemo, useState } from 'react';
      import { X } from 'lucide-react';
      import { buildTagIndex } from '../../utils/tagUtils';
      import { normalizeVi } from '../../utils/searchText';
      import { useToast } from '../../hooks/useToast';
      import { useConfirm } from '../ConfirmProvider';

      const TagManagerModal = ({ problems = [], onRenameTag, onDeleteTag, onClose }) => {
        const [query, setQuery] = useState('');
        const [sort, setSort] = useState('az');      // 'az' | 'count'
        const [editing, setEditing] = useState(null); // tag đang đổi tên
        const [draft, setDraft] = useState('');
        const { success, error } = useToast();
        const confirm = useConfirm();

        const rows = useMemo(() => {
          let idx = buildTagIndex(problems);
          const q = normalizeVi(query).trim();
          if (q) idx = idx.filter((it) => normalizeVi(it.tag).includes(q));
          if (sort === 'az') idx = [...idx].sort((a, b) => normalizeVi(a.tag).localeCompare(normalizeVi(b.tag)));
          return idx; // 'count' đã là mặc định của buildTagIndex
        }, [problems, query, sort]);

        const doRename = async (row) => {
          const nt = draft.trim();
          if (!nt || nt === row.tag) { setEditing(null); return; }
          if (!(await confirm({ title: 'Đổi tên tag', message: `Đổi '${row.tag}' → '${nt}' trên ${row.count} bài?`, confirmLabel: 'Đổi' }))) return;
          if (await onRenameTag(row.tag, nt)) success(`Đã đổi '${row.tag}' → '${nt}'`);
          else error('Chưa đổi được — thử lại nhé.');
          setEditing(null);
        };
        const doDelete = async (row) => {
          if (!(await confirm({ title: 'Xoá tag', message: `Gỡ tag '${row.tag}' khỏi ${row.count} bài? (không xoá bài)`, danger: true, confirmLabel: 'Xoá' }))) return;
          if (await onDeleteTag(row.tag)) success(`Đã gỡ tag '${row.tag}'`);
          else error('Chưa xoá được — thử lại nhé.');
        };

        return (
          <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: '92vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg, 12px)', border: '1px solid var(--color-border)', padding: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, color: 'var(--color-text)' }}>Quản lý tag</h3>
                <button className="card-btn" onClick={onClose}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tag…"
                  style={{ flex: 1, padding: '0.5rem', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }} />
                <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                  <option value="az">A → Z</option>
                  <option value="count">Số bài</option>
                </select>
              </div>
              <div style={{ overflowY: 'auto' }}>
                {rows.length === 0 && <div style={{ color: 'var(--color-text-muted)', padding: '1rem', textAlign: 'center' }}>Chưa có tag nào.</div>}
                {rows.map((row) => (
                  <div key={row.tag} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {editing === row.tag ? (
                      <>
                        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') doRename(row); if (e.key === 'Escape') setEditing(null); }}
                          style={{ flex: 1, padding: '0.35rem', borderRadius: 6, border: '1px solid var(--color-cobalt)', background: 'var(--color-surface)', color: 'var(--color-text)' }} />
                        <button className="card-btn card-btn-primary" onClick={() => doRename(row)}>Lưu</button>
                        <button className="card-btn" onClick={() => setEditing(null)}>Huỷ</button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, color: 'var(--color-text)' }}>{row.tag}</span>
                        <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.82rem', minWidth: 52, textAlign: 'right' }}>{row.count} bài</span>
                        <button className="card-btn" onClick={() => { setEditing(row.tag); setDraft(row.tag); }}>Đổi tên</button>
                        <button className="card-btn card-btn-danger" onClick={() => doDelete(row)}>Xoá</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      };

      export default TagManagerModal;
      ```
      *(Nếu class overlay/nút của dự án khác tên, canh theo modal có sẵn như `CategoryManagerModal.jsx` khi build.)*

- [ ] Bước 2: State mở modal — `src/hooks/useUIState.js`
      - Thêm: `const [showTagManager, setShowTagManager] = useState(false);`
      - Xuất trong `return`: `showTagManager, setShowTagManager,`

- [ ] Bước 3: Thêm Row "Quản lý tag" + gỡ Row "Cỡ chữ" — `src/components/SettingsPage.jsx`
      - Đổi chữ ký: `const SettingsPage = ({ onManageCategories, onManageTags }) => {`
      - Thêm import icon: trong dòng `import { FolderTree, Moon, Type, ... }` thêm `Tag` (từ `lucide-react`).
      - Ngay dưới Row "Quản lý phân loại", thêm:
        ```jsx
        <Row
          icon={<Tag size={20} />}
          title="Quản lý tag"
          desc="Xem danh sách tag + số bài; đổi tên, gộp, xoá tag trên toàn kho."
          action={<button className="card-btn card-btn-primary" onClick={onManageTags}>Mở</button>}
        />
        ```
      - **Gỡ** hẳn dòng Row "Cỡ chữ — Sắp có": `<Row icon={<Type size={20} />} title="Cỡ chữ" desc="Phóng to/thu nhỏ chữ toàn app." soon />` (và bỏ `Type` khỏi import nếu không còn dùng chỗ nào khác — kiểm lại để tránh cảnh báo unused).

- [ ] Bước 4: Nối ở `src/App.jsx`
      - Import: `import TagManagerModal from './components/Modals/TagManagerModal';`
      - Lấy thêm từ hook: trong cụm `const { ... } = useProblems();` thêm `renameTag, deleteTag`.
      - `<SettingsPage ... />` → thêm prop: `onManageTags={() => ui.setShowTagManager(true)}`
      - Thêm render modal (cạnh `CategoryManagerModal`):
        ```jsx
        {ui.showTagManager && (
          <TagManagerModal
            problems={problems}
            onRenameTag={renameTag}
            onDeleteTag={deleteTag}
            onClose={() => ui.setShowTagManager(false)}
          />
        )}
        ```

- [ ] Bước 5: Build + kiểm GUI (Thầy chạy `npx tauri dev`)
      Chạy: `CI=true npm run build` → 0 warning.
      Checklist: Cài đặt → "Quản lý tag" → thấy 5 tag + số bài đúng · đổi `Định lý Fermat` → `Fermat` (xác nhận "trên 1 bài") → còn 4 bài `Fermat` (đã gộp) · Xoá một tag hỏi xác nhận rồi gỡ · KHÔNG còn Row "Cỡ chữ".

- [ ] Bước 6: Lưu tiến độ
      Chạy: `git add -A && git commit -m "feat(tag): man quan ly tag (doi ten/gop/xoa) mo tu Cai dat + don Row co chu"`

---

### Task 7: Nghiệm thu tổng + an toàn LaTeX + tài liệu + merge

**What you'll have when this is done:** Bằng chứng cả kho vẫn nguyên, xuất `.tex` không hỏng, tài liệu cập nhật, nhánh gộp về `master`.

- [ ] Bước 1: Test toàn bộ + build
      Chạy: `CI=true npm test` → tất cả XANH (94 cũ + ca tag mới); **golden `buildContentFile` KHÔNG đổi**.
      Chạy: `CI=true npm run build` → 0 warning.

- [ ] Bước 2: **An toàn LaTeX (bắt buộc)** — chứng minh ghi tag KHÔNG hỏng nội dung bài (Thầy làm trong `npx tauri dev`)
      1. Thêm 1 bài có công thức, ví dụ đề chứa `$x^2 + y^2 = z^2$`, gắn tag `kiemtra-latex`.
      2. Vào **Quản lý tag** → đổi tên `kiemtra-latex` → `pytago`.
      3. Đưa bài đó vào Giỏ → **Xuất `.tex`** → mở file, xác nhận `$x^2 + y^2 = z^2$` còn **nguyên vẹn** (chỉ tag đổi, nội dung không suy suyển).

- [ ] Bước 3: Rà đúng phạm vi (không chạm đường xuất/DB-schema/Rust)
      Chạy: `git diff --name-only master`
      Sẽ thấy: chỉ các file trong danh sách đầu plan. **KHÔNG** có `buildProblemTex.js` / `buildContentFile.js` / `db.js` / thư mục `src-tauri/`.

- [ ] Bước 4: Cập nhật tài liệu
      - `.docs/ROADMAP.md` — đánh dấu mục "Quản lý tag + gợi ý khi gõ" là **XONG (14/07/2026)**, ghi thêm đã mở rộng *lọc đa-tag VÀ/HOẶC*.
      - Viết nhật ký mới `.docs/32_2026_07_14.md` theo nếp NK: bước ngoặt (bỏ gộp-nhiều-tag, thêm lọc đa-tag), kiểm dữ liệu thật (5 tag/7 bài), các commit, kết quả test/build, checklist nghiệm thu.

- [ ] Bước 5: Gộp về master
      Chạy: `git add -A && git commit -m "docs: roadmap + nhat ky 32 (quan ly tag, Dot B)"`
      Chạy: `git checkout master && git merge --no-ff feat-quan-ly-tag -m "Merge: quan ly tag + goi y + loc da-tag (Dot B, NK32)"`
      *(Chỉ merge sau khi Thầy đã nghiệm thu GUI ở Task 3/4/6 và bước 2 ở trên.)*

---

## Ready to Build

Kế hoạch đã lưu. Cách làm tiếp:

1. Đọc hết plan một lượt trước khi bắt đầu.
2. Làm theo thứ tự task — không nhảy cóc (Task 2 là nền cho mọi task sau).
3. Làm xong bước "kiểm/Build" của mỗi task rồi mới sang task kế.
4. Chỗ nào cần chạy `npx tauri dev` để xem GUI là phần Thầy nghiệm thu (Claude không tự mở được Tauri + SQL).
5. Nếu có gì lệch kỳ vọng, dừng và mô tả cái thấy — đừng sửa mò.

Nói **"bắt đầu build"** khi Thầy sẵn sàng làm Task 1.
