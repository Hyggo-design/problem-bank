# GĐ3 (đợt con) — Template xuất "file nội dung" (Mức 2) — Build Plan

**What we're building:** App xuất một **file nội dung `.tex`** dựa trên template Thầy tự soạn (đọc từ một thư mục, điền header, chèn các bài trong giỏ), lưu qua hộp thoại Save As — để `\input` vào `main.tex` của Thầy.

**Why:** Khớp đúng quy trình LaTeX thật của Thầy (main.tex + data/), thay cho kiểu xuất "tài liệu độc lập" cũ không dùng được.

**Approach:** Làm phần lõi an toàn trước (hàm thuần `buildContentFile` + golden-file test — em kiểm được hết). Rồi thêm hạ tầng Tauri (đọc/ghi file + hộp thoại). Rồi nối vào Cài đặt + viết lại ExportModal. **Không đụng** `buildProblemTex` (khối mỗi bài) — chứng minh byte-identical.

**Files we'll create or change:**
- `src/utils/buildContentFile.js` — **mới**: hàm thuần dựng file nội dung + parse header (dùng lại `buildProblemTex`)
- `src/utils/buildContentFile.test.js` — **mới**: golden-file test khoá định dạng
- `src-tauri/Cargo.toml` — sửa: thêm `tauri-plugin-dialog`
- `src-tauri/src/lib.rs` — sửa: đăng ký plugin dialog + 3 lệnh Rust đọc/ghi file
- `src-tauri/capabilities/default.json` — sửa: thêm quyền `dialog:default`
- `package.json` — sửa: thêm `@tauri-apps/plugin-dialog` (+ `@tauri-apps/api` nếu thiếu)
- `src/components/SettingsPage.jsx` — sửa: mục "Thư mục template" (chọn folder, lưu localStorage)
- `src/components/Modals/ExportModal.jsx` — **viết lại**: chọn template + form header động + Save As
- `src/App.jsx` — sửa: bỏ `handleFinalExport` cũ + `buildProblemTex` import; gọn ExportModal

> **Quy ước chung khi làm:**
> - **Kiểm frontend:** `$env:CI="false"; npm run build` → `Compiled successfully.` **0 warning**.
> - **Kiểm Rust (KHÔNG cần GUI):** `cd src-tauri; cargo check` → `Finished`. *(Lần đầu sau khi thêm plugin sẽ hơi lâu.)*
> - **Kiểm golden-file:** `$env:CI="true"; npm test` → tất cả test **PASS**.
> - **Chạy thật để nhìn (Thầy):** `npx tauri dev` (sẽ build lại Rust lần đầu — chờ chút).
> - **Lưu tiến độ:** mỗi task xong commit (kèm dòng đồng tác giả).
> - **Nhánh:** làm trên `ux-gd3-template-xuat` (tách `master`), merge sau khi Thầy nghiệm thu.
> - **KHÔNG đụng** `src/utils/buildProblemTex.js` (khối `\begin{bt}` mỗi bài) — sacred.

---

### Task 1: Lõi xuất — hàm thuần `buildContentFile` + golden-file test

**What you'll have when this is done:** Một hàm dựng file nội dung (điền header + nối các bài) đã được test khoá định dạng byte-for-byte; chưa nối vào app nên giao diện chưa đổi.

- [ ] Bước 1: Tạo nhánh.
      Run: `git checkout -b ux-gd3-template-xuat`
      You should see: `Switched to a new branch 'ux-gd3-template-xuat'`

- [ ] Bước 2: Tạo `src/utils/buildContentFile.js`:
      ```js
      // Dựng FILE NỘI DUNG (.tex) để \input vào main.tex của Thầy.
      // KHÔNG đụng khối mỗi bài: tái dùng buildProblemTex (sacred).
      import { buildProblemTex } from './buildProblemTex';

      // Đọc các ô header trong khối \begin{name}...\end{name}.
      // Trả [{ label }] theo đúng thứ tự (nhãn = phần sau % của mỗi dòng {} %Nhãn).
      export const parseHeaderFields = (templateText = '') => {
        const begin = templateText.indexOf('\\begin{name}');
        const end = templateText.indexOf('\\end{name}');
        if (begin === -1 || end === -1 || end < begin) return [];
        const block = templateText.slice(begin, end);
        const fields = [];
        for (const line of block.split('\n')) {
          const m = line.match(/^\s*\{[^}]*\}\s*%\s*(.+?)\s*$/);
          if (m) fields.push({ label: m[1] });
        }
        return fields;
      };

      // Điền giá trị vào các ô {} trong khối name (theo thứ tự).
      const fillHeader = (templateText, values = []) => {
        const begin = templateText.indexOf('\\begin{name}');
        const end = templateText.indexOf('\\end{name}');
        if (begin === -1 || end === -1 || end < begin) return templateText;
        const before = templateText.slice(0, begin);
        const block = templateText.slice(begin, end);
        const after = templateText.slice(end);
        let i = 0;
        const filledBlock = block.split('\n').map((line) => {
          if (/^\s*\{[^}]*\}\s*%/.test(line) && i < values.length) {
            const v = values[i++] ?? '';
            return line.replace(/\{[^}]*\}/, `{${v}}`);
          }
          return line;
        }).join('\n');
        return before + filledBlock + after;
      };

      // Dựng cả file nội dung: header đã điền + các khối bài nối ở cuối.
      export const buildContentFile = (templateText, fieldValues, problems, { includeSolution = true, shuffle = false } = {}) => {
        const filled = fillHeader(templateText, fieldValues);
        let items = [...(problems || [])];
        if (shuffle) items = items.sort(() => Math.random() - 0.5);
        const blocks = items.map((p) => buildProblemTex(p, { includeSolution })).join('\n\n');
        return filled.replace(/\s*$/, '') + '\n\n' + blocks + '\n';
      };
      ```

- [ ] Bước 3: Tạo `src/utils/buildContentFile.test.js` (golden-file — khoá đúng từng byte):
      ```js
      import { buildContentFile, parseHeaderFields } from './buildContentFile';

      const TEMPLATE = [
        '\\begin{name}',
        '\t{} %PHÒNG GIÁO DỤC',
        '\t{} %TRƯỜNG HỌC',
        '\t{} %TÊN KỲ THI',
        '\t{} %MÔN THI',
        '\t{} %NĂM HỌC',
        '\t{} %THỜI GIAN',
        '\\end{name}',
        '',
        '%Từ đây tôi bắt đầu gõ bài tập nè',
        '',
      ].join('\n');

      test('parseHeaderFields đọc đúng 6 nhãn của Đề thi', () => {
        expect(parseHeaderFields(TEMPLATE).map((f) => f.label)).toEqual([
          'PHÒNG GIÁO DỤC', 'TRƯỜNG HỌC', 'TÊN KỲ THI', 'MÔN THI', 'NĂM HỌC', 'THỜI GIAN',
        ]);
      });

      test('buildContentFile khớp golden byte-for-byte', () => {
        const problems = [
          { statement: 'Chứng minh $x^2+y^2=z^2$ có vô số nghiệm nguyên.', solution: 'Bộ ba Pythagore.', options: [] },
          { statement: 'Chọn đáp án đúng:', solution: '', options: [ { text: '$1$', isTrue: false }, { text: '$2$', isTrue: true } ] },
        ];
        const out = buildContentFile(
          TEMPLATE,
          ['PGD A', 'THPT B', 'KỲ THI C', 'Toán', '2025-2026', '90 phút'],
          problems,
          { includeSolution: true, shuffle: false }
        );
        const golden = [
          '\\begin{name}',
          '\t{PGD A} %PHÒNG GIÁO DỤC',
          '\t{THPT B} %TRƯỜNG HỌC',
          '\t{KỲ THI C} %TÊN KỲ THI',
          '\t{Toán} %MÔN THI',
          '\t{2025-2026} %NĂM HỌC',
          '\t{90 phút} %THỜI GIAN',
          '\\end{name}',
          '',
          '%Từ đây tôi bắt đầu gõ bài tập nè',
          '',
          '\\begin{bt}',
          'Chứng minh $x^2+y^2=z^2$ có vô số nghiệm nguyên.',
          '\\loigiai{',
          'Bộ ba Pythagore.',
          '}',
          '\\end{bt}',
          '',
          '\\begin{bt}',
          'Chọn đáp án đúng:',
          '\\choice',
          '  {$1$}',
          '  {\\True $2$}',
          '\\end{bt}',
          '',
        ].join('\n');
        expect(out).toBe(golden);
      });
      ```

- [ ] Bước 4: Chạy test.
      Run: `$env:CI="true"; npm test`
      You should see: 2 test **PASS** (`Tests: 2 passed`).
      *Nếu lệch:* Jest in ra phần khác nhau (mong đợi vs nhận được) — đọc kỹ chỗ khác whitespace, sửa golden hoặc hàm cho khớp ý đồ. (Đây chính là tác dụng "khoá định dạng".)

- [ ] Bước 5: Kiểm biên dịch frontend + lưu.
      Run: `$env:CI="false"; npm run build` → `Compiled successfully.` 0 warning (file mới chưa ai dùng).
      Run: `git add . ; git commit -m "feat(export): ham thuan buildContentFile + golden-file test" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 2: Hạ tầng Tauri — plugin dialog + 3 lệnh đọc/ghi file

**What you'll have when this is done:** App (phía Rust) có hộp thoại chọn file/thư mục và 3 lệnh đọc/ghi file; chưa ai gọi từ giao diện nên app chạy y như cũ.

- [ ] Bước 1: Cài gói JS cho hộp thoại.
      Run: `npm install @tauri-apps/plugin-dialog @tauri-apps/api`
      You should see: cài xong, không lỗi.

- [ ] Bước 2: Mở `src-tauri/Cargo.toml`, trong `[dependencies]` thêm dòng cuối:
      ```toml
      tauri-plugin-dialog = "2"
      ```

- [ ] Bước 3: Mở `src-tauri/src/lib.rs`, thay **toàn bộ** nội dung bằng:
      ```rust
      use std::fs;

      // Liệt kê các file .tex là "file nội dung" (loại bỏ file có \documentclass như main.tex).
      #[tauri::command]
      fn list_content_templates(dir: String) -> Result<Vec<String>, String> {
          let mut out = Vec::new();
          for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
              let path = entry.map_err(|e| e.to_string())?.path();
              if path.extension().and_then(|s| s.to_str()) == Some("tex") {
                  let content = fs::read_to_string(&path).unwrap_or_default();
                  if !content.contains("\\documentclass") {
                      out.push(path.to_string_lossy().to_string());
                  }
              }
          }
          out.sort();
          Ok(out)
      }

      #[tauri::command]
      fn read_text_file(path: String) -> Result<String, String> {
          fs::read_to_string(&path).map_err(|e| e.to_string())
      }

      #[tauri::command]
      fn write_text_file(path: String, contents: String) -> Result<(), String> {
          fs::write(&path, contents).map_err(|e| e.to_string())
      }

      #[cfg_attr(mobile, tauri::mobile_entry_point)]
      pub fn run() {
          tauri::Builder::default()
              .plugin(tauri_plugin_sql::Builder::default().build())
              .plugin(tauri_plugin_dialog::init())
              .invoke_handler(tauri::generate_handler![
                  list_content_templates,
                  read_text_file,
                  write_text_file
              ])
              .setup(|app| {
                  if cfg!(debug_assertions) {
                      app.handle().plugin(
                          tauri_plugin_log::Builder::default()
                              .level(log::LevelFilter::Info)
                              .build(),
                      )?;
                  }
                  Ok(())
              })
              .run(tauri::generate_context!())
              .expect("error while running tauri application");
      }
      ```

- [ ] Bước 4: Mở `src-tauri/capabilities/default.json`, thêm `"dialog:default"` vào mảng `permissions`:
      ```json
      "permissions": [
        "core:default",
        "sql:allow-load",
        "sql:allow-execute",
        "sql:allow-select",
        "dialog:default"
      ]
      ```

- [ ] Bước 5: Kiểm Rust biên dịch (không cần mở app).
      Run: `cd src-tauri; cargo check`
      You should see: `Finished \`dev\` profile ...` (không có dòng `error`). *(Lần đầu tải + biên dịch plugin dialog nên hơi lâu — kiên nhẫn.)*
      *Nếu lỗi `unresolved import tauri_plugin_dialog`:* kiểm Bước 2 đã thêm đúng vào `[dependencies]`.
      Rồi quay lại thư mục gốc: `cd ..`

- [ ] Bước 6: Kiểm frontend + lưu.
      Run: `$env:CI="false"; npm run build` → `Compiled successfully.` 0 warning.
      Run: `git add . ; git commit -m "feat(tauri): plugin dialog + lenh doc/ghi file (list/read/write)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 3: Cài đặt — chọn "Thư mục template"

**What you'll have when this is done:** Trong Cài đặt có mục "Thư mục template": bấm chọn folder (hộp thoại), đường dẫn được nhớ lại (lưu trong máy). Đây là nơi app sẽ tìm các file template.

- [ ] Bước 1: Mở `src/components/SettingsPage.jsx`. Thêm import ở đầu file:
      ```jsx
      import React, { useState } from 'react';
      import { open } from '@tauri-apps/plugin-dialog';
      ```
      (giữ nguyên các import icon hiện có; nếu dòng `import React` đã có thì sửa thành dòng trên để có `useState`.)

- [ ] Bước 2: Trong component `SettingsPage`, ngay đầu thân hàm thêm state đọc/ghi đường dẫn:
      ```jsx
      const [templateFolder, setTemplateFolder] = useState(localStorage.getItem('pb-template-folder') || '');
      const pickFolder = async () => {
        const dir = await open({ directory: true, title: 'Chọn thư mục chứa file template (.tex)' });
        if (typeof dir === 'string') {
          localStorage.setItem('pb-template-folder', dir);
          setTemplateFolder(dir);
        }
      };
      ```

- [ ] Bước 3: Thay dòng `<Row ... title="Mặc định xuất đề" ... soon />` (mục placeholder cũ) bằng mục thật:
      ```jsx
      <Row icon={<FileDown size={20} />} title="Thư mục template xuất"
        desc={templateFolder ? templateFolder : 'Chưa chọn — nơi app tìm các file template .tex để xuất.'}
        action={<button className="card-btn card-btn-primary" onClick={pickFolder}>Chọn thư mục…</button>} />
      ```
      (Các mục placeholder khác như dark mode/cỡ chữ/API/DB giữ nguyên.)

- [ ] Bước 4: Check it works.
      Run: `$env:CI="false"; npm run build` → 0 warning.
      *(Bấm thử cần GUI — Thầy sẽ kiểm ở cuối. Tạm tin biên dịch sạch.)*

- [ ] Bước 5: Lưu tiến độ.
      Run: `git add . ; git commit -m "feat(ux): Cai dat chon thu muc template (luu localStorage)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 4: Viết lại ExportModal + dọn App (bỏ xuất tài liệu cũ)

**What you'll have when this is done:** Nút "Xuất đề" ở Giỏ mở hộp thoại mới: chọn template → form header tự hiện theo template → bật/tắt lời giải & đảo câu → Save As ra file nội dung. Kiểu xuất "tài liệu độc lập" cũ bị bỏ.

- [ ] Bước 1: Thay **toàn bộ** `src/components/Modals/ExportModal.jsx` bằng:
      ```jsx
      import React, { useState, useEffect } from 'react';
      import { X, Download, Shuffle, AlertCircle } from 'lucide-react';
      import { invoke } from '@tauri-apps/api/core';
      import { save } from '@tauri-apps/plugin-dialog';
      import { buildContentFile, parseHeaderFields } from '../../utils/buildContentFile';
      import { useToast } from '../../hooks/useToast';

      const baseName = (p) => p.split(/[\\/]/).pop();
      const lbl = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.4rem' };
      const inp = { width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: '0.9rem', background: 'var(--color-surface)', color: 'var(--color-text)' };

      const ExportModal = ({ cartItems, onClose }) => {
        const { success, error } = useToast();
        const folder = localStorage.getItem('pb-template-folder') || '';
        const [paths, setPaths] = useState([]);
        const [selected, setSelected] = useState('');
        const [templateText, setTemplateText] = useState('');
        const [fields, setFields] = useState([]);
        const [values, setValues] = useState([]);
        const [includeSolution, setIncludeSolution] = useState(true);
        const [shuffle, setShuffle] = useState(false);
        const [note, setNote] = useState('');

        useEffect(() => {
          if (!folder) { setNote('Chưa cấu hình thư mục template. Vào Cài đặt → "Thư mục template xuất" để chọn.'); return; }
          invoke('list_content_templates', { dir: folder })
            .then((list) => { setPaths(list); setNote(list.length ? '' : 'Thư mục chưa có file template (.tex) nào.'); })
            .catch((e) => setNote('Không đọc được thư mục template: ' + e));
        }, [folder]);

        const onPick = async (path) => {
          setSelected(path);
          if (!path) { setTemplateText(''); setFields([]); setValues([]); return; }
          try {
            const text = await invoke('read_text_file', { path });
            const f = parseHeaderFields(text);
            setTemplateText(text); setFields(f); setValues(f.map(() => ''));
          } catch (e) { error('Không đọc được template: ' + e); }
        };

        const doExport = async () => {
          if (!selected || !templateText) { error('Chưa chọn template'); return; }
          const content = buildContentFile(templateText, values, cartItems, { includeSolution, shuffle });
          try {
            const savePath = await save({
              defaultPath: folder ? `${folder}/NoiDung.tex` : 'NoiDung.tex',
              filters: [{ name: 'LaTeX', extensions: ['tex'] }],
            });
            if (!savePath) return;
            await invoke('write_text_file', { path: savePath, contents: content });
            success('Đã xuất file nội dung: ' + baseName(savePath));
            onClose();
          } catch (e) { error('Lỗi lưu file: ' + e); }
        };

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ background: 'var(--color-surface)', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow)' }}>
              <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text)' }}>Xuất file nội dung (.tex)</h2>
                <button onClick={onClose} className="card-btn" style={{ border: 'none' }}><X size={20} /></button>
              </div>

              <div style={{ padding: '1.3rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {note && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0.7rem 0.9rem', borderRadius: 8, background: 'var(--color-amber-bg)', color: 'var(--color-amber-text)', fontSize: '0.88rem' }}>
                    <AlertCircle size={18} /> {note}
                  </div>
                )}

                <div>
                  <label style={lbl}>Mẫu template</label>
                  <select value={selected} onChange={(e) => onPick(e.target.value)} style={inp} disabled={paths.length === 0}>
                    <option value="">-- Chọn template --</option>
                    {paths.map((p) => <option key={p} value={p}>{baseName(p)}</option>)}
                  </select>
                </div>

                {fields.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {fields.map((f, i) => (
                      <div key={i}>
                        <label style={lbl}>{f.label}</label>
                        <input type="text" value={values[i] || ''}
                          onChange={(e) => setValues((v) => { const n = [...v]; n[i] = e.target.value; return n; })}
                          style={inp} />
                      </div>
                    ))}
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Các ô điền nguyên văn vào template (có thể gõ LaTeX). Tránh ký tự % trần và ngoặc lệch.</div>
                  </div>
                )}

                <div style={{ padding: '0.9rem', background: 'var(--color-surface-muted)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--color-text)' }}>
                    <input type="checkbox" checked={includeSolution} onChange={(e) => setIncludeSolution(e.target.checked)} /> Bao gồm Lời giải (\loigiai)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--color-text)' }}>
                    <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} /> <Shuffle size={15} /> Đảo ngẫu nhiên thứ tự câu
                  </label>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Sẽ chèn <b style={{ color: 'var(--color-text)' }}>{cartItems.length}</b> bài trong giỏ vào template.
                </div>
              </div>

              <div style={{ padding: '1.1rem 1.4rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={onClose} className="card-btn">Hủy</button>
                <button onClick={doExport} className="card-btn card-btn-primary" disabled={!selected || cartItems.length === 0}>
                  <Download size={16} /> Xuất file nội dung
                </button>
              </div>
            </div>
          </div>
        );
      };

      export default ExportModal;
      ```

- [ ] Bước 2: Dọn `src/App.jsx` (bỏ xuất tài liệu cũ):
      - Xoá dòng import: `import { buildProblemTex } from './utils/buildProblemTex';`
      - Đổi dòng import React thành (bỏ `useRef` vì không còn dùng): `import React, { useEffect, useState } from 'react';`
      - Xoá **cả hàm** `handleFinalExport` (từ `const handleFinalExport = (config) => {` đến dấu `};` đóng hàm).
      - Xoá `const cartRef = useRef(cartItems);` và khối `useEffect(() => { cartRef.current = cartItems; }, [cartItems]);` (chỉ phục vụ hàm vừa xoá).

- [ ] Bước 3: Sửa chỗ render ExportModal trong `App.jsx` (bỏ prop `onExport`):
      ```jsx
      {ui.showExportModal && (
        <ExportModal
          cartItems={cartItems}
          onClose={() => ui.setShowExportModal(false)}
        />
      )}
      ```

- [ ] Bước 4: Kiểm biên dịch.
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully.` — **0 warning**.
      *Nếu cảnh báo `'useRef' is defined but never used` hoặc `'buildProblemTex' ... never used`:* còn sót import — xoá đúng dòng đó. *Nếu `handleFinalExport is not defined`:* còn chỗ tham chiếu — đảm bảo Bước 3 đã bỏ `onExport`.

- [ ] Bước 5: Lưu tiến độ.
      Run: `git add . ; git commit -m "feat(export): ExportModal xuat file noi dung (chon template + form header dong); bo xuat tai lieu cu" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 5: Nghiệm thu cuối — golden + build + Rust + xuất thật ra PDF

**What you'll have when this is done:** Chắc chắn định dạng xuất được khoá (golden), `buildProblemTex` không đổi, frontend + Rust biên dịch sạch, và một file nội dung thật `\input` vào `main.tex` ra PDF đúng.

- [ ] Bước 1: Chạy lại golden + build + Rust.
      Run: `$env:CI="true"; npm test` → 2 test PASS.
      Run: `$env:CI="false"; npm run build` → `Compiled successfully.` 0 warning.
      Run: `cd src-tauri; cargo check` → `Finished`, không `error`. Rồi `cd ..`.

- [ ] Bước 2: **`buildProblemTex` byte-identical** (đợt này không đụng).
      Run: `git diff master -- src/utils/buildProblemTex.js`
      You should see: **rỗng**.

- [ ] Bước 3: **Nghiệm thu thật (Thầy chạy `npx tauri dev`)** — *cần GUI + LaTeX*:
      1. Vào **Cài đặt** → "Thư mục template xuất" → chọn thư mục chứa `PhieuBaiTap.tex` / `DeThi.tex` (vd `D:\0. Problems Bank\template`). Xác nhận `main.tex` **không** xuất hiện trong danh sách chọn.
      2. Thêm vài bài (có công thức `$x^2+y^2=z^2$`) vào **Giỏ** → **Xuất đề**.
      3. Chọn template **DeThi** → thấy **6 ô header** (Phòng GD/Trường/Kỳ thi/Môn/Năm/Thời gian) → điền thử.
      4. Bấm **Xuất file nội dung** → Save As vào thư mục `data/` của dự án → đặt tên (vd `DeMau.tex`).
      5. Mở file vừa lưu: header đã điền đúng `{}`, các bài `\begin{bt}` nối sau dòng mốc, công thức nguyên vẹn, có/không `\loigiai` theo lựa chọn.
      6. Trong `main.tex`, `\input{data/DeMau.tex}` → biên dịch → **PDF ra đúng**.
      7. Thử template **PhieuBaiTap** → thấy **3 ô header** → xuất → `\input` ra PDF đúng.

- [ ] Bước 4: Lưu tiến độ cuối.
      Run: `git add . ; git commit -m "chore(export): nghiem thu template xuat (golden+build+cargo, buildProblemTex byte-identical)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

> **Sau khi Thầy nghiệm thu xong:** merge vào `master` —
> `git checkout master ; git merge --no-ff ux-gd3-template-xuat` — rồi viết nhật ký số 14 + cập nhật memory. (Chưa làm cho tới khi Thầy duyệt trực quan + ra PDF.)

---

## Ready to Build

Kế hoạch đã lưu tại `.docs/plans/2026-06-24-ux-gd3-template-xuat-noi-dung.md`. Việc cần làm:

1. Đọc lướt cả kế hoạch một lượt trước khi bắt đầu.
2. Làm theo thứ tự task — đừng nhảy cóc (mỗi task xong app vẫn chạy được).
3. Hoàn thành bước "Check it works" trước khi sang task kế.
4. Nếu có gì không như mong đợi, **dừng lại và mô tả đúng những gì thấy** — đừng thử sửa lung tung.

Nói **"bắt đầu build"** (hoặc "làm Task 1") khi Thầy sẵn sàng.
