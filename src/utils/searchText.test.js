import { normalizeVi, makeSearchFields, matchFields } from './searchText';

const fields = (statement, solution = '', tags = '') =>
  makeSearchFields({ statement, solution, tags });

test('normalizeVi: bỏ dấu tiếng Việt + thường hóa', () => {
  expect(normalizeVi('Phương Trình')).toBe('phuong trinh');
  expect(normalizeVi('Đường tròn ngoại tiếp')).toBe('duong tron ngoai tiep');
});

test('normalizeVi: giữ nguyên ký tự LaTeX/ASCII', () => {
  expect(normalizeVi('\\frac{1}{2} + x^2')).toBe('\\frac{1}{2} + x^2');
});

test('matchFields: 1 từ ở ĐỀ → khớp, không gắn nhãn', () => {
  const r = matchFields(fields('Giải phương trình bậc hai'), 'phuong trinh');
  expect(r.matched).toBe(true);
  expect(r.hitFields).toEqual([]);
});

test('matchFields: 1 từ chỉ ở LỜI GIẢI → khớp, nhãn solution', () => {
  const r = matchFields(fields('Cho tam giác ABC', 'Áp dụng định lý Pytago'), 'pytago');
  expect(r.matched).toBe(true);
  expect(r.hitFields).toEqual(['solution']);
});

test('matchFields: nhiều từ khớp TẤT CẢ, rải rác đề + lời giải', () => {
  const r = matchFields(fields('Cho parabol (P)', 'Viết phương trình tiếp tuyến của (P)'), 'parabol tiep tuyen');
  expect(r.matched).toBe(true);
});

test('matchFields: thiếu 1 từ → không khớp', () => {
  const r = matchFields(fields('Cho parabol (P)', 'Tính diện tích'), 'parabol tiep tuyen');
  expect(r.matched).toBe(false);
});

test('matchFields: gõ không dấu khớp nội dung có dấu', () => {
  const r = matchFields(fields('Đường tròn nội tiếp tam giác'), 'duong tron');
  expect(r.matched).toBe(true);
});

test('matchFields: query rỗng → khớp (không lọc)', () => {
  const r = matchFields(fields('Bất kỳ'), '   ');
  expect(r.matched).toBe(true);
  expect(r.hitFields).toEqual([]);
});

test('matchFields: từ khóa ở cả đề lẫn lời giải → không gắn nhãn thừa', () => {
  const r = matchFields(fields('Tính tích phân', 'Tích phân từng phần'), 'tich phan');
  expect(r.matched).toBe(true);
  expect(r.hitFields).toEqual([]);
});
