# Đổi công cụ dựng CRA → Vite (+ Vitest) — Build Plan

**What we're building:** Thay "động cơ" dựng phần giao diện từ `react-scripts` (CRA) sang **Vite**, và chuyển bộ chạy test sang **Vitest** — app chạy y hệt như cũ.

**Why:** Lúc code mở/nạp lại nhanh hơn (HMR), bản dựng nhẹ hơn, app khởi động nhanh hơn, và rời khỏi công cụ đã ngừng phát triển.

**Approach:** Làm trên nhánh riêng `feat/cra-sang-vite`. Bỏ `react-scripts`, thêm `vite` + `@vitejs/plugin-react` + `vitest` + `jsdom`. Chuyển `index.html` ra gốc, đổi đuôi 2 tệp có JSX sang `.jsx`, đổi 1 biến môi trường, chỉnh 1 dòng cấu hình Tauri, chuyển 2 tệp test sang Vitest. Giữ CRA cho tới khi Vite chạy **xanh** rồi mới gộp `master` và đóng gói lại `.msi`.

**Files we'll create or change:**
- `package.json` — bỏ react-scripts, thêm vite/vitest, đổi scripts, dọn eslintConfig+browserslist
- `vite.config.js` — **(mới)** cấu hình Vite + Vitest
- `index.html` — **(chuyển từ `public/index.html` ra gốc)** thêm thẻ `<script type="module">`
- `src/index.js` → `src/index.jsx` — **(đổi đuôi)** tệp khởi động (có JSX)
- `src/hooks/useTaxonomy.js` → `src/hooks/useTaxonomy.jsx` — **(đổi đuôi)** Provider (có JSX)
- `.env` — **(tệp máy Thầy, không commit)** đổi `REACT_APP_… → VITE_…`, bỏ `BROWSER`
- `src/components/Modals/SmartImportModal.jsx` — `process.env.REACT_APP_…` → `import.meta.env.VITE_…`
- `src-tauri/tauri.conf.json` — `beforeDevCommand: "npm start"` → `"npm run dev"`
- `src/utils/db.test.js`, `src/utils/problemWrites.test.js` — đổi `jest.*` → `vi.*`

> **Ai làm gì:** Task 1–5 và 7 là **Claude tự chạy** (lệnh dòng lệnh). **Task 6 là Thầy nghiệm thu GUI** trong `npx tauri dev` (Claude không gắn được cửa sổ Tauri từ công cụ, như đợt transaction).

---

### Task 1: Nhánh mới + chốt mốc "trước khi đổi"

**What you'll have when this is done:** Một nhánh riêng để làm, và bằng chứng bản CRA hiện tại đang **xanh** (104 test + build được) để so sánh về sau.

- [ ] Step 1: Tạo & sang nhánh mới
      Run: `git checkout -b feat/cra-sang-vite`
      You should see: `Switched to a new branch 'feat/cra-sang-vite'`

- [ ] Step 2: Kiểm phiên bản Node (Vite cần ≥ 18)
      Run: `node --version`
      You should see: `v18.x` trở lên (ví dụ `v20.x`). Nếu thấp hơn 18 → dừng, báo lại.

- [ ] Step 3: Chạy test bản CRA làm mốc
      Run: `npm test -- --watchAll=false`
      You should see: dòng `Tests: 104 passed, 104 total` (14 suites). Đây là con số phải giữ nguyên sau khi đổi.

- [ ] Step 4: Dựng thử bản CRA làm mốc (rồi mới đổi)
      Run: `npm run build`
      You should see: `Compiled successfully` và thư mục `build/` được tạo.
      *(Chưa đổi code nên chưa commit ở task này.)*

---

### Task 2: Thay gói phụ thuộc & scripts (bỏ CRA, thêm Vite/Vitest)

**What you'll have when this is done:** `package.json` đã trỏ sang Vite + Vitest; `react-scripts` đã gỡ.

- [ ] Step 1: Cài Vite + Vitest (làm công cụ phát triển)
      Run: `npm install -D vite @vitejs/plugin-react vitest jsdom`
      You should see: `added N packages` không kèm lỗi đỏ.

- [ ] Step 2: Gỡ react-scripts
      Run: `npm uninstall react-scripts`
      You should see: `removed N packages`.

- [ ] Step 3: Sửa `package.json` — khối `scripts` thành:
      ```json
      "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview",
        "test": "vitest run",
        "test:watch": "vitest"
      },
      ```
      và **xoá** hai khối `"eslintConfig"` và `"browserslist"` (đồ CRA, nay không dùng).

- [ ] Step 4: Kiểm Vite đã cài
      Run: `npx vite --version`
      You should see: một số phiên bản, ví dụ `vite/5.x` hoặc `vite/6.x`.
      *(Lúc này `npm test`/`npm run build` chưa chạy được vì thiếu `vite.config.js` + `index.html` — Task 3 sẽ bổ sung.)*

- [ ] Step 5: Lưu tiến độ
      Run: `git add -A && git commit -m "build(vite): thay react-scripts bang vite + vitest (package.json)"`

---

### Task 3: `vite.config.js` + `index.html` ra gốc + đổi đuôi 2 tệp JSX  ⭐ (mốc "Vite dựng được")

**What you'll have when this is done:** `npm run build` chạy bằng **Vite** và tạo ra thư mục `build/` không lỗi — chứng minh đường dựng mới hoạt động.

- [ ] Step 1: Tạo tệp `vite.config.js` ở **gốc dự án** với nội dung:
      ```js
      import { defineConfig } from 'vite';
      import react from '@vitejs/plugin-react';

      export default defineConfig({
        plugins: [react()],
        server: {
          port: 3000,            // khớp devUrl trong tauri.conf.json
          strictPort: true,
          open: false,           // Tauri tự mở cửa sổ, không mở trình duyệt
          watch: { ignored: ['**/src-tauri/**'] },
        },
        clearScreen: false,
        build: {
          outDir: 'build',       // giữ frontendDist "../build" trong tauri.conf.json
          emptyOutDir: true,
        },
        test: {                  // Vitest
          globals: true,         // dùng describe/it/expect/vi không cần import
          environment: 'jsdom',
        },
      });
      ```

- [ ] Step 2: Đổi đuôi 2 tệp có JSX (dùng `git mv` để giữ lịch sử)
      Run:
      ```bash
      git mv src/index.js src/index.jsx
      git mv src/hooks/useTaxonomy.js src/hooks/useTaxonomy.jsx
      ```
      *(Các chỗ `import ... from '.../useTaxonomy'` không ghi đuôi nên vẫn chạy.)*

- [ ] Step 3: Chuyển `public/index.html` ra gốc và thêm thẻ nạp app
      Run: `git mv public/index.html index.html`
      Rồi trong `index.html`, thêm ngay **trước** `</body>`:
      `<script type="module" src="/src/index.jsx"></script>`
      Rồi xoá thư mục `public/` đã rỗng: `rmdir public` (hoặc `rm -rf public`).

- [ ] Step 4: **Kiểm mốc — dựng bằng Vite**
      Run: `npm run build`
      You should see: Vite in `✓ built in ...`, và có `build/index.html` + `build/assets/…`.
      *Nếu báo lỗi JSX ở một tệp `.js` khác (sót):* đổi nốt đuôi tệp đó sang `.jsx` bằng `git mv` rồi chạy lại. *Nếu lỗi khác:* dừng, chép nguyên thông báo lỗi ra để xem — đừng sửa mò.

- [ ] Step 5: Lưu tiến độ
      Run: `git add -A && git commit -m "build(vite): vite.config + index.html ra goc + doi duoi 2 tep JSX"`

---

### Task 4: Biến môi trường + cấu hình Tauri

**What you'll have when this is done:** Nút *Nhập bằng AI* vẫn đọc được khoá Gemini dự phòng (tên biến kiểu Vite), và Tauri gọi đúng lệnh dev mới.

- [ ] Step 1: Đổi tên biến trong `.env` (tệp máy Thầy — **không** commit, đang gitignore). Dùng lệnh sau (không in giá trị khoá ra):
      Run: `sed -i 's/^REACT_APP_GEMINI_API_KEY=/VITE_GEMINI_API_KEY=/; /^BROWSER=/d' .env`
      *(Đổi tiền tố tên biến `REACT_APP_… → VITE_…` và bỏ dòng `BROWSER`.)*

- [ ] Step 2: Sửa `src/components/Modals/SmartImportModal.jsx` (khoảng dòng 24):
      Đổi `process.env.REACT_APP_GEMINI_API_KEY` → `import.meta.env.VITE_GEMINI_API_KEY`
      (giữ nguyên phần `localStorage.getItem('pb-gemini-key') || … || ''` xung quanh).

- [ ] Step 3: Sửa `src-tauri/tauri.conf.json` — trong khối `build`:
      Đổi `"beforeDevCommand": "npm start"` → `"beforeDevCommand": "npm run dev"`.
      (`beforeBuildCommand`, `devUrl`, `frontendDist` **giữ nguyên**.)

- [ ] Step 4: Kiểm không còn `process.env.REACT_APP` và build vẫn OK
      Run: `grep -rn "REACT_APP" src/ && echo "--- con sot ---" || echo "sach"`
      You should see: `sach` (không còn chỗ nào).
      Rồi: `npm run build` → vẫn `✓ built`.

- [ ] Step 5: Lưu tiến độ *(chỉ 2 tệp trong git; `.env` không vào git)*
      Run: `git add -A && git commit -m "build(vite): env VITE_GEMINI_API_KEY + tauri beforeDevCommand"`

---

### Task 5: Chuyển test sang Vitest + canh xuất `.tex` (LaTeX safety)

**What you'll have when this is done:** `npm test` chạy bằng **Vitest**, **104 test XANH**, và bài kiểm vàng chứng minh `.tex` **không đổi một byte**.

- [ ] Step 1: Sửa `src/utils/db.test.js` — đổi các lời gọi giả lập:
      `jest.mock(` → `vi.mock(`, `jest.fn(` → `vi.fn(`, `jest.spyOn(` → `vi.spyOn(`,
      `jest.clearAllMocks(` → `vi.clearAllMocks(` (nếu có). Không cần `import` gì thêm (đã bật `globals: true`).

- [ ] Step 2: Sửa `src/utils/problemWrites.test.js` — đổi `jest.*` → `vi.*` y như trên.

- [ ] Step 3: Chạy toàn bộ test bằng Vitest
      Run: `npm test`
      You should see: `Test Files  14 passed (14)` và `Tests  104 passed (104)`.
      *Nếu 1–2 test đỏ:* dừng, chép nguyên phần đỏ ra để xem — thường là còn sót `jest.` chưa đổi.

- [ ] Step 4: **LaTeX safety — canh bài kiểm vàng**
      Trong kết quả Vitest ở Step 3, xác nhận `src/utils/buildContentFile.test.js` nằm trong nhóm **passed**.
      *Ý nghĩa:* bài kiểm này so đúng từng ký tự chuỗi `.tex` sinh ra → còn xanh nghĩa là **xuất `.tex` giống hệt trước khi đổi**.

- [ ] Step 5: Lưu tiến độ
      Run: `git add -A && git commit -m "test(vitest): chuyen db + problemWrites sang vi.*, 104 xanh"`

---

### Task 6: Thầy nghiệm thu GUI (chạy thật trong `tauri dev`)

**What you'll have when this is done:** Xác nhận app **trông & chạy y hệt** bằng động cơ Vite, và **xuất `.tex` đúng** trên bài thật.

- [ ] Step 1: Mở app ở chế độ phát triển
      Run: `npx tauri dev`
      You should see: cửa sổ *"Ngân hàng câu hỏi"* mở ra, giao diện **giống hệt** như trước. (Lần đầu Vite khởi động rất nhanh.)

- [ ] Step 2: Thử vài thao tác quen thuộc
      Thêm/sửa một bài, lọc theo hệ/lớp, bật/tắt Dark Mode. Mọi thứ phải hoạt động như cũ.

- [ ] Step 3: **LaTeX safety (thủ công)** — xuất thử một bài có công thức
      Chọn (hoặc thêm) một bài có công thức, ví dụ `$x^2 + y^2 = z^2$`; xuất ra `.tex`; mở tệp `.tex` và xác nhận công thức hiện **đúng** như mọi khi.

- [ ] Step 4: (Nếu Thầy dùng) thử nút *Nhập bằng AI*
      Xác nhận vẫn nạp được (khoá Gemini đọc từ Cài đặt hoặc biến `VITE_…`).
      *Khi hài lòng, Thầy nói "OK" để sang Task 7 gộp & đóng gói. Nếu có gì lạ, mô tả lại — đừng sửa mò.*

---

### Task 7: Gộp `master` + đóng gói bản cài v1.2.2

**What you'll have when this is done:** Tính năng nằm trên `master`, và có bản cài `.msi`/`.exe` mới dựng bằng Vite.

- [ ] Step 1: Gộp nhánh vào `master` (giữ mốc lịch sử)
      Run: `git checkout master && git merge --no-ff feat/cra-sang-vite -m "Merge: CRA -> Vite (+Vitest) - Dot C #2"`

- [ ] Step 2: Nâng phiên bản 1.2.1 → 1.2.2 (thay đổi nội bộ, không thêm tính năng người dùng)
      Sửa `"version"` trong **`package.json`** và **`src-tauri/tauri.conf.json`** thành `1.2.2`.
      Run: `git add -A && git commit -m "chore: bump 1.2.1 -> 1.2.2 (CRA -> Vite)"`

- [ ] Step 3: Đóng gói bản cài mới (dựng sản phẩm bằng Vite)
      Run: `npx tauri build`
      You should see: dựng xong không lỗi; có `Problems Bank_1.2.2_x64_en-US.msi` và `..._x64-setup.exe` trong `src-tauri/target/release/bundle/`.

- [ ] Step 4: Xác nhận bản cài
      Kiểm 2 tệp trên tồn tại. *(Tuỳ chọn: cài thử bản `.msi` và mở app xem chạy đúng.)*

- [ ] Step 5: Cập nhật tài liệu (đúng nếp dự án)
      Cập nhật `.docs/ROADMAP.md` (đánh dấu Đợt C #2 **XONG**) và viết nhật ký `.docs/36_2026_07_17.md`.
      Run: `git add -A && git commit -m "docs: NK36 + roadmap - CRA -> Vite XONG"`
      *(Tuỳ chọn: `git push origin master`.)*

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Đọc hết plan một lượt trước khi bắt đầu.
2. Làm lần lượt từng task — không nhảy cóc.
3. Làm xong bước "Kiểm" của mỗi task rồi mới sang task sau.
4. Nếu có gì không như mong đợi, **dừng lại và mô tả đúng cái mình thấy** — đừng thử sửa lung tung.

Nói **"bắt đầu build"** khi Thầy sẵn sàng để tôi chạy Task 1.
