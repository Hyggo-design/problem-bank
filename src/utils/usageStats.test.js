import { getRecentUsageByProblemId } from './usageStats';

const NOW = new Date('2026-07-03T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

test('bài xuất trong hạn 30 ngày -> có badge, kèm tên file', () => {
  const history = [{ export_date: daysAgo(5), template_name: 'NoiDung.tex', problem_ids: ['a'] }];
  const result = getRecentUsageByProblemId(history, NOW);
  expect(result.a).toEqual({ fileName: 'NoiDung.tex', exportDate: daysAgo(5), exportTime: expect.any(Number) });
});

test('bài xuất quá 30 ngày -> KHÔNG có trong map (badge tự ẩn)', () => {
  const history = [{ export_date: daysAgo(31), template_name: 'Cu.tex', problem_ids: ['a'] }];
  expect(getRecentUsageByProblemId(history, NOW).a).toBeUndefined();
});

test('đúng ranh giới 30 ngày -> vẫn còn trong hạn (tính cả ngày thứ 30)', () => {
  const history = [{ export_date: daysAgo(30), template_name: 'Bien.tex', problem_ids: ['a'] }];
  expect(getRecentUsageByProblemId(history, NOW).a.fileName).toBe('Bien.tex');
});

test('xuất nhiều lần trong hạn cùng 1 bài -> chỉ giữ tên file lần GẦN NHẤT', () => {
  const history = [
    { export_date: daysAgo(20), template_name: 'Cu.tex', problem_ids: ['a'] },
    { export_date: daysAgo(2), template_name: 'MoiNhat.tex', problem_ids: ['a'] },
    { export_date: daysAgo(10), template_name: 'Giua.tex', problem_ids: ['a'] },
  ];
  expect(getRecentUsageByProblemId(history, NOW).a.fileName).toBe('MoiNhat.tex');
});

test('1 lần xuất trong hạn + 1 lần rất cũ ngoài hạn, cùng bài -> chỉ tính lần trong hạn', () => {
  const history = [
    { export_date: daysAgo(200), template_name: 'RatCu.tex', problem_ids: ['a'] },
    { export_date: daysAgo(1), template_name: 'GanDay.tex', problem_ids: ['a'] },
  ];
  expect(getRecentUsageByProblemId(history, NOW).a.fileName).toBe('GanDay.tex');
});

test('bài chưa từng xuất -> không có trong map', () => {
  const history = [{ export_date: daysAgo(1), template_name: 'X.tex', problem_ids: ['a'] }];
  expect(getRecentUsageByProblemId(history, NOW)['chua-tung-dung']).toBeUndefined();
});

test('chưa xuất đề nào -> map rỗng', () => {
  expect(getRecentUsageByProblemId([], NOW)).toEqual({});
});

test('lịch sử rỗng/thiếu problem_ids -> không lỗi, vẫn ra map hợp lệ', () => {
  expect(getRecentUsageByProblemId(undefined, NOW)).toEqual({});
  expect(getRecentUsageByProblemId([{ export_date: daysAgo(1), problem_ids: undefined }], NOW)).toEqual({});
});
