import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { parseTags, serializeTags, suggestTags } from '../utils/tagUtils';

// Ô nhập tag kiểu viên (chip) + gợi ý.
//   value    = chuỗi tag ngăn phẩy (như lưu trong DB)
//   onChange = (chuỗi mới) => void
//   allTags  = [{ tag, count }] danh sách gợi ý (toàn kho)
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
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: 4, background: 'var(--color-surface)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 180, overflowY: 'auto' }}>
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
