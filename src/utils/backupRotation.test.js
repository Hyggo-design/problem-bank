import {
  localDateStamp, backupFileName, parseBackupStamp, daysBetween, pickBackupsToDelete,
} from './backupRotation';

test('localDateStamp: định dạng YYYY-MM-DD, đủ số 0', () => {
  expect(localDateStamp(new Date(2026, 6, 2))).toBe('2026-07-02'); // tháng 7 = index 6
  expect(localDateStamp(new Date(2026, 0, 5))).toBe('2026-01-05');
});

test('backupFileName + parseBackupStamp: đi và về khớp nhau', () => {
  expect(backupFileName('2026-07-02')).toBe('problem_bank-auto-2026-07-02.db');
  expect(parseBackupStamp('problem_bank-auto-2026-07-02.db')).toBe('2026-07-02');
});

test('parseBackupStamp: file lạ -> null (không đụng tới)', () => {
  expect(parseBackupStamp('problem_bank-autobackup.db')).toBeNull();      // phòng hờ của Khôi phục
  expect(parseBackupStamp('problem_bank-backup-2026-07-02.db')).toBeNull(); // của "Sao lưu ngay"
  expect(parseBackupStamp('ghichu.txt')).toBeNull();
});

test('daysBetween: đếm đúng số ngày', () => {
  expect(daysBetween('2026-07-01', '2026-07-15')).toBe(14);
  expect(daysBetween('2026-06-30', '2026-07-15')).toBe(15);
});

test('pickBackupsToDelete: rỗng / chỉ 1 bản -> không xoá gì', () => {
  expect(pickBackupsToDelete([], '2026-07-15')).toEqual([]);
  expect(pickBackupsToDelete(['problem_bank-auto-2026-01-01.db'], '2026-07-15')).toEqual([]);
});

test('pickBackupsToDelete: xoá bản > 14 ngày, giữ bản trong hạn', () => {
  const files = [
    'problem_bank-auto-2026-07-15.db', // hôm nay
    'problem_bank-auto-2026-07-10.db', // 5 ngày -> giữ
    'problem_bank-auto-2026-06-30.db', // 15 ngày -> xoá
  ];
  expect(pickBackupsToDelete(files, '2026-07-15', 14))
    .toEqual(['problem_bank-auto-2026-06-30.db']);
});

test('pickBackupsToDelete: ranh giới đúng 14 ngày -> GIỮ, 15 ngày -> XOÁ', () => {
  const files = [
    'problem_bank-auto-2026-07-15.db',
    'problem_bank-auto-2026-07-01.db', // đúng 14 ngày -> giữ
    'problem_bank-auto-2026-06-30.db', // 15 ngày -> xoá
  ];
  expect(pickBackupsToDelete(files, '2026-07-15', 14))
    .toEqual(['problem_bank-auto-2026-06-30.db']);
});

test('pickBackupsToDelete: TẤT CẢ đều cũ -> vẫn giữ đúng 1 bản mới nhất', () => {
  const files = [
    'problem_bank-auto-2026-01-01.db',
    'problem_bank-auto-2026-01-05.db', // mới nhất trong đám -> giữ
    'problem_bank-auto-2025-12-20.db',
  ];
  expect(pickBackupsToDelete(files, '2026-07-15', 14).sort())
    .toEqual(['problem_bank-auto-2025-12-20.db', 'problem_bank-auto-2026-01-01.db'].sort());
});

test('pickBackupsToDelete: bỏ qua file lạ, chỉ xoá bản auto quá hạn', () => {
  const files = [
    'problem_bank-auto-2026-07-15.db',
    'problem_bank-auto-2026-06-01.db', // cũ -> xoá
    'problem_bank-autobackup.db',      // KHÔNG đụng
    'ghichu.txt',                      // KHÔNG đụng
  ];
  expect(pickBackupsToDelete(files, '2026-07-15', 14))
    .toEqual(['problem_bank-auto-2026-06-01.db']);
});
