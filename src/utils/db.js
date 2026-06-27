import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';

let dbPromise = null;

// Tạo sẵn 4 hệ mặc định + thang độ khó + danh sách lớp khi database còn trống.
// Có guard đếm số dòng nên chạy nhiều lần vẫn an toàn (chỉ seed đúng một lần).
const seedTaxonomy = async (db) => {
  const rows = await db.select('SELECT COUNT(*) AS n FROM categories');
  if (rows[0].n > 0) return; // đã có dữ liệu phân loại -> không seed lại

  const heList = ['Toán THCS', 'Toán THPT', 'Toán Chuyên', 'Olympic'];
  const diffDefault = ['Cơ bản', 'Trung bình', 'Nâng cao'];

  for (let i = 0; i < heList.length; i++) {
    const heId = crypto.randomUUID();
    await db.execute(
      'INSERT INTO categories (id, name, parent_id, position, created_at) VALUES ($1, $2, NULL, $3, $4)',
      [heId, heList[i], i, new Date().toISOString()]
    );
    for (let j = 0; j < diffDefault.length; j++) {
      await db.execute(
        'INSERT INTO difficulty_levels (id, he_id, name, position) VALUES ($1, $2, $3, $4)',
        [crypto.randomUUID(), heId, diffDefault[j], j]
      );
    }
  }

  // Lớp 5 → 12: bắt đầu từ 5 để phục vụ các kỳ olympic dành cho tiểu học.
  // position = số lớp nên Lớp 5 luôn đứng đầu khi ORDER BY position.
  for (let g = 5; g <= 12; g++) {
    await db.execute(
      'INSERT INTO grades (id, name, position) VALUES ($1, $2, $3)',
      [crypto.randomUUID(), 'Lớp ' + g, g]
    );
  }
};

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        // Nạp DB từ ổ D (Thầy yêu cầu — ổ C đầy). Tạo thư mục trước; lỗi (không có ổ D) -> quay về thư mục app trên C.
        const folder = localStorage.getItem('pb-db-folder') || 'D:\\0. Problems Bank\\app-data';
        let db;
        try {
          await invoke('ensure_dir', { path: folder });
          db = await Database.load(`sqlite:${folder}\\problem_bank.db`);
          localStorage.setItem('pb-db-path-active', `${folder}\\problem_bank.db`);
        } catch (e) {
          console.warn('Không dùng được thư mục DB trên ổ D, quay về mặc định (ổ C):', e);
          db = await Database.load('sqlite:problem_bank.db');
          localStorage.removeItem('pb-db-path-active');
        }
        
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

        // 🛠️ MIGRATION: cột xoá mềm. NULL = đang dùng; có mốc thời gian ISO = đang trong Thùng rác.
        try {
          await db.execute(`ALTER TABLE problems ADD COLUMN deletedAt TEXT DEFAULT NULL`);
        } catch (e) {
          // Cột đã có sẵn -> SQLite ném lỗi -> bỏ qua an toàn (idempotent)
        }

        // 2. TẠO INDEX (Đánh mục lục giúp tìm kiếm 10.000 bài trong chớp mắt)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_topic ON problems(topic);`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_level ON problems(level);`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_date ON problems(dateAdded);`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_deleted ON problems(deletedAt);`);

        // 🛠️ MIGRATION NGÀY THÁNG: Chuẩn hóa các bản ghi cũ lưu sai định dạng địa phương
        // (ví dụ "19/6/2026") về chuẩn ISO 8601 để việc sắp xếp "Mới nhất trước" hoạt động chính xác.
        // Chỉ quét các dòng còn chứa dấu "/" (định dạng cũ) nên chạy nhiều lần vẫn an toàn (idempotent).
        try {
          const legacyRows = await db.select(`SELECT id, dateAdded FROM problems WHERE dateAdded LIKE '%/%'`);
          const pad = (n) => String(n).padStart(2, '0');

          for (const row of legacyRows) {
            const parts = String(row.dateAdded).trim().split('/'); // [ngày, tháng, năm] theo định dạng vi-VN
            if (parts.length !== 3) continue;

            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            if (!day || !month || !year) continue;

            // Dựng chuỗi ISO trực tiếp để giữ nguyên ngày trên lịch (không bị lệch múi giờ)
            const iso = `${year}-${pad(month)}-${pad(day)}T00:00:00.000Z`;
            await db.execute(`UPDATE problems SET dateAdded = $1 WHERE id = $2`, [iso, row.id]);
          }
        } catch (migErr) {
          console.warn("Bỏ qua migration ngày tháng (không ảnh hưởng dữ liệu):", migErr);
        }

        // =========================================================================
        // 3. BẢNG PHÂN LOẠI MỚI (TAXONOMY) & LỊCH SỬ XUẤT ĐỀ
        // Chỉ THÊM bảng mới, KHÔNG xóa bảng problems cũ -> dữ liệu hiện có an toàn.
        // =========================================================================
        await db.execute(`CREATE TABLE IF NOT EXISTS export_history (
          id TEXT PRIMARY KEY,
          export_date TEXT NOT NULL,
          template_name TEXT NOT NULL,
          problem_ids TEXT NOT NULL
        )`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_export_date ON export_history(export_date);`);

        await db.execute(`CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          parent_id TEXT,
          position INTEGER DEFAULT 0,
          created_at TEXT
        )`);
        await db.execute(`CREATE TABLE IF NOT EXISTS difficulty_levels (
          id TEXT PRIMARY KEY,
          he_id TEXT NOT NULL,
          name TEXT NOT NULL,
          position INTEGER DEFAULT 0
        )`);
        await db.execute(`CREATE TABLE IF NOT EXISTS grades (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          position INTEGER DEFAULT 0
        )`);
        await db.execute(`CREATE TABLE IF NOT EXISTS problem_categories (
          problem_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          PRIMARY KEY (problem_id, category_id)
        )`);
        await db.execute(`CREATE TABLE IF NOT EXISTS problem_difficulties (
          problem_id TEXT NOT NULL,
          he_id TEXT NOT NULL,
          difficulty_id TEXT NOT NULL,
          PRIMARY KEY (problem_id, he_id)
        )`);
        await db.execute(`CREATE TABLE IF NOT EXISTS problem_grades (
          problem_id TEXT NOT NULL,
          grade_id TEXT NOT NULL,
          PRIMARY KEY (problem_id, grade_id)
        )`);

        // Index cho 3 bảng nối để lọc nhanh ở quy mô vài nghìn câu
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_cat_parent ON categories(parent_id);`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_diff_he ON difficulty_levels(he_id);`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_pc_problem ON problem_categories(problem_id);`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_pc_category ON problem_categories(category_id);`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_pd_problem ON problem_difficulties(problem_id);`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_pg_problem ON problem_grades(problem_id);`);

        // 4. SEED: tạo sẵn 4 hệ mặc định (THCS, THPT, Chuyên, Olympic) nếu database còn trống
        await seedTaxonomy(db);

        return db;
      } catch (error) {
        console.error("🚨 Lỗi khởi tạo SQLite:", error);
        throw error;
      }
    })();
  }
  return dbPromise;
};