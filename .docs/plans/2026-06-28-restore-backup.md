# Restore Backup (Khôi phục dữ liệu) — Build Plan

**What we're building:** Một nút "Khôi phục dữ liệu" trong Cài đặt, cho phép thay toàn bộ dữ liệu hiện tại bằng một file backup `.db` đã chọn — một cách an toàn.

**Why:** Để Thầy tự cứu dữ liệu khi bị hỏng, cài lại máy, hoặc lỡ xoá nhầm câu hỏi quan trọng.

**Approach:** Thêm logic vào đúng **một file** `SettingsPage.jsx`. Khi khôi phục: kiểm tra file hợp lệ → tự lưu bản phòng hờ → đóng kết nối DB → ghi đè (dùng lệnh Rust `copy_file` có sẵn) → tải lại app. Không thêm bảng DB, không sửa Rust, không đụng phần xuất `.tex`.

**Files we'll create or change:**
- `src/components/SettingsPage.jsx` — thêm 2 hàm (`isValidBackup`, `restoreBackup`) + 1 nút "Khôi phục dữ liệu"

**Spec gốc:** `.docs/specs/2026-06-28-restore-backup-design.md` (đọc trước khi build).

> ⚠️ **Một bẫy cần lưu ý:** file `SettingsPage.jsx` đã `import { ... Database } from 'lucide-react'` (đó là **icon**). Vì vậy khi nạp thư viện SQLite, **PHẢI đổi tên** thành `SqlDb` để không bị trùng (xem Task 1). Nếu import trùng tên `Database`, app sẽ vỡ.

---

### Task 1: Thêm logic khôi phục (kiểm tra file + hàm khôi phục)

**What you'll have when this is done:** File `SettingsPage.jsx` có sẵn 2 hàm xử lý khôi phục, app vẫn biên dịch sạch (chưa có nút bấm nên chưa thấy gì trên màn hình).

- [ ] Step 1: Mở `src/components/SettingsPage.jsx`. Thêm 2 dòng import dưới đây vào khu vực các `import` ở đầu file (sau dòng `import { useToast } ...`):
      ```javascript
      import SqlDb from '@tauri-apps/plugin-sql'; // đổi tên, tránh trùng icon "Database" của lucide-react
      import { getDb } from '../utils/db';
      ```

- [ ] Step 2: Vẫn trong file đó, **bên trong** component `SettingsPage` (đặt ngay phía trên hàm `backupNow`), thêm hàm kiểm tra file hợp lệ:
      ```javascript
      // Kiểm tra file .db được chọn có đúng là dữ liệu Problem Bank không (phải có bảng "problems").
      const isValidBackup = async (path) => {
        let testDb;
        try {
          testDb = await SqlDb.load('sqlite:' + path);
          const rows = await testDb.select(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='problems'"
          );
          return rows.length > 0;
        } catch (e) {
          return false;
        } finally {
          if (testDb) { try { await testDb.close(); } catch (_) {} }
        }
      };
      ```

- [ ] Step 3: Ngay dưới hàm vừa thêm, thêm hàm khôi phục chính (chép nguyên khối):
      ```javascript
      const restoreBackup = async () => {
        // 1. Chọn file backup
        const picked = await open({
          title: 'Chọn file backup (.db) để khôi phục',
          filters: [{ name: 'SQLite DB', extensions: ['db'] }],
        });
        if (typeof picked !== 'string') return; // Thầy bấm Huỷ

        // 2. Kiểm tra file hợp lệ
        if (!(await isValidBackup(picked))) {
          error('File này không phải dữ liệu Problem Bank hợp lệ.');
          return;
        }

        // 3. Cảnh báo xác nhận
        const sure = window.confirm(
          'Toàn bộ dữ liệu hiện tại sẽ bị thay thế bằng dữ liệu trong file backup.\n\n' +
          'App sẽ tự lưu một bản phòng hờ trước khi thay.\n\n' +
          'Bạn có chắc chắn muốn tiếp tục?'
        );
        if (!sure) return;

        // 4a. Tự lưu bản phòng hờ (PHẢI chạy TRƯỚC khi đóng/ghi đè)
        const folder = dbPath.replace(/[\\/][^\\/]+$/, '');
        const autobackup = folder + '\\problem_bank-autobackup.db';
        try {
          await invoke('copy_file', { src: dbPath, dst: autobackup });
        } catch (e) {
          error('Không tạo được bản phòng hờ, đã huỷ khôi phục: ' + e);
          return; // chưa đóng DB, chưa ghi đè -> an toàn tuyệt đối
        }

        // 4b. Đóng kết nối DB để nhả khoá file (Windows)
        try {
          const db = await getDb();
          await db.close();
        } catch (e) {
          console.warn('Không đóng được DB trước khi ghi đè:', e);
        }

        // 4c. Ghi đè DB sống bằng file backup (thử lại tối đa 3 lần nếu Windows còn giữ khoá)
        let copied = false;
        for (let i = 0; i < 3; i++) {
          try {
            await invoke('copy_file', { src: picked, dst: dbPath });
            copied = true;
            break;
          } catch (e) {
            await new Promise((r) => setTimeout(r, 400)); // chờ Windows nhả khoá rồi thử lại
          }
        }

        // 4d. Tải lại app (luôn reload sau khi đã đóng DB để có kết nối sạch)
        if (!copied) {
          window.alert('Khôi phục thất bại (Windows đang giữ khoá file). Dữ liệu cũ được giữ nguyên. App sẽ tải lại.');
        }
        window.location.reload();
      };
      ```

- [ ] Step 4: Check it works
      Chạy: `npm run build`
      Bạn sẽ thấy: `Compiled successfully.` và **0 warning**.
      Nếu thấy lỗi kiểu `Identifier 'Database' has already been declared` → bạn quên đổi tên ở Step 1 (phải là `SqlDb`, không phải `Database`).

### Task 2: Thêm nút "Khôi phục dữ liệu" vào giao diện

**What you'll have when this is done:** Trong Cài đặt → mục "Vị trí dữ liệu & sao lưu" xuất hiện nút **Khôi phục dữ liệu** cạnh "Sao lưu ngay" và "Mở thư mục".

- [ ] Step 1: Vẫn trong `SettingsPage.jsx`, tìm khối nút hiện có:
      ```javascript
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="card-btn card-btn-primary" onClick={backupNow} disabled={!dbPath}>Sao lưu ngay</button>
        <button className="card-btn" onClick={openDbFolder} disabled={!dbPath}>Mở thư mục</button>
      </div>
      ```
      Thêm **một dòng nút** vào ngay trước `</div>`:
      ```javascript
        <button className="card-btn" onClick={restoreBackup} disabled={!dbPath}>Khôi phục dữ liệu</button>
      ```

- [ ] Step 2: Check it works
      Chạy: `npx tauri dev`
      Vào **Cài đặt** (nav rail) → kéo xuống mục "Vị trí dữ liệu & sao lưu".
      Bạn sẽ thấy: 3 nút trên một hàng — *Sao lưu ngay*, *Mở thư mục*, *Khôi phục dữ liệu*.
      Bấm **Khôi phục dữ liệu** → phải mở ra hộp thoại chọn file. Bấm Huỷ (chưa khôi phục thật ở bước này).

### Task 3: Kiểm thử thực tế luồng khôi phục

**What you'll have when this is done:** Xác nhận khôi phục đúng với file hợp lệ, và bị chặn với file không hợp lệ; bản phòng hờ được tạo.

- [ ] Step 1: Tạo một bản backup "sạch" để test
      Mở app (`npx tauri dev`). Vào Cài đặt → bấm **Sao lưu ngay** → lưu thành `D:\test-backup.db`.
      (Đây là ảnh chụp dữ liệu hiện tại — ta sẽ khôi phục lại chính nó.)

- [ ] Step 2: Thử khôi phục bằng file HỢP LỆ
      Trong app, xoá thử vài câu (cho khác đi một chút), rồi vào Cài đặt → **Khôi phục dữ liệu** → chọn `D:\test-backup.db` → bấm OK ở cảnh báo.
      Bạn sẽ thấy: app **tự tải lại**, và các câu vừa xoá **quay trở lại** (vì đã khôi phục về bản chụp lúc nãy).

- [ ] Step 3: Xác nhận bản phòng hờ được tạo
      Vào Cài đặt → bấm **Mở thư mục**. Trong `D:\0. Problems Bank\app-data` phải có file `problem_bank-autobackup.db` (đây là dữ liệu ngay-trước-khi-khôi-phục).

- [ ] Step 4: Thử khôi phục bằng file KHÔNG hợp lệ
      Tạo một file văn bản bất kỳ, đổi tên thành `D:\hong.db`. Vào Cài đặt → **Khôi phục dữ liệu** → chọn `D:\hong.db`.
      Bạn sẽ thấy: thông báo lỗi *"File này không phải dữ liệu Problem Bank hợp lệ."* và **dữ liệu trong app không thay đổi** (không bị tải lại).

### Task 4: Kiểm tra an toàn LaTeX + lưu tiến độ

**What you'll have when this is done:** Chắc chắn khôi phục không làm hỏng định dạng xuất `.tex`, và code được commit.

- [ ] Step 1: Kiểm tra định dạng xuất không đổi (golden test)
      Chạy: `npx react-scripts test --watchAll=false`
      Bạn sẽ thấy: `Tests: 2 passed, 2 total` (định dạng xuất file nội dung vẫn byte-for-byte như cũ).

- [ ] Step 2: Kiểm tra xuất `.tex` bằng tay sau khi khôi phục
      Trong app (đã khôi phục ở Task 3), tạo/đảm bảo có 1 câu chứa công thức `$x^2 + y^2 = z^2$`. Thêm vào giỏ → **Xuất file nội dung** ra `D:\latex-check.tex`.
      Mở `D:\latex-check.tex` bằng Notepad: công thức `$x^2 + y^2 = z^2$` phải **nguyên vẹn**, khối `\begin{bt} ... \end{bt}` không bị vỡ.

- [ ] Step 3: Build sạch lần cuối
      Chạy: `npm run build`
      Bạn sẽ thấy: `Compiled successfully.` 0 warning.

- [ ] Step 4: Lưu tiến độ
      (Spec + plan đã được commit sẵn; chỉ còn commit phần code.)
      Run: `git add src/components/SettingsPage.jsx`
      Run: `git commit -m "feat(settings): khoi phuc du lieu tu file backup (.db)"`
      (Chưa push — để Claude check lại trước.)

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order — don't skip ahead
3. Complete the "Check it works" step before moving to the next task
4. If something doesn't work as expected, stop and describe what you see — don't try random fixes

Say "let's start building" when you're ready to begin Task 1.

---

## Ghi chú cho bước Claude check lại (sau khi Antigravity build)
- Xác nhận import dùng `SqlDb` (không trùng icon `Database` của lucide).
- Xác nhận thứ tự an toàn: bản phòng hờ (4a) chạy **trước** `db.close()` (4b) và ghi đè (4c).
- Xác nhận **không** có file Rust nào bị sửa (`git status` chỉ thấy `SettingsPage.jsx` + 2 file docs); không thêm bảng DB.
- Chạy lại: `npm run build` (0 warning) + `npx react-scripts test --watchAll=false` (2/2).
- `git diff` xác nhận `buildProblemTex` / `buildContentFile` / đường xuất `.tex` không bị chạm.
