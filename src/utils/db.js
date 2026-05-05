import Database from '@tauri-apps/plugin-sql';

let dbPromise = null;

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const db = await Database.load('sqlite:problem_bank.db');
        
        // =========================================================================
        // 🛠️ CHẾ ĐỘ TESTING: Bỏ comment dòng dưới để XÓA SẠCH dữ liệu và cấu trúc cũ
        // await db.execute(`DROP TABLE IF EXISTS problems;`);
        
        // 1. Tạo bảng (Đã thêm cột metadata để Thầy mở rộng sau này)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS problems (
            id TEXT PRIMARY KEY,
            statement TEXT,
            solution TEXT,
            topic TEXT,
            level INTEGER,
            tags TEXT,
            dateAdded TEXT,
            timesUsed INTEGER,
            type TEXT,
            shortAnswer TEXT,
            options TEXT,
            metadata TEXT 
          )
        `);

        // 🛠️ MIGRATION: Tự động fix lỗi "no column named metadata" mà không cần tìm file ổ C
        try {
          await db.execute(`ALTER TABLE problems ADD COLUMN metadata TEXT DEFAULT '{}'`);
        } catch (e) {
          // Nếu cột đã có sẵn, SQLite ném lỗi -> Bắt lỗi và bỏ qua an toàn
        }

        // 2. TẠO INDEX (Đánh mục lục giúp tìm kiếm 10.000 bài trong chớp mắt)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_topic ON problems(topic);`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_level ON problems(level);`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_date ON problems(dateAdded);`);

        return db;
      } catch (error) {
        console.error("🚨 Lỗi khởi tạo SQLite:", error);
        throw error;
      }
    })();
  }
  return dbPromise;
};