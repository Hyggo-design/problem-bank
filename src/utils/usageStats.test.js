import { countUsageByProblemId } from './usageStats';

test('bài xuất hiện ở 2 lần xuất khác nhau -> đếm 2', () => {
  const history = [
    { problem_ids: ['a', 'b'] },
    { problem_ids: ['a', 'c'] },
  ];
  expect(countUsageByProblemId(history)).toEqual({ a: 2, b: 1, c: 1 });
});

test('bài chưa từng nằm trong đề nào -> không có trong map', () => {
  const history = [{ problem_ids: ['a'] }];
  expect(countUsageByProblemId(history)['chua-tung-dung']).toBeUndefined();
});

test('chưa xuất đề nào -> map rỗng', () => {
  expect(countUsageByProblemId([])).toEqual({});
});

test('lịch sử rỗng/thiếu problem_ids -> không lỗi, vẫn ra map hợp lệ', () => {
  expect(countUsageByProblemId(undefined)).toEqual({});
  expect(countUsageByProblemId([{ problem_ids: undefined }])).toEqual({});
});
