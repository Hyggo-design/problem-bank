# Tự động sao lưu (Auto-backup khi đóng app) — Design Spec

**Ngày:** 02/07/2026
**Trạng thái:** Thiết kế đã chốt (Thầy duyệt 02/07/2026). Chờ lập plan → build.
**Quy trình:** Claude brainstorm + spec + plan → Antigravity build → Claude check lại.
**Bối cảnh:** Nhật ký [NK22](../22_2026_07_01.md) §5.1 — điểm tiếp tục #1. Nối tiếp cụm sao lưu/khôi phục đã có.

## Mục tiêu
Tự động sao lưu cơ sở dữ liệu **mỗi khi Thầy đóng app**, giữ lịch sử **14 ngày gần nhất** (mỗi ngày 1 bản), tự xoay vòng bản cũ. Mục tiêu: Thầy không phải nhớ bấm "Sao lưu ngay"; luôn có đường lùi vài ngày mà **không cần thao tác gì**.

## Quyết định đã chốt (qua brainstorm)
1. **Khi nào**: chỉ **khi đóng app** (Thầy chọn; KHÔNG thêm chốt-an-toàn-khi-mở).
2. **Giữ bao lâu**: **theo số ngày = 14**, mỗi ngày 1 snapshot.
3. **Luôn giữ bản mới nhất** dù đã cũ hơn 14 ngày (phòng khi nghỉ dài, tránh xoá sạch).

## Bối cảnh kỹ thuật (đã xác minh)
- **Một cửa sổ duy nhất** (`tauri.conf.json`) → bắt sự kiện đóng cửa sổ = bắt lúc thoát app.
- **Không dùng WAL**: `db.js` nạp SQLite ở chế độ ghi mặc định (rollback journal) → file `.db` toàn vẹn sau mỗi transaction ⇒ **copy 1 file `.db` là đủ**, không cần `-wal/-shm`. Giống hệt "Sao lưu ngay" đang chạy tốt.
- Lệnh Rust sẵn có: `copy_file(src,dst)`, `ensure_dir(path)`, `open_path(path)`. **Chưa có** lệnh liệt kê / xoá file → phải thêm (mục "Can thiệp code").
- DB sống: `<folder>\problem_bank.db`, `folder` lấy từ `localStorage['pb-db-path-active']` (fallback `pb-db-folder` + `\problem_bank.db`). `SettingsPage.jsx` đã có sẵn `dbPath`.

## Cơ chế
Mỗi lần **đóng cửa sổ**, ngay TRƯỚC khi thoát:
1. Nếu công tắc auto-backup đang **tắt** → bỏ qua, thoát bình thường.
2. `ensure_dir(<folder>\backups)`.
3. Tính ngày **địa phương** hôm nay → tên file `problem_bank-auto-YYYY-MM-DD.db`.
4. `copy_file(dbPath → <folder>\backups\problem_bank-auto-YYYY-MM-DD.db)` — **ghi đè** nếu hôm nay đã có (mỗi ngày 1 file, luôn là bản mới nhất trong ngày).
5. Ghi `localStorage['pb-auto-backup-last'] = YYYY-MM-DD` (cho dòng trạng thái).
6. **Dọn xoay vòng**: liệt kê file trong `backups\`, tính danh sách cần xoá (util thuần), xoá từng file.
7. Đóng cửa sổ thật (`destroy`).

Chạy **âm thầm**: không hộp thoại, không hỏi, không chặn thao tác thoát.

## Vị trí & tên file
- Thư mục riêng: **`<folder>\backups\`** (vd `D:\0. Problems Bank\app-data\backups\`) — tách khỏi DB sống và khỏi file phòng-hờ `problem_bank-autobackup.db` của Khôi phục.
- Tên: **`problem_bank-auto-YYYY-MM-DD.db`** → sắp theo tên = sắp theo thời gian.

## Quy tắc xoay vòng (util THUẦN, test được)
File mới `src/utils/backupRotation.js` — **thuần**, KHÔNG import `db.js`/`useTaxonomy` (theo khoá an toàn NK22: tránh kéo `@tauri-apps/plugin-sql` làm Jest fail). Mẫu: `findDuplicates.js`, `searchText.js`.
- `localDateStamp(date)` → `'YYYY-MM-DD'` theo giờ **địa phương**.
- `backupFileName(stamp)` → `problem_bank-auto-<stamp>.db`.
- `parseBackupStamp(name)` → stamp nếu khớp mẫu, ngược lại `null` (⇒ **bỏ qua mọi file lạ**).
- `pickBackupsToDelete(filenames, today, keepDays=14)` → trả danh sách file cần xoá:
  - Bỏ qua file không khớp mẫu.
  - **Luôn giữ bản mới nhất** (stamp lớn nhất) — không bao giờ nằm trong danh sách xoá.
  - Xoá file **cũ hơn `keepDays` ngày** so với `today` (chênh > 14 ngày).
- Kèm bộ test `backupRotation.test.js`: rỗng → []; toàn bản mới → []; có bản >14 ngày → xoá đúng; **tất cả >14 ngày → giữ đúng 1 bản mới nhất**; file lạ (vd `problem_bank-autobackup.db`, `.txt`) → không đụng; ranh giới đúng 14 vs 15 ngày.

## Trải nghiệm người dùng (UX)
Trong Cài đặt, khối **"Vị trí dữ liệu & sao lưu"** (cạnh *Sao lưu ngay / Mở thư mục / Khôi phục*), thêm:
- **Công tắc "Tự động sao lưu khi đóng app"** — mặc định **BẬT**. `localStorage['pb-auto-backup-enabled']` (`'0'` = tắt, khác = bật).
- **Dòng trạng thái**: *"Bản tự động gần nhất: DD/MM/YYYY · giữ 14 ngày."* (đọc `pb-auto-backup-last`; chưa có → "Chưa có bản nào").
- **Nút "Mở thư mục sao lưu"** → `ensure_dir` rồi `open_path(<folder>\backups)`.

## Mức độ can thiệp Code
| Chỗ | Thay đổi |
|---|---|
| `src/utils/backupRotation.js` + `.test.js` | **MỚI** — logic xoay vòng thuần + test |
| `src/hooks/useAutoBackup.js` | **MỚI** — đăng ký `onCloseRequested`, chép + dọn rồi `destroy` |
| `src/App.jsx` (điểm mount gốc) | gọi `useAutoBackup()` một lần |
| `src/components/SettingsPage.jsx` | công tắc + trạng thái + nút "Mở thư mục sao lưu" |
| `src-tauri/src/lib.rs` | thêm 2 lệnh `list_files(dir)`, `delete_file(path)` + đăng ký handler |
| `src-tauri/capabilities/*.json` | (kiểm tra) bổ sung quyền `window destroy` nếu thiếu |

**KHÓA AN TOÀN**: KHÔNG đụng `buildProblemTex`/`buildContentFile`/schema/bảng DB → **xuất `.tex` nguyên vẹn, golden test giữ nguyên**. Không đổi `getDb()` (không đóng kết nối để chép — chép DB sống, an toàn vì không WAL + lúc thoát không còn ghi).

## Rust (2 lệnh tí hon, cùng khuôn `copy_file`)
- `list_files(dir) -> Vec<String>`: đọc thư mục, trả **tên file** (không đường dẫn); thư mục chưa tồn tại → trả rỗng (không lỗi).
- `delete_file(path) -> Result<(),String>`: `remove_file`.

## Rủi ro & cách xử lý
- **App treo / mất điện / tắt cứng** → phiên đó không có bản. Đã chấp nhận khi Thầy chọn "khi đóng app".
- **Chép/xoá lỗi lúc thoát** (ổ đầy, quyền…) → **bọc try/catch, VẪN `destroy` để app thoát được** — tuyệt đối không kẹt Thầy trong cửa sổ không đóng. Ghi `console.warn`.
- **Vòng lặp đóng**: `onCloseRequested` gọi `preventDefault` rồi `destroy` (không phát lại close-requested); thêm cờ `closing` chống tái nhập.
- **Chép DB sống**: an toàn (không WAL, lúc thoát idle) — giống "Sao lưu ngay".
- **Múi giờ**: dùng ngày **địa phương** để "hôm nay" khớp lịch của Thầy.
- **Quyền Tauri**: `destroy` có thể cần `core:window:allow-destroy` trong capabilities → kiểm tra khi build.

## Ngoài phạm vi (YAGNI)
- Không backup theo lịch/định kỳ khi đang chạy; không chốt-khi-mở.
- Không nén/mã hoá bản sao lưu; không sao ra ổ ngoài/đám mây.
- Không UI xem/khôi phục từng bản auto (đã có **Khôi phục dữ liệu** — Thầy tự chọn 1 file `.db` bất kỳ, kể cả file trong `backups\`).
- Không cho chỉnh số ngày/số bản trong UI (cố định 14 ngày; muốn đổi thì sửa hằng số).

## Tiêu chí nghiệm thu (cho bước Claude check lại)
- Bật auto-backup → mở rồi đóng app → `backups\problem_bank-auto-<hôm-nay>.db` xuất hiện; mở lại đóng lần nữa trong ngày → **cùng 1 file** được cập nhật (không đẻ file thứ 2 cùng ngày).
- Giả lập file cũ >14 ngày trong `backups\` → sau một lần đóng, bản cũ bị xoá, **bản mới nhất luôn còn**; file lạ (`.txt`, `problem_bank-autobackup.db`) **không bị đụng**.
- Tắt công tắc → đóng app **không** tạo bản mới.
- Lỗi giả lập (vd trỏ `dbPath` sai) lúc đóng → app **vẫn thoát được**, không kẹt.
- `npm test`: bộ `backupRotation.test.js` xanh; **golden export .tex vẫn byte-identical** (không đụng đường xuất).
- `npm run build` 0 warning; `cargo build` ok (đã thêm 2 lệnh + capabilities nếu cần).
