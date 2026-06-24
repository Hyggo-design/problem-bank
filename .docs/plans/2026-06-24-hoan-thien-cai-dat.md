# Hoàn thiện trang Cài đặt — Build Plan

**What we're building:** Biến 3 mục placeholder trên Cài đặt thành chức năng thật: **nhập API key Gemini**, **bật Dark mode**, **xem đường dẫn DB + sao lưu**.

**Why:** Để bản đóng gói dùng được thật (Smart Import có key, dùng được ban đêm, tự sao lưu dữ liệu an toàn).

**Approach:** Làm từng mục độc lập, app chạy được sau mỗi task. Dark mode + API key thuần frontend; DB/sao lưu thêm 3 lệnh Rust nhỏ. **Không đụng** xuất `.tex`/`buildProblemTex`/schema; sao lưu chỉ đọc-copy file DB.

**Files we'll create or change:**
- `src/index.js` — sửa: áp theme đã lưu sớm (tránh nháy)
- `src/components/SettingsPage.jsx` — sửa: 3 mục thật (dark mode · API key · DB/sao lưu)
- `src/components/Modals/SmartImportModal.jsx` — sửa: tự tạo genAI từ key đã lưu (fallback env), nhắc khi thiếu key
- `src/App.jsx` — sửa: bỏ tạo genAI từ biến môi trường + prop genAI
- `src-tauri/src/lib.rs` — sửa: thêm 3 lệnh `get_db_path`/`copy_file`/`open_path`

> **Quy ước chung:**
> - **Frontend:** `$env:CI="false"; npm run build` → `Compiled successfully.` **0 warning**.
> - **Rust (không cần GUI):** `cargo check --manifest-path src-tauri/Cargo.toml` → `Finished`.
> - **Chạy thật (Thầy):** `npx tauri dev`.
> - **Nhánh:** `feat-hoan-thien-cai-dat` (tách `master`), merge sau khi Thầy nghiệm thu.
> - **KHÔNG đụng** `buildProblemTex`/xuất/schema. Không đổi cấu trúc DB (sao lưu chỉ copy file).

---

### Task 1: Dark mode (công tắc Sáng/Tối)

**What you'll have when this is done:** Trong Cài đặt có nút chuyển Sáng/Tối; đổi màu tức thì và nhớ qua lần mở app sau (không nháy lúc khởi động).

- [ ] Bước 1: Tạo nhánh.
      Run: `git checkout -b feat-hoan-thien-cai-dat`
      You should see: `Switched to a new branch 'feat-hoan-thien-cai-dat'`

- [ ] Bước 2: Mở `src/index.js`. Ngay **trước** dòng `const root = ReactDOM.createRoot(...)`, thêm:
      ```js
      // Áp theme đã lưu TRƯỚC khi React vẽ (tránh nháy màu khi mở app)
      document.documentElement.setAttribute('data-theme', localStorage.getItem('pb-theme') || 'light');
      ```

- [ ] Bước 3: Mở `src/components/SettingsPage.jsx`. Trong thân `SettingsPage`, ngay **sau** hàm `pickFolder` (trước `return (`), thêm:
      ```js
      const [dark, setDark] = useState((localStorage.getItem('pb-theme') || 'light') === 'dark');
      const toggleDark = () => {
        const next = dark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('pb-theme', next);
        setDark(!dark);
      };
      ```

- [ ] Bước 4: Trong cùng file, thay dòng mục "Giao diện tối" (đang `soon`):
      ```jsx
      <Row icon={<Moon size={20} />} title="Giao diện tối" desc="Bật/tắt dark mode." soon />
      ```
      bằng:
      ```jsx
      <Row
        icon={<Moon size={20} />}
        title="Giao diện tối"
        desc={dark ? 'Đang bật (Tối).' : 'Đang tắt (Sáng).'}
        action={<button className="card-btn card-btn-primary" onClick={toggleDark}>{dark ? 'Chuyển Sáng' : 'Chuyển Tối'}</button>}
      />
      ```

- [ ] Bước 5: Check + lưu.
      Run: `$env:CI="false"; npm run build` → `Compiled successfully.` 0 warning.
      *(Trực quan: `npx tauri dev` → Cài đặt → bấm "Chuyển Tối" đổi cả app sang tối; tắt/mở lại app vẫn tối; bấm "Chuyển Sáng" về sáng. Thầy kiểm khi tiện.)*
      Run: `git add . ; git commit -m "feat(settings): dark mode cong tac Sang/Toi (nho lua chon)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 2: Nhập API key Gemini

**What you'll have when this is done:** Cài đặt có ô nhập API key (che/hiện + Lưu); Smart Import đọc key từ đó (không cần biến môi trường); chưa có key thì nhắc rõ thay vì lỗi.

- [ ] Bước 1: `src/components/SettingsPage.jsx` — thêm import toast ở đầu file (sau dòng import dialog):
      ```jsx
      import { useToast } from '../hooks/useToast';
      ```
      Trong thân component (sau `toggleDark`), thêm:
      ```js
      const { success } = useToast();
      const [apiKey, setApiKey] = useState(localStorage.getItem('pb-gemini-key') || '');
      const [showKey, setShowKey] = useState(false);
      const saveKey = () => { localStorage.setItem('pb-gemini-key', apiKey.trim()); success('Đã lưu API key'); };
      ```

- [ ] Bước 2: Thay dòng mục "Khoá API Gemini" (đang `soon`):
      ```jsx
      <Row icon={<KeyRound size={20} />} title="Khoá API Gemini" desc="Dùng cho Smart Import." soon />
      ```
      bằng khối có ô nhập:
      ```jsx
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ color: 'var(--color-cobalt)', display: 'flex' }}><KeyRound size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Khoá API Gemini</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Dùng cho Smart Import (bóc tách ảnh/PDF). Lưu trên máy này.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Dán API key vào đây"
            style={{ flex: 1, padding: '0.55rem', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }} />
          <button className="card-btn" onClick={() => setShowKey((s) => !s)}>{showKey ? 'Ẩn' : 'Hiện'}</button>
          <button className="card-btn card-btn-primary" onClick={saveKey}>Lưu</button>
        </div>
      </div>
      ```

- [ ] Bước 3: `src/components/Modals/SmartImportModal.jsx` — tự tạo genAI từ key đã lưu.
      - Sửa dòng import React đầu file thành (thêm `useMemo`):
        ```jsx
        import React, { useState, useEffect, useRef, useMemo } from 'react';
        ```
      - Thêm import (gần các import khác):
        ```jsx
        import { GoogleGenerativeAI } from '@google/generative-ai';
        ```
      - Bỏ `genAI` khỏi tham số: đổi `const SmartImportModal = ({ onClose, onSave, genAI }) => {` thành `const SmartImportModal = ({ onClose, onSave }) => {`
      - Ngay sau dòng `const fileInputRef = useRef(null);`, thêm:
        ```js
        const apiKey = (localStorage.getItem('pb-gemini-key') || process.env.REACT_APP_GEMINI_API_KEY || '').trim();
        const genAI = useMemo(() => (apiKey ? new GoogleGenerativeAI(apiKey) : null), [apiKey]);
        ```

- [ ] Bước 4: Cùng file — chặn khi thiếu key + nhắc người dùng.
      - Trong `handleProcess`, ngay sau `if (files.length === 0) return;`, thêm:
        ```js
        if (!genAI) { toast.error('Chưa có API key Gemini — vào Cài đặt để nhập.'); return; }
        ```
      - Trong khối `{step === 'upload' && ( <div ...>`, thêm ngay đầu (trước ô kéo thả) một nhắc nhở:
        ```jsx
        {!genAI && (
          <div style={{ padding: '0.8rem 1rem', borderRadius: 8, background: '#fef3c7', color: '#92400e', fontSize: '0.9rem' }}>
            Chưa có API key Gemini. Vào <b>Cài đặt → Khoá API Gemini</b> để nhập, rồi mở lại cửa sổ này.
          </div>
        )}
        ```
      - Nút "Bắt đầu chuyển hóa": đổi `disabled={files.length === 0}` thành `disabled={files.length === 0 || !genAI}` (và đổi điều kiện màu/cursor tương ứng `files.length > 0` → `files.length > 0 && genAI` nếu muốn nút mờ đi).

- [ ] Bước 5: `src/App.jsx` — bỏ tạo genAI từ biến môi trường.
      - Xoá dòng `import { GoogleGenerativeAI } from '@google/generative-ai';`
      - Xoá 2 dòng `const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;` và `const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);`
      - Trong chỗ render `<SmartImportModal ... />`, xoá dòng prop `genAI={genAI}`.

- [ ] Bước 6: Check + lưu.
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully.` — **0 warning**.
      *Nếu cảnh báo `'GoogleGenerativeAI' is defined but never used` ở App:* còn sót import — xoá. *Nếu `genAI is not defined`:* còn chỗ dùng `genAI` trong App — đảm bảo đã bỏ prop.
      Run: `git add . ; git commit -m "feat(settings): nhap API key Gemini trong app (SmartImport doc localStorage, fallback env)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 3: 3 lệnh Rust cho DB & sao lưu

**What you'll have when this is done:** Phía Rust có sẵn lệnh lấy đường dẫn DB, copy file (nhị phân an toàn), và mở thư mục; chưa ai gọi nên app chạy y như cũ.

- [ ] Bước 1: Mở `src-tauri/src/lib.rs`. Sửa dòng đầu `use std::fs;` thành 2 dòng:
      ```rust
      use std::fs;
      use tauri::Manager;
      ```

- [ ] Bước 2: Ngay **sau** lệnh `write_text_file` (trước `#[cfg_attr(mobile, ...)]`), thêm 3 lệnh:
      ```rust
      // Đường dẫn file DB (để hiển thị + làm nguồn sao lưu).
      #[tauri::command]
      fn get_db_path(app: tauri::AppHandle) -> Result<String, String> {
          let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
          Ok(dir.join("problem_bank.db").to_string_lossy().to_string())
      }

      // Copy file (nhị phân an toàn) — dùng cho sao lưu DB.
      #[tauri::command]
      fn copy_file(src: String, dst: String) -> Result<(), String> {
          std::fs::copy(&src, &dst).map(|_| ()).map_err(|e| e.to_string())
      }

      // Mở một thư mục trong Windows Explorer.
      #[tauri::command]
      fn open_path(path: String) -> Result<(), String> {
          std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?;
          Ok(())
      }
      ```

- [ ] Bước 3: Đăng ký 3 lệnh — sửa `generate_handler!` thành:
      ```rust
      .invoke_handler(tauri::generate_handler![
          list_content_templates,
          read_text_file,
          write_text_file,
          get_db_path,
          copy_file,
          open_path
      ])
      ```

- [ ] Bước 4: Kiểm Rust biên dịch.
      Run: `cargo check --manifest-path "src-tauri/Cargo.toml"`
      You should see: `Finished ...`, không dòng `error`.
      *Nếu lỗi `no method named path`:* kiểm Bước 1 đã thêm `use tauri::Manager;`.

- [ ] Bước 5: Kiểm frontend + lưu.
      Run: `$env:CI="false"; npm run build` → 0 warning.
      Run: `git add . ; git commit -m "feat(tauri): lenh get_db_path/copy_file/open_path cho sao luu DB" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 4: Cài đặt — đường dẫn DB + Sao lưu + Mở thư mục

**What you'll have when this is done:** Mục "Vị trí dữ liệu & sao lưu" hiện đường dẫn DB thật, có nút **Sao lưu ngay** (copy ra nơi Thầy chọn) và **Mở thư mục**.

- [ ] Bước 1: `src/components/SettingsPage.jsx` — bổ sung import:
      - Đổi dòng `import React, { useState } from 'react';` thành `import React, { useState, useEffect } from 'react';`
      - Đổi `import { open } from '@tauri-apps/plugin-dialog';` thành `import { open, save } from '@tauri-apps/plugin-dialog';`
      - Thêm `import { invoke } from '@tauri-apps/api/core';`
      - Đổi `const { success } = useToast();` (thêm ở Task 2) thành `const { success, error } = useToast();`

- [ ] Bước 2: Trong thân component, thêm state + 2 hàm (sau `saveKey`):
      ```js
      const [dbPath, setDbPath] = useState('');
      useEffect(() => { invoke('get_db_path').then(setDbPath).catch(() => {}); }, []);
      const backupNow = async () => {
        if (!dbPath) return;
        const today = new Date().toISOString().slice(0, 10);
        const dst = await save({ defaultPath: `problem_bank-backup-${today}.db`, filters: [{ name: 'SQLite DB', extensions: ['db'] }] });
        if (!dst) return;
        try { await invoke('copy_file', { src: dbPath, dst }); success('Đã sao lưu cơ sở dữ liệu'); }
        catch (e) { error('Lỗi sao lưu: ' + e); }
      };
      const openDbFolder = () => {
        const folder = dbPath.replace(/[\\/][^\\/]+$/, '');
        invoke('open_path', { path: folder }).catch(() => {});
      };
      ```

- [ ] Bước 3: Thay dòng mục "Vị trí dữ liệu & sao lưu" (đang `soon`):
      ```jsx
      <Row icon={<Database size={20} />} title="Vị trí dữ liệu & sao lưu" desc="Đường dẫn CSDL, backup." soon />
      ```
      bằng khối:
      ```jsx
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ color: 'var(--color-cobalt)', display: 'flex' }}><Database size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Vị trí dữ liệu & sao lưu</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>{dbPath || 'Đang lấy đường dẫn…'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="card-btn card-btn-primary" onClick={backupNow} disabled={!dbPath}>Sao lưu ngay</button>
          <button className="card-btn" onClick={openDbFolder} disabled={!dbPath}>Mở thư mục</button>
        </div>
      </div>
      ```

- [ ] Bước 4: Check it works.
      Run: `$env:CI="false"; npm run build` → `Compiled successfully.` 0 warning.
      *(Trực quan — Thầy: `npx tauri dev` → Cài đặt: thấy đường dẫn DB; "Sao lưu ngay" → chọn chỗ lưu → ra file `.db`; "Mở thư mục" bật Explorer đúng chỗ.)*

- [ ] Bước 5: Lưu tiến độ.
      Run: `git add . ; git commit -m "feat(settings): duong dan DB + Sao luu ngay + Mo thu muc" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 5: Nghiệm thu cuối

**What you'll have when this is done:** Chắc chắn 3 mục chạy đúng, không đụng xuất/đề, build sạch cả frontend lẫn Rust.

- [ ] Bước 1: Kiểm tổng.
      Run: `$env:CI="false"; npm run build` → `Compiled successfully.` 0 warning.
      Run: `cargo check --manifest-path "src-tauri/Cargo.toml"` → `Finished`, không `error`.

- [ ] Bước 2: **An toàn xuất** — `buildProblemTex` không đổi (đợt này không đụng).
      Run: `git diff master -- src/utils/buildProblemTex.js`
      You should see: **rỗng**.

- [ ] Bước 3: **Nghiệm thu thật (Thầy `npx tauri dev`)**:
      1. **Dark mode**: Cài đặt → Chuyển Tối → cả app tối; tắt/mở lại app vẫn tối; Chuyển Sáng → sáng lại.
      2. **API key**: xoá key (để trống + Lưu) → mở Smart Import thấy nhắc + nút khoá; dán key + Lưu → Smart Import bóc tách ảnh/PDF chạy lại.
      3. **DB & sao lưu**: thấy đúng đường dẫn DB; Sao lưu ngay → chọn chỗ → file `.db` tạo ra mở được + đúng dung lượng; Mở thư mục bật Explorer đúng chỗ.
      4. Thêm/sửa/xoá 1 bài + xuất 1 file nội dung thử → vẫn bình thường (không bị ảnh hưởng).

- [ ] Bước 4: Lưu tiến độ cuối.
      Run: `git add . ; git commit -m "chore(settings): nghiem thu hoan thien Cai dat (buildProblemTex byte-identical)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

> **Sau khi Thầy nghiệm thu xong:** merge vào `master` (`git checkout master ; git merge --no-ff feat-hoan-thien-cai-dat`) → viết nhật ký số 15 + cập nhật memory.

---

## Ready to Build

Kế hoạch đã lưu tại `.docs/plans/2026-06-24-hoan-thien-cai-dat.md`. Việc cần làm:

1. Đọc lướt cả kế hoạch một lượt trước khi bắt đầu.
2. Làm theo thứ tự task — đừng nhảy cóc (mỗi task xong app vẫn chạy được).
3. Hoàn thành bước "Check it works" trước khi sang task kế.
4. Nếu có gì không như mong đợi, **dừng lại và mô tả đúng những gì thấy** — đừng thử sửa lung tung.

Nói **"bắt đầu build"** (hoặc "làm Task 1") khi Thầy sẵn sàng.
