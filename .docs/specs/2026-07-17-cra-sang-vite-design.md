# Thiết kế: Đổi công cụ dựng CRA → Vite (+ Vitest)

## 1. Thông tin chung
- **Ngày**: 17/07/2026
- **Trạng thái**: Đã brainstorm & chốt 1 câu hỏi (công cụ test = **Vitest**). Chờ Thầy duyệt spec để chuyển sang Plan.
- **Đợt**: C — mục #2 (**Đổi công cụ build CRA → Vite**). Mục #1 (Ghi trọn gói/transaction) đã đóng hoàn toàn (NK35).
- **Phạm vi**: Thay **công cụ dựng phần giao diện** (react-scripts/CRA → Vite) và **công cụ chạy test** (react-scripts test/Jest → Vitest). **KHÔNG** đụng nghiệp vụ lõi (taxonomy, xuất `.tex`, schema DB, Rust/Tauri).
- **Bối cảnh**: `react-scripts` (CRA) đã cũ/ngừng phát triển; Vite là mặc định của Tauri — dev/HMR nhanh hơn, bản dựng nhẹ và khởi động nhanh hơn.

## 2. Mục tiêu
Chuyển "động cơ" dựng app từ CRA sang Vite **mà Thầy không thấy bất kỳ khác biệt nào** khi dùng: giao diện, thao tác, và **file `.tex` xuất ra giữ y hệt**. Lợi ích nằm ở khâu phát triển và đóng gói: mở/nạp lại nhanh hơn, bản dựng gọn hơn, rời khỏi công cụ đã lỗi thời.

**"Done" trông như thế nào:**
1. `npm run dev` mở app bằng Vite; `npx tauri dev` chạy đúng như trước.
2. `npm run build` (Vite) tạo thư mục `build/` nạp được vào Tauri.
3. `npm test` (Vitest) → **104 test XANH**; bài kiểm vàng `buildContentFile.test.js` chứng minh `.tex` **không đổi một byte**.
4. `npx tauri build` ra `.msi`/`.exe` chạy được (nghiệm thu GUI OK).

## 3. Quyết định đã chốt (brainstorm)
1. **Làm mục này** (CRA → Vite) — Thầy chọn ở roadmap Đợt C.
2. **Công cụ test = Vitest** — cùng một bộ công cụ với Vite, 12/14 tệp test giữ nguyên, chỉ 2 tệp chỉnh nhẹ. (Bỏ phương án giữ Jest riêng — tránh bảo trì 2 công cụ.)

## 4. Soi hiện trạng (bản kiểm kê đầy đủ — vì sao ca này "sạch")
- **Build**: `react-scripts 5.0.1`. Tauri gọi `beforeDevCommand: npm start`, `beforeBuildCommand: npm run build`; `devUrl: http://localhost:3000`; `frontendDist: ../build`.
- **HTML vào**: `public/index.html` (993 B) — **KHÔNG** có `%PUBLIC_URL%`, có sẵn `<style>` inline + `<div id="root">`. `public/` chỉ chứa mỗi tệp này (không favicon/manifest/robots/logo).
- **JS vào**: `src/index.js` dùng `createRoot` + JSX (`<React.StrictMode><App/></...>`).
- **JSX lẫn trong đuôi `.js`**: chỉ **2 tệp** — `src/index.js` và `src/hooks/useTaxonomy.js` (Provider trả JSX). Mọi tệp còn lại có JSX đều đã là `.jsx`.
- **Biến môi trường**: **1 chỗ** — `SmartImportModal.jsx:24` đọc `process.env.REACT_APP_GEMINI_API_KEY` (khoá Gemini *dự phòng*; đường chính là `localStorage 'pb-gemini-key'`). Tệp `.env` (đã gitignore, **không** nằm trong git) đặt `REACT_APP_GEMINI_API_KEY` + `BROWSER`.
- **Import**: **0** import tuyệt đối (không `from 'components/...'`) → không cần cấu hình alias.
- **Không dính CRA sâu**: không `ReactComponent` (SVG-as-component), không `reportWebVitals`, không `serviceWorker`, không `src/setupTests.js`, không `jsconfig/tsconfig`.
- **Test**: 14 tệp `*.test.js` (= "14 suites / 104 test"). **12/14 là test thuần** (`describe/it/expect`, chạy y nguyên trên Vitest). Chỉ **2 tệp có giả lập** cần chỉnh: `db.test.js` (mock `@tauri-apps/api`) và `problemWrites.test.js`.
- **Khác**: `eslintConfig: extends react-app` và `browserslist` là đồ CRA; `react-scripts build` có **chặn build khi ESLint lỗi**.

## 5. Thiết kế chi tiết (các thay đổi chính xác)

**A. Gói phụ thuộc (`package.json`)**
- **Bỏ**: `react-scripts`.
- **Thêm (devDependencies)**: `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`.
- **Scripts** → `dev: vite` · `build: vite build` · `test: vitest run` · `test:watch: vitest` · `preview: vite preview`. Bỏ `eject`.
- **Dọn**: bỏ khối `eslintConfig` (react-app) và `browserslist` (đồ CRA, nay không dùng).

**B. `vite.config.js` (tạo mới, ở gốc dự án)**
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,          // khớp devUrl trong tauri.conf.json
    strictPort: true,
    open: false,         // Tauri tự mở webview, không mở trình duyệt
    watch: { ignored: ['**/src-tauri/**'] },
  },
  clearScreen: false,
  build: {
    outDir: 'build',     // giữ frontendDist "../build" trong tauri.conf.json
    emptyOutDir: true,
  },
  test: {                // Vitest
    globals: true,       // describe/it/expect không cần import
    environment: 'jsdom',
  },
});
```

**C. HTML vào**
- Chuyển `public/index.html` → **`index.html` ở gốc dự án**; thêm ngay trước `</body>`:
  `<script type="module" src="/src/index.jsx"></script>`
- Giữ nguyên `<style>` inline, `<div id="root">`, thẻ meta. Xoá thư mục `public/` (rỗng sau khi chuyển).

**D. Đổi đuôi 2 tệp có JSX (`git mv` để giữ lịch sử)**
- `src/index.js` → `src/index.jsx`
- `src/hooks/useTaxonomy.js` → `src/hooks/useTaxonomy.jsx`
- Các chỗ `import ... from '.../useTaxonomy'` **không ghi đuôi** nên vẫn chạy. Sau khi đổi, **không còn JSX trong tệp `.js` nào** → Vite/plugin-react dùng mặc định là đủ, không cần cấu hình loader.
- *Lưới an toàn*: nếu `vite build` báo lỗi JSX ở một `.js` khác (sót), đổi nốt đuôi tệp đó.

**E. Biến môi trường**
- `.env` (tệp máy Thầy): đổi tên `REACT_APP_GEMINI_API_KEY` → `VITE_GEMINI_API_KEY`; **bỏ** dòng `BROWSER` (Vite không tự mở trình duyệt).
- `SmartImportModal.jsx:24`: `process.env.REACT_APP_GEMINI_API_KEY` → `import.meta.env.VITE_GEMINI_API_KEY`.
- (Giá trị khoá không in ra đâu; chỉ đổi tên biến.)

**F. `tauri.conf.json`**
- `beforeDevCommand: "npm start"` → `"npm run dev"`.
- `beforeBuildCommand: "npm run build"` (giữ — nay là `vite build`).
- `devUrl: "http://localhost:3000"` (giữ — cổng khớp).
- `frontendDist: "../build"` (giữ — Vite `outDir: build`).

**G. Test → Vitest**
- 12/14 tệp: **không sửa** (test thuần).
- `db.test.js` + `problemWrites.test.js`: đổi `jest.mock`→`vi.mock`, `jest.fn`→`vi.fn`, `jest.spyOn`→`vi.spyOn`… (API gần như 1-1). `import.meta.env` do Vitest hỗ trợ sẵn.
- Chạy lại **bài kiểm vàng** `buildContentFile.test.js` để chốt `.tex` không đổi.

## 6. Những gì KHÔNG thay đổi (bất khả xâm phạm)
- **Xuất `.tex`**: logic `buildContentFile`/`buildProblemTex`… giữ 100%; golden test canh byte-identical.
- **Giao diện & thao tác**: người dùng thấy y hệt (chỉ đổi công cụ dựng).
- **Schema DB, dữ liệu, Rust/Tauri (kể cả `execute_tx` vừa thêm)**: không đụng.
- **Nghiệp vụ**: taxonomy, lọc, ma trận, nhập AI, backup… nguyên vẹn.

## 7. Rủi ro & cách kiểm chứng
- **Rủi ro thấp**: bề mặt di trú nhỏ, không dính CRA sâu, không alias, chỉ 2 tệp JSX + 2 tệp test.
- **Kiểm tự động**: `npm run build` (Vite ra `build/`); `npm test` (Vitest) 104 XANH; golden `.tex` không đổi.
- **Kiểm thật (Thầy)**: `npx tauri dev` chạy đúng; rồi `npx tauri build` ra `.msi` chạy được — **cần Thầy nghiệm thu GUI** (Claude không gắn được webview Tauri, như đợt transaction).
- **An toàn quy trình**: làm trên **nhánh riêng** `feat/cra-sang-vite`; giữ CRA đến khi Vite chạy xanh; gộp `master` (`--no-ff`) sau khi nghiệm thu.

## 8. Nghiệm thu & đóng gói
- Sau khi xanh + nghiệm thu GUI: gộp `master`, **bump 1.2.1 → 1.2.2** (thay đổi nội bộ, không thêm tính năng người dùng), `npx tauri build` ra bản cài mới.
- (Ghi chú: bản cài v1.2.1 hiện tại đã có đủ tính năng; đóng gói lại chủ yếu để **chứng minh đường build sản phẩm bằng Vite chạy được** và đưa toolchain mới vào bản shipped.)

## 9. Ghi chú kỹ thuật (cho bước Plan)
- **ESLint lúc build**: CRA chặn build khi ESLint lỗi; Vite **không** lint khi build. Chấp nhận (test là lưới an toàn chính). Nếu muốn có thể thêm `vite-plugin-eslint` sau — **KHÔNG** làm trong đợt này (giữ đơn giản).
- **Cổng dev**: giữ 3000 (khớp `devUrl`) thay vì đổi sang 1420 mặc định Tauri — bớt thay đổi.
- **`outDir: build`**: giữ để `tauri.conf.json frontendDist "../build"` không phải đổi.
- **Node**: Vite cần Node 18+; kiểm phiên bản Node ở bước Plan (react-scripts 5 + Tauri 2 vốn đã đòi Node mới, nhiều khả năng đạt).
- **CSS/phông**: import CSS từ `node_modules` (`@fontsource/*`, `katex/dist/*.css`) — Vite xử lý sẵn, không phải đổi.
- **Không đổi**: spec dở `2026-07-13-cai-thien-ux-ui-premium-design.md` (Thầy soạn) — không đụng.

---
*Thầy xem qua thiết kế này. Nếu ưng, tôi chốt spec và chuyển sang viết **Plan** (chia task nhỏ) rồi mới bắt tay code trên nhánh riêng.*
