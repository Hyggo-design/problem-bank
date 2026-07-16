# Ghi "Trọn Gói" (Transaction All-or-Nothing) — Build Plan

**What we're building:** Mỗi thao tác lưu (thêm/sửa/nhập/đổi tag/xoá/dọn rác) chạy **trọn gói** — hỏng giữa chừng thì **tự huỷ sạch**, kho y nguyên.

**Why:** Chống dữ liệu **dở dang** khi đĩa đầy / DB khoá / mất điện giữa chừng (nặng nhất là Nhập hàng loạt) — làm nốt phần còn thiếu của Đợt A #1.

**Approach:** Đổi tầng ghi JS thành **hàm thuần trả danh sách lệnh**, gửi cả cụm xuống **một lệnh Rust `execute_tx`** chạy trong `BEGIN IMMEDIATE … COMMIT` (lỗi → `ROLLBACK`), dùng `rusqlite` (gộp chung SQLite với plugin nên không đụng độ). Không đổi câu SQL, không đổi schema, không đụng xuất `.tex`.

**Files we'll create or change:**
- `src/utils/problemWrites.js` — đổi các hàm ghi-nhiều-lệnh thành builder thuần `build...()` trả `{sql, params}[]`
- `src/utils/problemWrites.test.js` — viết lại test cho builder (khẳng định đúng danh sách lệnh)
- `src/utils/db.js` — thêm `getActiveDbPath()` + `runTx()`; nhớ đường file DB thật qua `PRAGMA database_list`
- `src/utils/db.test.js` — (mới) test `runTx` (no-op khi rỗng · ném lỗi khi Rust lỗi)
- `src/hooks/useProblems.js` — gọi `runTx(build...())` thay cho gọi trực tiếp `db.execute`
- `src-tauri/Cargo.toml` — thêm dependency `rusqlite` (bundled)
- `src-tauri/src/lib.rs` — thêm lệnh `execute_tx` + test Rust chứng minh ROLLBACK

**Nguyên tắc bất di bất dịch (mọi task đều giữ):** KHÔNG đổi schema/không migration · KHÔNG đụng `buildProblemTex.js`/`buildContentFile.js` (golden test giữ nguyên) · KHÔNG đổi câu SQL hay thứ tự tham số (chỉ đổi *chỗ chạy*).

---

### Task 1: Chuẩn bị an toàn — nhánh Git + sao lưu CSDL

**What you'll have when this is done:** Một nhánh riêng để làm, và **bản sao CSDL** để lỡ có gì còn lùi được.

- [ ] Bước 1: Tạo nhánh làm việc
      Run: `git checkout -b feat/ghi-tron-goi-transaction`
      You should see: `Switched to a new branch 'feat/ghi-tron-goi-transaction'`

- [ ] Bước 2: Sao lưu file CSDL thật (ổ D) ra chỗ tạm, kèm ngày
      Run (PowerShell): `Copy-Item "D:\0. Problems Bank\app-data\problem_bank.db" "D:\tmp\problem_bank.backup-2026-07-16.db"`
      You should see: không báo lỗi; file backup xuất hiện trong `D:\tmp`.
      (Nếu file DB không ở ổ D mà ở ổ C: mở app → Cài đặt xem đường DB đang dùng, sao lưu đúng file đó.)

- [ ] Bước 3: Ghi lại **số bài hiện có** để đối chiếu cuối
      Mở app đang chạy (hoặc mở lại) → xem tổng số bài ở màn Bài (khoảng **73**). Ghi con số này ra giấy/nhớ.

- [ ] Bước 4: Xác nhận cây phụ thuộc Rust **chỉ có một** bản SQLite (điều kiện để thêm `rusqlite` không đụng độ)
      Run: `cd src-tauri; cargo tree -i libsqlite3-sys; cd ..`
      You should see: đúng **một** khối `libsqlite3-sys v0.30.x`. Ghi nhớ để so lại ở Task 4.

---

### Task 2: Đổi tầng ghi thành "hàm thuần" trả danh sách lệnh (builder) + test

**What you'll have when this is done:** `problemWrites.js` có thêm các hàm `build...()` trả `{sql, params}[]` (chưa đụng DB), test khẳng định đúng từng lệnh. **App vẫn chạy y như cũ** (các hàm cũ giữ nguyên, sẽ gỡ ở Task 5).

- [ ] Bước 1: Ở đầu `src/utils/problemWrites.js`, thêm import tiện ích tag (để builder tự tính đổi tag)
      Thêm dòng (ngay dưới phần chú thích đầu file):
      ```js
      import { applyTagRename, applyTagDelete } from './tagUtils';
      ```

- [ ] Bước 2: Thêm **các builder thuần** vào cuối `src/utils/problemWrites.js` (KHÔNG xoá hàm cũ nào):
      ```js
      // ───────────────────────── BUILDERS (thuần, trả danh sách lệnh {sql, params}) ─────────────────────────
      // Không chạm DB. Cả cụm sẽ chạy TRỌN GÓI dưới Rust (runTx). SQL & thứ tự tham số bê nguyên hàm cũ.

      export const buildClassificationStmts = (problemId, cls = {}) => {
        const s = [
          { sql: 'DELETE FROM problem_categories WHERE problem_id = $1', params: [problemId] },
          { sql: 'DELETE FROM problem_difficulties WHERE problem_id = $1', params: [problemId] },
          { sql: 'DELETE FROM problem_grades WHERE problem_id = $1', params: [problemId] },
        ];
        for (const cid of (cls.categoryIds || [])) {
          s.push({ sql: 'INSERT INTO problem_categories (problem_id, category_id) VALUES ($1, $2)', params: [problemId, cid] });
        }
        for (const [heId, diffId] of Object.entries(cls.difficultyByHe || {})) {
          if (diffId) s.push({ sql: 'INSERT INTO problem_difficulties (problem_id, he_id, difficulty_id) VALUES ($1, $2, $3)', params: [problemId, heId, diffId] });
        }
        for (const gid of (cls.gradeIds || [])) {
          s.push({ sql: 'INSERT INTO problem_grades (problem_id, grade_id) VALUES ($1, $2)', params: [problemId, gid] });
        }
        return s;
      };

      export const buildInsertProblem = (p) => {
        const optionsStr = JSON.stringify(p.options || []);
        return [
          {
            sql: `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, type, shortAnswer, options, metadata, figStatement, figSolution)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            params: [
              p.id, p.statement || '', p.solution || '', p.topic || 'Chưa phân loại',
              parseInt(p.level) || 1, p.tags || '', p.dateAdded || new Date().toISOString(),
              p.type || 'Tự luận', p.shortAnswer || '', optionsStr, '{}',
              p.figStatement || '', p.figSolution || '',
            ],
          },
          ...buildClassificationStmts(p.id, p),
        ];
      };

      export const buildUpdateProblem = (p) => {
        const optionsStr = JSON.stringify(p.options || []);
        return [
          {
            sql: `UPDATE problems SET statement = $1, solution = $2, topic = $3, level = $4, tags = $5, type = $6, shortAnswer = $7, options = $8, figStatement = $9, figSolution = $10 WHERE id = $11`,
            params: [
              p.statement, p.solution || '', p.topic, p.level, p.tags || '',
              p.type || 'Tự luận', p.shortAnswer || '', optionsStr,
              p.figStatement || '', p.figSolution || '', p.id,
            ],
          },
          ...buildClassificationStmts(p.id, p),
        ];
      };

      export const buildInsertImported = (list) => {
        if (!list || list.length === 0) return [];
        const stmts = [];
        const chunkSize = 50;
        for (let i = 0; i < list.length; i += chunkSize) {
          const chunk = list.slice(i, i + chunkSize);
          const chunkPlaceholders = chunk.map((_, index) => {
            const offset = index * 11;
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
          }).join(', ');
          const sql = `INSERT OR REPLACE INTO problems (id, statement, solution, topic, level, tags, dateAdded, type, shortAnswer, options, metadata) VALUES ${chunkPlaceholders}`;
          const params = [];
          for (const prob of chunk) {
            const optionsStr = JSON.stringify(prob.options || []);
            params.push(
              prob.id, prob.statement || '', prob.solution || '', prob.topic || 'Chưa phân loại',
              parseInt(prob.level) || 1, prob.tags || '', prob.dateAdded || new Date().toISOString(),
              prob.type || 'Tự luận', prob.shortAnswer || '', optionsStr, '{}',
            );
          }
          stmts.push({ sql, params });
        }
        for (const prob of list) stmts.push(...buildClassificationStmts(prob.id, prob));
        return stmts;
      };

      export const buildRenameTag = (problems, oldTag, newTag) => {
        const s = [];
        for (const p of (problems || [])) {
          const next = applyTagRename(p.tags || '', oldTag, newTag);
          if (next !== (p.tags || '')) s.push({ sql: 'UPDATE problems SET tags = $1 WHERE id = $2', params: [next, p.id] });
        }
        return s;
      };

      export const buildDeleteTag = (problems, tag) => {
        const s = [];
        for (const p of (problems || [])) {
          const next = applyTagDelete(p.tags || '', tag);
          if (next !== (p.tags || '')) s.push({ sql: 'UPDATE problems SET tags = $1 WHERE id = $2', params: [next, p.id] });
        }
        return s;
      };

      export const buildPurge = (id) => [
        { sql: 'DELETE FROM problems WHERE id = $1', params: [id] },
        { sql: 'DELETE FROM problem_categories WHERE problem_id = $1', params: [id] },
        { sql: 'DELETE FROM problem_difficulties WHERE problem_id = $1', params: [id] },
        { sql: 'DELETE FROM problem_grades WHERE problem_id = $1', params: [id] },
      ];

      // Dọn thùng rác: dùng subquery nên KHÔNG cần SELECT trước → trọn trong transaction.
      export const buildEmptyTrash = () => [
        { sql: 'DELETE FROM problem_categories WHERE problem_id IN (SELECT id FROM problems WHERE deletedAt IS NOT NULL)', params: [] },
        { sql: 'DELETE FROM problem_difficulties WHERE problem_id IN (SELECT id FROM problems WHERE deletedAt IS NOT NULL)', params: [] },
        { sql: 'DELETE FROM problem_grades WHERE problem_id IN (SELECT id FROM problems WHERE deletedAt IS NOT NULL)', params: [] },
        { sql: 'DELETE FROM problems WHERE deletedAt IS NOT NULL', params: [] },
      ];
      ```

- [ ] Bước 3: Thêm test builder vào cuối `src/utils/problemWrites.test.js` (giữ nguyên test cũ):
      ```js
      import {
        buildClassificationStmts, buildInsertProblem, buildUpdateProblem,
        buildInsertImported, buildRenameTag, buildDeleteTag, buildPurge, buildEmptyTrash,
      } from './problemWrites';

      const sqlsOf = (stmts) => stmts.map((s) => s.sql);

      describe('builders — trả đúng danh sách lệnh {sql, params}', () => {
        test('buildInsertProblem: lệnh đầu INSERT OR REPLACE problems (không có timesUsed) rồi 3 DELETE + đúng số INSERT phân loại', () => {
          const stmts = buildInsertProblem(sample);
          const sqls = sqlsOf(stmts);
          expect(/INSERT OR REPLACE INTO problems/.test(sqls[0])).toBe(true);
          expect(sqls.some((s) => /timesUsed/.test(s))).toBe(false);
          // sample: 1 category + 1 difficulty + 1 grade → 1 + (3 DELETE + 1 + 1 + 1) = 7 lệnh
          expect(stmts).toHaveLength(7);
          expect(stmts[0].params).toHaveLength(13);
        });

        test('buildUpdateProblem: lệnh đầu UPDATE problems ... WHERE id', () => {
          const sqls = sqlsOf(buildUpdateProblem(sample));
          expect(/^UPDATE problems SET/.test(sqls[0])).toBe(true);
          expect(/WHERE id = \$11/.test(sqls[0])).toBe(true);
        });

        test('buildInsertImported: rỗng → [] ; 60 bài → 2 câu INSERT chunk (50+10) + 60 cụm phân loại', () => {
          expect(buildInsertImported([])).toEqual([]);
          const many = Array.from({ length: 60 }, (_, i) => ({ ...sample, id: 'p' + i }));
          const stmts = buildInsertImported(many);
          const inserts = sqlsOf(stmts).filter((s) => /INSERT OR REPLACE INTO problems/.test(s));
          expect(inserts).toHaveLength(2);
          expect(sqlsOf(stmts).some((s) => /timesUsed/.test(s))).toBe(false);
          const dels = sqlsOf(stmts).filter((s) => /DELETE FROM problem_categories/.test(s));
          expect(dels).toHaveLength(60); // mỗi bài 1 lần dọn phân loại
        });

        test('buildRenameTag/buildDeleteTag: chỉ sinh lệnh cho bài THỰC SỰ đổi; không đổi → []', () => {
          const probs = [
            { id: 'a', tags: 'hình học, đại số' },
            { id: 'b', tags: 'số học' },
          ];
          const r = buildRenameTag(probs, 'đại số', 'ĐẠI SỐ');
          expect(r).toHaveLength(1);
          expect(r[0].params[1]).toBe('a');
          expect(buildRenameTag(probs, 'không-có', 'x')).toEqual([]);
          expect(buildDeleteTag(probs, 'số học')).toHaveLength(1);
        });

        test('buildPurge: đúng 4 DELETE ; buildEmptyTrash: 3 DELETE subquery + 1 DELETE problems', () => {
          expect(buildPurge('p1')).toHaveLength(4);
          const et = buildEmptyTrash();
          expect(et).toHaveLength(4);
          expect(et.filter((s) => /IN \(SELECT id FROM problems WHERE deletedAt IS NOT NULL\)/.test(s.sql))).toHaveLength(3);
        });
      });
      ```

- [ ] Bước 4: Chạy test (một lần, không watch)
      Run: `npm test -- --watchAll=false`
      You should see: **tất cả test PASS** (cả test cũ lẫn test builder mới).

- [ ] Bước 5: Lưu tiến độ
      Run: `git add -A && git commit -m "feat(tx): builder thuần trả danh sách lệnh + test (chưa nối)"`

---

### Task 3: Thêm `runTx` + xác định ĐÚNG file DB (qua PRAGMA) + test

**What you'll have when this is done:** Một hàm `runTx(statements)` gửi cả cụm lệnh xuống Rust; và `db.js` **nhớ đường file DB thật** để Rust mở đúng chỗ. App vẫn chạy như cũ (chưa ai gọi `runTx`).

- [ ] Bước 1: Trong `src/utils/db.js`, ngay **trước** dòng `return db;` (cuối khối khởi tạo), chèn đoạn nhớ đường file:
      ```js
      // Ghi nhớ ĐƯỜNG FILE TUYỆT ĐỐI mà SQLite đang mở (đúng cho cả ổ D lẫn fallback ổ C) —
      // để lệnh transaction dưới Rust mở ĐÚNG file, không phải đoán path.
      try {
        const dl = await db.select('PRAGMA database_list');
        const abs = (dl.find((r) => r.name === 'main') || {}).file || '';
        if (abs) localStorage.setItem('pb-db-path-active', abs);
      } catch (e) {
        console.warn('Không lấy được đường file DB qua PRAGMA:', e);
      }
      ```

- [ ] Bước 2: Thêm 2 hàm xuất ở **cuối** `src/utils/db.js`:
      ```js
      // Đường file DB tuyệt đối đang dùng (cache ở localStorage; thiếu thì hỏi PRAGMA 1 lần).
      export const getActiveDbPath = async () => {
        let p = localStorage.getItem('pb-db-path-active');
        if (p) return p;
        const db = await getDb();
        try {
          const dl = await db.select('PRAGMA database_list');
          p = (dl.find((r) => r.name === 'main') || {}).file || '';
        } catch (e) { console.warn('PRAGMA database_list lỗi:', e); p = ''; }
        if (p) localStorage.setItem('pb-db-path-active', p);
        return p;
      };

      // Chạy CẢ CỤM lệnh trong 1 transaction dưới Rust (all-or-nothing).
      // Rỗng = no-op. Lỗi → NÉM (hook bắt → toast lỗi thật, không báo giả).
      export const runTx = async (statements) => {
        if (!statements || statements.length === 0) return true;
        const dbPath = await getActiveDbPath();
        if (!dbPath) throw new Error('Không xác định được đường dẫn CSDL để ghi transaction');
        await invoke('execute_tx', { dbPath, statements });
        return true;
      };
      ```
      (`invoke` đã được import sẵn ở đầu `db.js` — không cần thêm.)

- [ ] Bước 3: Tạo file test `src/utils/db.test.js`:
      ```js
      // Mock 2 gói Tauri để test được ngoài app.
      jest.mock('@tauri-apps/plugin-sql', () => ({ __esModule: true, default: { load: jest.fn() } }));
      jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

      import { invoke } from '@tauri-apps/api/core';
      import { runTx } from './db';

      beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('pb-db-path-active', 'D:\\x\\problem_bank.db');
        invoke.mockReset();
      });

      test('runTx([]) → no-op, KHÔNG gọi invoke', async () => {
        await expect(runTx([])).resolves.toBe(true);
        expect(invoke).not.toHaveBeenCalled();
      });

      test('runTx: gửi execute_tx đúng dbPath + statements', async () => {
        invoke.mockResolvedValue(2);
        const stmts = [{ sql: 'DELETE FROM x WHERE id=$1', params: ['a'] }];
        await expect(runTx(stmts)).resolves.toBe(true);
        expect(invoke).toHaveBeenCalledWith('execute_tx', { dbPath: 'D:\\x\\problem_bank.db', statements: stmts });
      });

      test('runTx: Rust lỗi → NÉM (để hook trả false)', async () => {
        invoke.mockRejectedValue(new Error('disk full'));
        await expect(runTx([{ sql: 'X', params: [] }])).rejects.toThrow('disk full');
      });
      ```

- [ ] Bước 4: Chạy test
      Run: `npm test -- --watchAll=false`
      You should see: tất cả PASS (thêm 3 test `runTx`).

- [ ] Bước 5: Lưu tiến độ
      Run: `git add -A && git commit -m "feat(tx): runTx + xác định đúng file DB qua PRAGMA + test"`

---

### Task 4: Lệnh Rust `execute_tx` (chạy transaction thật) + test chứng minh ROLLBACK

**What you'll have when this is done:** Lõi Rust có lệnh `execute_tx` chạy cả cụm lệnh trong 1 transaction; test Rust chứng minh **hỏng giữa chừng → không lưu gì**.

- [ ] Bước 1: Thêm dependency vào `src-tauri/Cargo.toml`, ngay dưới dòng `tauri-plugin-dialog = "2"`:
      ```toml
      rusqlite = { version = "0.32", features = ["bundled"] }
      ```

- [ ] Bước 2: Trong `src-tauri/src/lib.rs`, thêm lệnh `execute_tx` (đặt trên hàm `run()`):
      ```rust
      #[derive(serde::Deserialize)]
      struct TxStatement {
          sql: String,
          params: Vec<serde_json::Value>,
      }

      // Đổi 1 giá trị JSON (từ JS) sang giá trị SQLite tương ứng.
      fn json_to_sql(v: &serde_json::Value) -> Result<rusqlite::types::Value, String> {
          use rusqlite::types::Value as V;
          use serde_json::Value as J;
          Ok(match v {
              J::Null => V::Null,
              J::Bool(b) => V::Integer(if *b { 1 } else { 0 }),
              J::Number(n) => {
                  if let Some(i) = n.as_i64() { V::Integer(i) }
                  else if let Some(f) = n.as_f64() { V::Real(f) }
                  else { return Err(format!("Số không hỗ trợ: {n}")); }
              }
              J::String(s) => V::Text(s.clone()),
              // Phòng hờ: mảng/đối tượng → chuỗi JSON (thực tế JS đã stringify sẵn options/metadata).
              other => V::Text(other.to_string()),
          })
      }

      // Chạy CẢ CỤM lệnh trong MỘT transaction trên MỘT kết nối (all-or-nothing).
      // Lỗi ở bất kỳ lệnh nào → tx bị drop mà chưa commit → rusqlite tự ROLLBACK.
      #[tauri::command]
      fn execute_tx(db_path: String, statements: Vec<TxStatement>) -> Result<usize, String> {
          let mut conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
          conn.busy_timeout(std::time::Duration::from_millis(5000)).map_err(|e| e.to_string())?;
          let tx = conn
              .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
              .map_err(|e| e.to_string())?;
          let mut affected = 0usize;
          for st in &statements {
              let mut vals: Vec<rusqlite::types::Value> = Vec::with_capacity(st.params.len());
              for p in &st.params {
                  vals.push(json_to_sql(p)?);
              }
              affected += tx
                  .execute(&st.sql, rusqlite::params_from_iter(vals))
                  .map_err(|e| format!("{e}\n↳ SQL: {}", st.sql))?;
          }
          tx.commit().map_err(|e| e.to_string())?;
          Ok(affected)
      }
      ```

- [ ] Bước 3: Đăng ký lệnh — trong `tauri::generate_handler![ … ]` (hàm `run()`), thêm `execute_tx` vào danh sách (sau `delete_file`):
      ```rust
              list_files,
              delete_file,
              execute_tx
      ```

- [ ] Bước 4: Thêm test Rust ở **cuối** `src-tauri/src/lib.rs`:
      ```rust
      #[cfg(test)]
      mod tests {
          use super::*;

          fn json(v: serde_json::Value) -> serde_json::Value { v }

          #[test]
          fn tx_commit_het_hoac_khong_gi() {
              let dir = std::env::temp_dir().join(format!("pb_tx_{}", std::process::id()));
              std::fs::create_dir_all(&dir).unwrap();
              let path = dir.join("t.db").to_string_lossy().to_string();
              {
                  let c = rusqlite::Connection::open(&path).unwrap();
                  c.execute("CREATE TABLE t (id TEXT PRIMARY KEY, v INTEGER)", []).unwrap();
              }

              // 1) Cụm hợp lệ → COMMIT: có 2 dòng.
              let ok = vec![
                  TxStatement { sql: "INSERT INTO t (id, v) VALUES ($1, $2)".into(), params: vec![json(serde_json::json!("a")), json(serde_json::json!(1))] },
                  TxStatement { sql: "INSERT INTO t (id, v) VALUES ($1, $2)".into(), params: vec![json(serde_json::json!("b")), json(serde_json::json!(2))] },
              ];
              assert_eq!(execute_tx(path.clone(), ok).unwrap(), 2);
              let c = rusqlite::Connection::open(&path).unwrap();
              let n: i64 = c.query_row("SELECT COUNT(*) FROM t", [], |r| r.get(0)).unwrap();
              assert_eq!(n, 2);

              // 2) Cụm có 1 lệnh HỎNG ở giữa (bảng không tồn tại) → ROLLBACK: vẫn chỉ 2 dòng, 'c' KHÔNG lưu.
              let bad = vec![
                  TxStatement { sql: "INSERT INTO t (id, v) VALUES ($1, $2)".into(), params: vec![json(serde_json::json!("c")), json(serde_json::json!(3))] },
                  TxStatement { sql: "INSERT INTO khong_co_bang (id) VALUES ($1)".into(), params: vec![json(serde_json::json!("x"))] },
              ];
              assert!(execute_tx(path.clone(), bad).is_err());
              let n2: i64 = c.query_row("SELECT COUNT(*) FROM t", [], |r| r.get(0)).unwrap();
              assert_eq!(n2, 2, "ROLLBACK: 'c' phải KHÔNG được lưu");

              let _ = std::fs::remove_dir_all(&dir);
          }
      }
      ```

- [ ] Bước 5: Kiểm **chỉ một** bản SQLite (điều kiện không đụng độ) rồi chạy test Rust
      Run: `cd src-tauri; cargo tree -i libsqlite3-sys`
      You should see: đúng **một** `libsqlite3-sys v0.30.x` (giống Task 1). Nếu thấy **hai** bản khác nhau → DỪNG, báo lại (sẽ đổi phiên bản `rusqlite` cho khớp).
      Run: `cargo test; cd ..`
      You should see: test `tx_commit_het_hoac_khong_gi` **PASS**. (Lần build đầu biên dịch SQLite nên hơi lâu — bình thường.)

- [ ] Bước 6: Lưu tiến độ
      Run: `git add -A && git commit -m "feat(tx): lệnh Rust execute_tx (rusqlite) + test chứng minh ROLLBACK"`

---

### Task 5: Nối hook — dùng `runTx(build...())`, gỡ hàm cũ

**What you'll have when this is done:** Toàn bộ 7 đường ghi-nhiều-lệnh chạy **trọn gói**. Các hàm cũ đã gỡ. App dùng đường mới.

- [ ] Bước 1: Sửa import ở đầu `src/hooks/useProblems.js` thành:
      ```js
      import { getDb, runTx } from '../utils/db';
      import { findDuplicates } from '../utils/findDuplicates';
      import {
        buildInsertProblem, buildUpdateProblem, buildInsertImported,
        buildRenameTag, buildDeleteTag, buildPurge, buildEmptyTrash,
        softDeleteProblem, softDeleteMany, restoreProblemRow,
      } from '../utils/problemWrites';
      ```
      (Bỏ import `applyTagRename, applyTagDelete` khỏi hook — đã chuyển vào builder.)

- [ ] Bước 2: Đổi thân các hàm ghi-nhiều-lệnh sang `runTx(build...())` (giữ nguyên `try/catch → true/false` và thứ tự đổi state):
      - `addProblem`: thay `const db = await getDb(); await insertProblem(db, newProblem);` bằng `await runTx(buildInsertProblem(newProblem));`
      - `updateProblem`: thay bằng `await runTx(buildUpdateProblem(updatedProblem));`
      - `saveImportedProblems`: thay `const db = await getDb(); await insertImportedProblems(db, newProblems);` bằng `await runTx(buildInsertImported(newProblems));`
      - `purgeProblem`: thay `const db = await getDb(); await purgeProblemRow(db, id);` bằng `await runTx(buildPurge(id));` (giữ `await loadProblems();`)
      - `emptyTrash`: thay bằng `await runTx(buildEmptyTrash());` (giữ `await loadProblems();`)
      - `renameTag`: thay cả vòng lặp bằng:
        ```js
        const renameTag = async (oldTag, newTag) => {
          try {
            await runTx(buildRenameTag(problems, oldTag, newTag));
            await loadProblems();
            return true;
          } catch (error) { console.error('Lỗi đổi tên tag:', error); return false; }
        };
        ```
      - `deleteTag`: tương tự với `buildDeleteTag(problems, tag)`.
      - **GIỮ NGUYÊN** `deleteProblem`, `bulkDeleteProblems`, `restoreProblem` (vẫn `const db = await getDb(); await softDeleteProblem(db, id); …`).

- [ ] Bước 3: Trong `src/utils/problemWrites.js`, **gỡ các hàm cũ đã thừa**: `saveClassification`, `insertProblem`, `updateProblemRow`, `updateProblemTags`, `insertImportedProblems`, `purgeProblemRow`, `emptyTrashRows`.
      **Giữ lại**: `softDeleteProblem`, `softDeleteMany`, `restoreProblemRow` (đường ghi-một-lệnh) + tất cả builder + import `tagUtils`.

- [ ] Bước 4: Trong `src/utils/problemWrites.test.js`, **gỡ test của hàm cũ** đã bỏ: trong mảng `cases` chỉ giữ 3 dòng `softDeleteProblem`/`softDeleteMany`/`restoreProblemRow`; xoá 2 test `insertProblem`/`insertImportedProblems` kiểu cũ (đã có test builder thay thế); bỏ import các hàm cũ không còn.

- [ ] Bước 5: Chạy toàn bộ test JS
      Run: `npm test -- --watchAll=false`
      You should see: tất cả PASS, **0 test lỗi**.

- [ ] Bước 6: Lưu tiến độ
      Run: `git add -A && git commit -m "feat(tx): nối hook dùng runTx(build...), gỡ hàm ghi cũ"`

---

### Task 6: Nghiệm thu trong app thật (`tauri dev`) — gồm ép lỗi + an toàn LaTeX

**What you'll have when this is done:** Bằng chứng tận mắt: thao tác lưu chạy trơn; ép lỗi thì **tự huỷ, không để lại rác**; xuất `.tex` công thức nguyên vẹn; **73 bài cũ còn nguyên**.

- [ ] Bước 1: Chạy app (Rust sẽ tự build lại kèm `execute_tx`)
      Run: `npx tauri dev`
      You should see: app mở; màn Bài hiện **đúng số bài như Task 1** (khoảng 73). *(Nếu lệch số → DỪNG, báo lại ngay.)*

- [ ] Bước 2: Thử đường thường — **thêm 1 bài có công thức LaTeX**
      Thêm bài mới, đề: `Chứng minh $x^2 + y^2 = z^2$ có vô số nghiệm nguyên dương.`, gắn 1 hệ + độ khó + lớp, Lưu.
      You should see: toast "Đã thêm bài tập!"; bài hiện trên feed **kèm phân loại đúng**. Sửa lại bài đó (đổi độ khó) → Lưu → phân loại đổi đúng.

- [ ] Bước 3: Thử đường **Nhập hàng loạt** vài bài (Smart Import) → Lưu.
      You should see: các bài vào kho đủ, phân loại đúng; tải lại (đóng/mở màn) vẫn còn.

- [ ] Bước 4: **An toàn LaTeX** — xuất `.tex` bài vừa thêm
      Đưa bài ở Bước 2 vào Giỏ → Xuất `.tex` → mở file kết quả.
      You should see: trong file có đúng `$x^2 + y^2 = z^2$` (công thức không méo, không mất ký tự).

- [ ] Bước 5: **Ép lỗi để thấy tự huỷ (ROLLBACK)** — chứng minh all-or-nothing
      Tạm sửa `buildInsertProblem` (trong `problemWrites.js`): thêm 1 lệnh rác **vào GIỮA** danh sách, ngay sau lệnh INSERT đầu:
      ```js
      { sql: 'INSERT INTO khong_co_bang (id) VALUES ($1)', params: [p.id] },
      ```
      Lưu file (app tự nạp lại). Thử **thêm 1 bài mới** "TEST ROLLBACK".
      You should see: toast **báo lỗi** (không phải "Đã thêm"); và bài "TEST ROLLBACK" **KHÔNG** xuất hiện; **không** có dòng rác ở bảng phân loại. → Gỡ lệnh rác vừa thêm, lưu lại, xác nhận thêm bài chạy bình thường trở lại.

- [ ] Bước 6: **Xác nhận dữ liệu cũ còn nguyên**
      Đếm lại tổng số bài (trừ đi các bài test vừa thêm) = số ở Task 1. Xoá các bài "TEST…" vừa tạo (vào Thùng rác) cho sạch.

- [ ] Bước 7: Chạy lại toàn bộ test + build sạch (chốt hồi quy)
      Run: `npm test -- --watchAll=false`  → tất cả PASS.
      Run: `$env:CI="true"; npm run build`  → build thành công, **0 warning**. *(bash: `CI=true npm run build`)*

- [ ] Bước 8: Lưu tiến độ (chỉ khi mọi bước trên OK)
      Run: `git add -A && git commit -m "test(tx): nghiệm thu tauri dev — chạy trơn, ROLLBACK, LaTeX an toàn"`

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order — don't skip ahead
3. Complete the "Check it works" step before moving to the next task
4. If something doesn't work as expected, stop and describe what you see — don't try random fixes

Say "let's start building" when you're ready to begin Task 1.

---
*Sau khi build xong toàn bộ: viết Nhật ký 35 + cập nhật ROADMAP (đánh dấu mục Đợt C "Ghi trọn gói" XONG), rồi bàn bước đóng gói `.msi` v1.2.*
