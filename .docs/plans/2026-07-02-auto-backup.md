# Tự động sao lưu (Auto-backup khi đóng app) — Build Plan

**What we're building:** Mỗi khi Thầy đóng app, nó tự chép cơ sở dữ liệu ra một bản sao lưu của ngày hôm nay và tự dọn các bản cũ hơn 14 ngày.

**Why:** Thầy luôn có đường lùi vài ngày mà không phải nhớ bấm "Sao lưu ngay".

**Approach:** Tách phần "nên xoá bản nào" thành một hàm THUẦN (test được) trước; thêm 2 lệnh Rust nhỏ để liệt kê + xoá file; viết một "hook" bắt sự kiện đóng cửa sổ để chép + dọn rồi mới đóng thật; cuối cùng thêm công tắc bật/tắt trong Cài đặt. KHÔNG đụng tới đường xuất `.tex`.

**Spec:** [.docs/specs/2026-07-02-auto-backup-design.md](../specs/2026-07-02-auto-backup-design.md)

**Files we'll create or change:**
- `src/utils/backupRotation.js` — **MỚI**: hàm thuần quyết định xoá bản nào (xoay vòng 14 ngày, luôn giữ bản mới nhất)
- `src/utils/backupRotation.test.js` — **MỚI**: bộ kiểm cho hàm trên
- `src-tauri/src/lib.rs` — thêm 2 lệnh `list_files` (liệt kê tên file) và `delete_file` (xoá 1 file)
- `src-tauri/capabilities/default.json` — thêm quyền đóng cửa sổ `core:window:allow-destroy`
- `src/hooks/useAutoBackup.js` — **MỚI**: bắt sự kiện đóng app → chép + dọn → đóng thật
- `src/App.jsx` — gọi hook một lần
- `src/components/SettingsPage.jsx` — công tắc bật/tắt + dòng trạng thái + nút "Mở thư mục sao lưu"

**Giải nghĩa vài từ:** *hook* = một hàm React tái sử dụng logic; *util thuần* = hàm chỉ tính toán, không đụng file/mạng nên kiểm (test) rất dễ; *invoke* = cách JavaScript gọi một lệnh viết bằng Rust; *capabilities* = danh sách quyền app được phép làm.

---

### Task 1: Viết hàm xoay vòng THUẦN + bộ kiểm (làm trước, chắc phần lõi)

**What you'll have when this is done:** Một hàm đã được kiểm kỹ, biết chính xác nên xoá bản sao lưu nào — chưa đụng gì tới app thật.

- [ ] Bước 1: Tạo file mới `src/utils/backupRotation.js` với đúng nội dung sau:

```js
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
```

- [ ] Bước 2: Tạo file mới `src/utils/backupRotation.test.js` với đúng nội dung sau:

```js
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
```

- [ ] Bước 3: Chạy đúng bộ kiểm vừa viết
      Run: `npm test -- --watchAll=false backupRotation`
      You should see: dòng `Tests: 9 passed, 9 total` (tất cả xanh, không có chữ "fail").

- [ ] Bước 4: Nếu có bài kiểm đỏ → DỪNG lại, đọc thông báo lỗi, so lại đúng từng ký tự ở Bước 1. Đừng sửa lung tung.

- [ ] Bước 5: Lưu tiến độ
      Run: `git add src/utils/backupRotation.js src/utils/backupRotation.test.js && git commit -m "feat(backup): util thuan xoay vong ban sao luu + 9 test"`

---

### Task 2: Thêm 2 lệnh Rust — liệt kê file và xoá file

**What you'll have when this is done:** App (phần Rust) có thể liệt kê tên file trong thư mục backups và xoá một file — nguyên liệu cho việc dọn bản cũ.

- [ ] Bước 1: Mở `src-tauri/src/lib.rs`. Tìm lệnh `open_path` đang có (gần cuối, trước dòng `#[cfg_attr(mobile, ...)]`). Ngay SAU hàm `open_path { ... }` đó, dán thêm 2 hàm sau:

```rust
// Liệt kê TÊN file (không kèm đường dẫn) trong một thư mục.
// Thư mục chưa tồn tại -> trả danh sách rỗng (không coi là lỗi).
#[tauri::command]
fn list_files(dir: String) -> Result<Vec<String>, String> {
    let mut out = Vec::new();
    let rd = match fs::read_dir(&dir) {
        Ok(rd) => rd,
        Err(_) => return Ok(out),
    };
    for entry in rd {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.is_file() {
            if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
                out.push(name.to_string());
            }
        }
    }
    Ok(out)
}

// Xoá một file (dùng để dọn bản sao lưu cũ).
#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}
```

- [ ] Bước 2: Vẫn trong `src-tauri/src/lib.rs`, tìm khối `tauri::generate_handler![ ... ]`. Thêm `list_files` và `delete_file` vào cuối danh sách. Sau khi sửa, khối đó phải trông đúng như sau:

```rust
        .invoke_handler(tauri::generate_handler![
            list_content_templates,
            read_text_file,
            write_text_file,
            ensure_dir,
            copy_file,
            open_path,
            list_files,
            delete_file
        ])
```

(Chú ý: `open_path` giờ có dấu phẩy phía sau; dòng cuối `delete_file` KHÔNG có dấu phẩy.)

- [ ] Bước 3: Kiểm phần Rust biên dịch được
      Run: `cd src-tauri && cargo build`
      You should see: kết thúc bằng `Finished ...`, KHÔNG có dòng `error[...]`. (Cảnh báo "warning" về hàm chưa dùng là chấp nhận được ở bước này — hook ở Task 3 sẽ dùng tới.)
      Nếu gặp lỗi → DỪNG, đọc lỗi, thường là thiếu/thừa dấu phẩy trong danh sách handler.

- [ ] Bước 4: Lưu tiến độ
      Run: `cd .. && git add src-tauri/src/lib.rs && git commit -m "feat(backup): them lenh Rust list_files + delete_file"`

---

### Task 3: Viết hook tự-sao-lưu-khi-đóng + cấp quyền đóng cửa sổ

**What you'll have when this is done:** Logic hoàn chỉnh: khi cửa sổ đóng, app chép DB ra bản hôm nay rồi dọn bản cũ, sau đó mới đóng thật — và nếu có trục trặc thì vẫn đóng được bình thường.

- [ ] Bước 1: Mở `src-tauri/capabilities/default.json`. Trong mảng `"permissions"`, thêm dòng `"core:window:allow-destroy",` ngay dưới `"core:default",`. Sau khi sửa, mảng phải như sau:

```json
  "permissions": [
    "core:default",
    "core:window:allow-destroy",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "dialog:default"
  ]
```

- [ ] Bước 2: Tạo file mới `src/hooks/useAutoBackup.js` với đúng nội dung sau:

```js
import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { localDateStamp, backupFileName, pickBackupsToDelete } from '../utils/backupRotation';

const KEEP_DAYS = 14;

// Suy ra đường dẫn DB sống (giống logic trong SettingsPage/db.js).
const getDbPath = () => {
  const folder = localStorage.getItem('pb-db-folder') || 'D:\\0. Problems Bank\\app-data';
  return localStorage.getItem('pb-db-path-active') || `${folder}\\problem_bank.db`;
};
const dirOf = (p) => p.replace(/[\\/][^\\/]+$/, '');

// Chép DB ra bản của hôm nay + dọn bản quá hạn.
// Người gọi phải BỌC try/catch để lỗi không bao giờ chặn việc thoát app.
export const runAutoBackup = async () => {
  if (localStorage.getItem('pb-auto-backup-enabled') === '0') return; // đang tắt

  const dbPath = getDbPath();
  const backupsDir = dirOf(dbPath) + '\\backups';
  await invoke('ensure_dir', { path: backupsDir });

  const today = localDateStamp(new Date());
  const target = backupsDir + '\\' + backupFileName(today);
  await invoke('copy_file', { src: dbPath, dst: target }); // ghi đè nếu trùng ngày
  localStorage.setItem('pb-auto-backup-last', today);

  const files = await invoke('list_files', { dir: backupsDir });
  const toDelete = pickBackupsToDelete(files, today, KEEP_DAYS);
  for (const name of toDelete) {
    try { await invoke('delete_file', { path: backupsDir + '\\' + name }); }
    catch (e) { console.warn('Không xoá được bản cũ:', name, e); }
  }
};

// Đăng ký MỘT LẦN: bắt sự kiện đóng cửa sổ -> sao lưu -> mới đóng thật.
export const useAutoBackup = () => {
  useEffect(() => {
    let unlisten;
    let closing = false;
    (async () => {
      try {
        const w = getCurrentWindow();
        unlisten = await w.onCloseRequested(async (event) => {
          if (closing) return;      // lần thứ 2 vào đây: cho phép đóng
          event.preventDefault();   // giữ cửa sổ lại để kịp sao lưu
          closing = true;
          try { await runAutoBackup(); }
          catch (e) { console.warn('Auto-backup lỗi (vẫn cho thoát):', e); }
          await w.destroy();        // đóng thật
        });
      } catch (e) {
        // Chạy ngoài Tauri (vd npm start thuần trình duyệt) -> không có cửa sổ: bỏ qua an toàn.
        console.warn('Không đăng ký được auto-backup:', e);
      }
    })();
    return () => { if (unlisten) unlisten(); };
  }, []);
};
```

- [ ] Bước 3: Mở `src/App.jsx`. Thêm dòng import (đặt cạnh các import hook khác, ví dụ ngay dưới `import { useTaxonomy } from './hooks/useTaxonomy';`):

```js
import { useAutoBackup } from './hooks/useAutoBackup';
```

Rồi trong thân hàm `function App() {`, thêm một dòng gọi hook ngay sau `const ui = useUIState();`:

```js
  useAutoBackup(); // tự sao lưu khi đóng app
```

- [ ] Bước 4: Kiểm cả app chạy được và không vỡ khi khởi động
      Run: `npx tauri dev`
      You should see: cửa sổ app mở lên bình thường như mọi khi; mở DevTools (F12) → tab Console KHÔNG có lỗi đỏ liên quan `useAutoBackup`/`onCloseRequested`. (Chưa cần thử đóng ở bước này — để Task 5 kiểm kỹ.)
      Nếu app không mở hoặc Console báo lỗi quyền `destroy` → kiểm lại Bước 1 (capabilities).

- [ ] Bước 5: Lưu tiến độ
      Run: `git add src/hooks/useAutoBackup.js src/App.jsx src-tauri/capabilities/default.json && git commit -m "feat(backup): hook tu sao luu khi dong app + quyen destroy"`

---

### Task 4: Thêm công tắc + trạng thái trong Cài đặt

**What you'll have when this is done:** Thầy nhìn thấy và bật/tắt được tính năng, biết bản gần nhất là ngày nào, và mở nhanh được thư mục chứa các bản sao lưu.

- [ ] Bước 1: Mở `src/components/SettingsPage.jsx`. Tìm khối này (khoảng dòng 55–59):

```js
  const [dbPath, setDbPath] = useState('');
  useEffect(() => {
    const folder = localStorage.getItem('pb-db-folder') || 'D:\\0. Problems Bank\\app-data';
    setDbPath(localStorage.getItem('pb-db-path-active') || `${folder}\\problem_bank.db`);
  }, []);
```

Ngay SAU khối đó, dán thêm phần state + hàm phụ trợ cho auto-backup:

```js
  const [autoBackup, setAutoBackup] = useState(localStorage.getItem('pb-auto-backup-enabled') !== '0');
  const [lastBackup, setLastBackup] = useState(localStorage.getItem('pb-auto-backup-last') || '');
  const toggleAutoBackup = () => {
    const next = !autoBackup;
    localStorage.setItem('pb-auto-backup-enabled', next ? '1' : '0');
    setAutoBackup(next);
  };
  const openBackupsFolder = async () => {
    const backups = dbPath.replace(/[\\/][^\\/]+$/, '') + '\\backups';
    try { await invoke('ensure_dir', { path: backups }); } catch (_) {}
    invoke('open_path', { path: backups }).catch(() => {});
  };
  const fmtBackupDate = (iso) => {
    if (!iso) return 'chưa có bản nào';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
```

- [ ] Bước 2: Vẫn trong file đó, tìm khối 3 nút của mục "Vị trí dữ liệu & sao lưu":

```jsx
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="card-btn card-btn-primary" onClick={backupNow} disabled={!dbPath}>Sao lưu ngay</button>
          <button className="card-btn" onClick={openDbFolder} disabled={!dbPath}>Mở thư mục</button>
          <button className="card-btn" onClick={restoreBackup} disabled={!dbPath}>Khôi phục dữ liệu</button>
        </div>
```

Ngay SAU khối `</div>` đó (vẫn nằm trong thẻ card, tức TRƯỚC dấu `</div>` đóng card), dán thêm phần tự-động-sao-lưu:

```jsx
        <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 4, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Tự động sao lưu khi đóng app</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              {autoBackup
                ? `Đang bật · bản gần nhất: ${fmtBackupDate(lastBackup)} · giữ 14 ngày gần nhất`
                : 'Đang tắt — đóng app sẽ không tự sao lưu.'}
            </div>
          </div>
          <button className="card-btn" onClick={openBackupsFolder} disabled={!dbPath}>Mở thư mục sao lưu</button>
          <button className={autoBackup ? 'card-btn' : 'card-btn card-btn-primary'} onClick={toggleAutoBackup}>
            {autoBackup ? 'Tắt' : 'Bật'}
          </button>
        </div>
```

- [ ] Bước 3: Kiểm giao diện
      Run: `npx tauri dev` (nếu chưa chạy) → vào **Cài đặt** → khối "Vị trí dữ liệu & sao lưu".
      You should see: một dòng mới **"Tự động sao lưu khi đóng app"** ghi *"Đang bật · bản gần nhất: chưa có bản nào · giữ 14 ngày gần nhất"*, kèm 2 nút **"Mở thư mục sao lưu"** và **"Tắt"**. Bấm "Tắt" → chữ đổi thành *"Đang tắt…"* và nút thành **"Bật"**. Bấm lại "Bật" để trả về mặc định.

- [ ] Bước 4: Lưu tiến độ
      Run: `git add src/components/SettingsPage.jsx && git commit -m "feat(backup): cong tac auto-backup + trang thai + mo thu muc sao luu"`

---

### Task 5: Kiểm thử thật đầu-cuối (bằng chứng tính năng chạy đúng)

**What you'll have when this is done:** Xác nhận tận mắt: đóng app tạo đúng 1 bản/ngày, dọn đúng bản cũ, không đụng file lạ, tắt thì không chạy, và lỗi cũng không kẹt app.

- [ ] Bước 1: Bật app và đảm bảo công tắc đang BẬT
      Run: `npx tauri dev`
      Vào Cài đặt, chắc chắn dòng auto-backup ghi "Đang bật". Đóng cửa sổ app (nút X). Mở lại bằng `npx tauri dev`.
      Vào Cài đặt → bấm **"Mở thư mục sao lưu"**.
      You should see: Windows Explorer mở thư mục `D:\0. Problems Bank\app-data\backups\`, bên trong có **1 file** tên `problem_bank-auto-<hôm-nay>.db` (ví dụ `problem_bank-auto-2026-07-02.db`). Dòng trạng thái giờ ghi ngày hôm nay.

- [ ] Bước 2: Kiểm "mỗi ngày chỉ 1 bản"
      Đóng app rồi mở lại một lần nữa (vẫn trong hôm nay).
      You should see: trong `backups\` **vẫn chỉ 1 file** của hôm nay (được cập nhật, không đẻ thêm file thứ 2).

- [ ] Bước 3: Kiểm dọn bản cũ + chừa file lạ
      Trong khi app đang ĐÓNG: vào thư mục `backups\`, chép file hôm nay ra 2 bản và đổi tên thành `problem_bank-auto-2020-01-01.db` (bản rất cũ) và tạo thêm một file trống `ghichu.txt`. Mở lại app rồi đóng lại.
      You should see: `problem_bank-auto-2020-01-01.db` đã **bị xoá** (quá 14 ngày), còn `ghichu.txt` và bản hôm nay **vẫn còn nguyên**.

- [ ] Bước 4: Kiểm công tắc TẮT
      Mở app → Cài đặt → bấm **"Tắt"** → đóng app → mở lại → xem `backups\`.
      You should see: KHÔNG có bản mới nào được tạo/cập nhật cho lần đóng đó. Xong thì bật lại "Bật".

- [ ] Bước 5: Kiểm an toàn khi lỗi (không kẹt app)
      Mở DevTools (F12) → Console, gõ: `localStorage.setItem('pb-db-path-active','D:\\khong-ton-tai\\x.db')` rồi Enter, sau đó đóng app.
      You should see: app **vẫn đóng được bình thường** (không treo, không kẹt cửa sổ). Mở lại app, vào Console gõ `localStorage.removeItem('pb-db-path-active')` để trả lại đường dẫn thật, rồi đóng-mở một lần cho chắc.

---

### Task 6: Chạy toàn bộ bài kiểm + xác nhận xuất .tex nguyên vẹn + chốt

**What you'll have when this is done:** Bằng chứng cả kho vẫn xanh, đường xuất LaTeX không hề bị ảnh hưởng, và mọi thứ đã được lưu.

- [ ] Bước 1: Chạy TOÀN BỘ bài kiểm
      Run: `npm test -- --watchAll=false`
      You should see: dòng tổng kết `Tests: <tất cả> passed` — trong đó có 9 bài mới của `backupRotation` và các bài **golden export** (xuất `.tex`) vẫn xanh. KHÔNG có bài đỏ.

- [ ] Bước 2: Xác nhận đường xuất KHÔNG đổi (khoá an toàn)
      Run: `git status --short`
      You should see: KHÔNG có thay đổi nào ở `src/utils/buildProblemTex.js`, `src/utils/buildContentFile.js`, hay `src/utils/db.js`. (Chỉ những file trong danh sách kế hoạch mới xuất hiện.) Đây là bằng chứng đường xuất LaTeX an toàn.

- [ ] Bước 3: Kiểm app build bản phát hành sạch
      Run: `npm run build`
      You should see: `Compiled successfully` (hoặc tương đương), **0 warning**.

- [ ] Bước 4: Lưu chốt (nếu Task trước còn sót gì chưa commit)
      Run: `git add -A && git status` → xem kỹ chỉ có các file trong kế hoạch → `git commit -m "chore(backup): chot tinh nang auto-backup"` (nếu không còn gì để commit thì bỏ qua).

> **Lưu ý bàn giao:** Sau khi Antigravity làm xong 6 Task, **Claude sẽ check lại** (đối chiếu plan từng dòng, chạy test, soi golden export) rồi Thầy nghiệm thu GUI. **Chỉ `git push` sau khi Thầy nghiệm thu** — đúng nhịp các phiên trước.

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order — don't skip ahead
3. Complete the "Check it works" step before moving to the next task
4. If something doesn't work as expected, stop and describe what you see — don't try random fixes

Say "let's start building" when you're ready to begin Task 1.
