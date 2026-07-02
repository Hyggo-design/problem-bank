// Xoay vòng bản tự-động-sao-lưu: quyết định nên xoá file nào.
// THUẦN — KHÔNG import db.js/useTaxonomy (giữ để Jest chạy được).
// Mẫu tương tự: findDuplicates.js, searchText.js.

export const AUTO_PREFIX = 'problem_bank-auto-';

// 'YYYY-MM-DD' theo NGÀY ĐỊA PHƯƠNG (để "hôm nay" khớp lịch của Thầy).
export const localDateStamp = (date = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};

// Tên file backup của một ngày.
export const backupFileName = (stamp) => `${AUTO_PREFIX}${stamp}.db`;

// Lấy stamp 'YYYY-MM-DD' từ tên file, hoặc null nếu KHÔNG đúng mẫu.
export const parseBackupStamp = (name) => {
  const m = /^problem_bank-auto-(\d{4})-(\d{2})-(\d{2})\.db$/.exec(name);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

// Số ngày (nguyên) từ stamp a -> stamp b. Dùng UTC để không lệch do giờ mùa hè.
export const daysBetween = (a, b) => {
  const toUTC = (s) => {
    const [y, mo, d] = s.split('-').map(Number);
    return Date.UTC(y, mo - 1, d);
  };
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
};

// Danh sách file cần XOÁ: cũ hơn keepDays ngày so với today,
// LUÔN giữ lại bản mới nhất (stamp lớn nhất), bỏ qua mọi file lạ.
export const pickBackupsToDelete = (filenames = [], today, keepDays = 14) => {
  const stamped = filenames
    .map((f) => ({ f, s: parseBackupStamp(f) }))
    .filter((x) => x.s !== null);
  if (stamped.length <= 1) return []; // 0 hoặc 1 bản -> luôn giữ, không xoá gì
  const newest = stamped.reduce((best, x) => (x.s > best.s ? x : best)).f;
  return stamped
    .filter((x) => x.f !== newest && daysBetween(x.s, today) > keepDays)
    .map((x) => x.f);
};
