import { rangeIds, unionSelection, clampIndex } from './feedSelection';

const ids = ['a', 'b', 'c', 'd', 'e'];

describe('rangeIds — dải id giữa 2 mốc (bao gồm 2 đầu)', () => {
  test('xuôi', () => expect(rangeIds(ids, 1, 3)).toEqual(['b', 'c', 'd']));
  test('ngược cho kết quả như xuôi', () => expect(rangeIds(ids, 3, 1)).toEqual(['b', 'c', 'd']));
  test('một phần tử', () => expect(rangeIds(ids, 2, 2)).toEqual(['c']));
  test('cả hai đầu', () => expect(rangeIds(ids, 0, 4)).toEqual(['a', 'b', 'c', 'd', 'e']));
  test('index âm -> rỗng', () => expect(rangeIds(ids, -1, 3)).toEqual([]));
});

describe('unionSelection — gộp không trùng, giữ thứ tự cũ', () => {
  test('thêm mới nối sau cũ', () => expect(unionSelection(['a', 'b'], ['b', 'c', 'd'])).toEqual(['a', 'b', 'c', 'd']));
  test('thêm vào rỗng', () => expect(unionSelection([], ['x', 'y'])).toEqual(['x', 'y']));
  test('add rỗng giữ nguyên', () => expect(unionSelection(['a'], [])).toEqual(['a']));
  test('add trùng hết -> không đổi', () => expect(unionSelection(['a', 'b'], ['a', 'b'])).toEqual(['a', 'b']));
});

describe('clampIndex — kẹp trong [0, len-1]', () => {
  test('trong biên', () => expect(clampIndex(2, 5)).toBe(2));
  test('tràn trên', () => expect(clampIndex(9, 5)).toBe(4));
  test('tràn dưới', () => expect(clampIndex(-3, 5)).toBe(0));
  test('len 0 -> -1', () => expect(clampIndex(0, 0)).toBe(-1));
});
