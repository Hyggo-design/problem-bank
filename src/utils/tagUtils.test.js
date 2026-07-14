import {
  parseTags, serializeTags, buildTagIndex, suggestTags,
  applyTagRename, applyTagDelete, matchTagFilter,
} from './tagUtils';

test('parseTags: trim, bỏ rỗng, khử trùng, giữ thứ tự', () => {
  expect(parseTags('a, , b ,a')).toEqual(['a', 'b']);
  expect(parseTags('')).toEqual([]);
  expect(parseTags('  cực trị ,  hình nón ')).toEqual(['cực trị', 'hình nón']);
});

test('serializeTags: nối bằng ", "', () => {
  expect(serializeTags(['a', 'b'])).toBe('a, b');
  expect(serializeTags([])).toBe('');
});

test('parse ↔ serialize khứ hồi giữ đúng nội dung', () => {
  expect(serializeTags(parseTags('a, a, b'))).toBe('a, b');
});

test('buildTagIndex: đếm số BÀI mỗi tag (1 bài ghi 2 lần vẫn +1)', () => {
  const idx = buildTagIndex([{ tags: 'a, a, b' }, { tags: 'b' }, { tags: '' }, { tags: null }]);
  expect(idx.find((x) => x.tag === 'a').count).toBe(1);
  expect(idx.find((x) => x.tag === 'b').count).toBe(2);
});

test('buildTagIndex: phân biệt chuỗi chính xác (Fermat ≠ Định lý Fermat)', () => {
  const idx = buildTagIndex([{ tags: 'Fermat' }, { tags: 'Định lý Fermat' }, { tags: 'Fermat' }]);
  expect(idx.find((x) => x.tag === 'Fermat').count).toBe(2);
  expect(idx.find((x) => x.tag === 'Định lý Fermat').count).toBe(1);
});

test('suggestTags: khớp không dấu, bỏ tag đã chọn, khớp-đầu trước', () => {
  const idx = [{ tag: 'cực trị', count: 5 }, { tag: 'bất đẳng thức cực', count: 1 }];
  const s = suggestTags(idx, 'cuc', []);
  expect(s[0].tag).toBe('cực trị'); // khớp đầu chuỗi trước khớp giữa
  expect(s.map((x) => x.tag)).toContain('bất đẳng thức cực');
  expect(suggestTags(idx, 'cuc', ['cực trị'])).toHaveLength(1); // bỏ tag đã chọn
});

test('suggestTags: query rỗng trả tag phổ biến chưa chọn', () => {
  const idx = [{ tag: 'a', count: 5 }, { tag: 'b', count: 2 }];
  expect(suggestTags(idx, '', ['a']).map((x) => x.tag)).toEqual(['b']);
});

test('applyTagRename: đổi thường + GỘP khi trùng tên + bài không chứa giữ nguyên', () => {
  expect(applyTagRename('a, b', 'a', 'c')).toBe('c, b');
  expect(applyTagRename('a, b', 'a', 'b')).toBe('b'); // gộp: bài lỡ có cả hai chỉ giữ 1
  expect(applyTagRename('x', 'a', 'b')).toBe('x');
  expect(applyTagRename('Fermat', 'Fermat', 'fermat')).toBe('fermat'); // chỉ khác hoa/thường
});

test('applyTagDelete: bỏ đúng tag, bỏ dấu phẩy thừa', () => {
  expect(applyTagDelete('a, b, c', 'b')).toBe('a, c');
  expect(applyTagDelete('a', 'a')).toBe('');
});

test('matchTagFilter: rỗng=true, and đủ mọi, or bất kỳ', () => {
  expect(matchTagFilter(['a', 'b'], [], 'and')).toBe(true);
  expect(matchTagFilter(['a', 'b'], ['a', 'b'], 'and')).toBe(true);
  expect(matchTagFilter(['a'], ['a', 'b'], 'and')).toBe(false);
  expect(matchTagFilter(['a'], ['a', 'b'], 'or')).toBe(true);
  expect(matchTagFilter([], ['a'], 'or')).toBe(false);
});
