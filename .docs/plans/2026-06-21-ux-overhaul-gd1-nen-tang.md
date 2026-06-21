# UX Overhaul — Giai đoạn 1 (Nền tảng) — Build Plan

**What we're building:** Phần "nền" của giao diện — nạp đúng font, dựng bộ "tokens" màu/khoảng cách, render công thức ngay trong danh sách, sửa khung Xem trước hiện đúng phân loại, trả lại viền focus, thêm trạng thái rỗng, và dọn code chết — **mà không đổi bố cục**.

**Why:** Làm app *hiện tại* dễ đọc – nhất quán – chắc chắn, đồng thời tạo phần nền mà GĐ2 (danh sách kiểu thẻ) và GĐ3 sẽ dùng lại.

**Approach:** Đi từ nền ra ngoài: font → tokens → focus → tách bộ render LaTeX dùng chung → render trong danh sách → sửa Xem trước → trạng thái rỗng → dọn dẹp → kiểm thử hồi quy. Mọi thứ chỉ chạm **lớp giao diện**; **không** đụng schema, nghiệp vụ, hay logic xuất `.tex`. Một vài chỗ chạm vào bảng/Xem trước hiện tại (GĐ2 sẽ thay) nhưng phần lõi (bộ render, tokens, font, logic đọc phân loại) thì **dùng lại lâu dài**.

**Files we'll create or change:**
- `package.json` — thêm 2 gói font (`@fontsource/inter`, `@fontsource/jetbrains-mono`)
- `src/index.js` — import font
- `src/index.css` — đặt font Inter, **bộ tokens** (biến CSS), nền trắng-ấm, viền focus, keyframe `fadeIn`
- `public/index.html` — đổi font hệ thống → Inter, đổi `theme-color`
- `src/App.jsx` — nền dùng token
- `src/components/LatexBlockRenderer.jsx` — **(mới)** tách bộ render LaTeX ra để dùng chung
- `src/components/PreviewPanel.jsx` — dùng bộ render chung + sửa dòng thông tin legacy
- `src/components/DataGrid.jsx` — render LaTeX trong danh sách + trạng thái rỗng + tương phản
- `src/components/ControlsRow.jsx` — bỏ `outline:none` để focus hiện lại
- `src/components/CartPanel.jsx` — tương phản chữ phụ
- `src/components/Header.jsx` — gọn lại, dùng token, bỏ emoji icon
- `src/App.css` — **xoá** (code chết)

> Ghi chú cấu trúc: dự án là React + Tauri (`src/components`, `src/hooks`, `public/`), không phải cấu trúc Python trong mẫu skill — kế hoạch này theo đúng cây thật của app.

> Cách chạy & kiểm tra (dùng suốt kế hoạch):
> - **Xem trực quan**: `npx tauri dev` (BẮT BUỘC dùng cái này, không phải `npm start`, vì app cần DB qua plugin SQL).
> - **Kiểm tra biên dịch**: trong PowerShell chạy `$env:CI="false"; npm run build` → mong đợi `Compiled successfully`.
> - **Sao lưu DB không cần** ở GĐ1 (không đổi cấu trúc dữ liệu). DB ở `%APPDATA%\com.tauri.dev\problem_bank.db`.

---

### Task 1: Nạp font thật (Inter + JetBrains Mono), chạy offline

**What you'll have when this is done:** App hiển thị bằng font Inter (chữ đều, dễ đọc) thay vì font hệ thống Segoe UI; font được đóng gói sẵn nên không cần mạng.

- [ ] Bước 1: Cài 2 gói font
      Run: `npm install @fontsource/inter @fontsource/jetbrains-mono`
      You should see: dòng `added ... packages` và không có lỗi đỏ.

- [ ] Bước 2: Import font ở đầu `src/index.js` (ngay dưới các import có sẵn)
      ```js
      import '@fontsource/inter/400.css';
      import '@fontsource/inter/500.css';
      import '@fontsource/inter/600.css';
      import '@fontsource/jetbrains-mono/400.css';
      import '@fontsource/jetbrains-mono/500.css';
      ```

- [ ] Bước 3: Đổi font trong `src/index.css` — thay khối `body { font-family: ... }` thành:
      ```css
      body {
        margin: 0;
        font-family: 'Inter', system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      code, pre { font-family: 'JetBrains Mono', monospace; }
      ```

- [ ] Bước 4: Trong `public/index.html`, đổi font hệ thống trong `<style>` (khối `body { font-family: ... }`) thành `font-family: 'Inter', system-ui, sans-serif;`, và đổi `<meta name="theme-color" content="#667eea" />` thành `content="#3B82F6"`.

- [ ] Bước 5: Check it works
      Run: `npx tauri dev`
      You should see: toàn bộ chữ đổi sang Inter (nét mảnh, đều hơn Segoe UI). Ô nhập LaTeX (mở "Thêm bài tập") dùng JetBrains Mono.
      Nếu sai (vẫn font cũ): kiểm tra lại Bước 2 đã lưu chưa, và tắt/mở lại `npx tauri dev`.

- [ ] Bước 6: Save your progress
      Run: `git add . && git commit -m "feat(ux): nap font Inter + JetBrains Mono (offline)"`

---

### Task 2: Dựng bộ "tokens" (biến CSS) + nền trắng-ấm

**What you'll have when this is done:** Một nơi duy nhất khai báo màu/khoảng cách/bo góc; nền app chuyển sang trắng-ấm `#FAFAF9`.

> "Token" = một biến đặt tên theo nghĩa (vd `--color-accent`) để mọi nơi gọi dùng, thay vì gõ mã màu rải rác.

- [ ] Bước 1: Thêm khối này vào **đầu** `src/index.css`:
      ```css
      :root {
        --color-bg: #FAFAF9;
        --color-surface: #FFFFFF;
        --color-border: #E2E8F0;
        --color-text: #1E293B;
        --color-text-muted: #64748B;
        --color-accent: #3B82F6;
        --color-accent-hover: #2563EB;
        --color-tag-bg: #EFF6FF;
        --color-tag-text: #1D4ED8;
        --color-danger: #EF4444;
        --color-success: #22C55E;
        --radius-md: 8px;
        --radius-pill: 999px;
        --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px;
      }
      ```

- [ ] Bước 2: Dưới khối `body` trong `src/index.css`, thêm:
      ```css
      body { background: var(--color-bg); color: var(--color-text); }
      ```

- [ ] Bước 3: Trong `src/App.jsx`, ở thẻ `div` ngoài cùng (dòng ~136), đổi `backgroundColor: '#f1f5f9'` thành `backgroundColor: 'var(--color-bg)'`.

- [ ] Bước 4: Check it works
      Run: `npx tauri dev`
      You should see: nền tổng chuyển từ xám xanh sang trắng-ấm dịu hơn. Mọi thứ khác giữ nguyên.

- [ ] Bước 5: Save your progress
      Run: `git add . && git commit -m "feat(ux): dung bo tokens CSS + nen trang-am"`

---

### Task 3: Trả lại viền focus bàn phím

**What you'll have when this is done:** Khi bấm phím Tab, ô/nút đang được chọn có viền xanh rõ ràng (hiện tại bị tắt hết).

- [ ] Bước 1: Thêm vào cuối `src/index.css`:
      ```css
      *:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; border-radius: 2px; }
      button { cursor: pointer; }
      ```

- [ ] Bước 2: Trong `src/components/ControlsRow.jsx`, xoá mọi `outline: 'none',` trong các style (1 ô tìm kiếm + 4 ô select). Bỏ chữ `outline: 'none',` đi là đủ.
      > Vì sao: `outline:'none'` viết thẳng trên thẻ sẽ đè luật focus toàn cục — phải gỡ nó thì viền focus mới hiện.

- [ ] Bước 3: Check it works
      Run: `npx tauri dev`, rồi bấm phím **Tab** vài lần.
      You should see: viền xanh nhạt quanh ô tìm kiếm và các ô lọc khi chúng được focus.

- [ ] Bước 4: Save your progress
      Run: `git add . && git commit -m "feat(ux): khoi phuc vien focus ban phim"`

---

### Task 4: Tách bộ render LaTeX ra file dùng chung

**What you'll have when this is done:** Bộ render công thức (đang nằm trong `PreviewPanel`) thành một file riêng để **cả danh sách lẫn Xem trước** cùng dùng. Xem trước vẫn render y như cũ.

- [ ] Bước 1: Tạo file mới `src/components/LatexBlockRenderer.jsx`. Cắt nguyên hàm `LatexBlockRenderer` (đầu file `PreviewPanel.jsx`, từ `const LatexBlockRenderer = ...` đến hết phần `return <>{elements}</>; };`) sang file mới. Ở đầu file mới thêm:
      ```js
      import React from 'react';
      import MathText from './MathText';
      ```
      và cuối file: `export default LatexBlockRenderer;`

- [ ] Bước 2: Trong `src/components/PreviewPanel.jsx`, xoá phần định nghĩa `LatexBlockRenderer` vừa cắt, và thêm import ở đầu:
      ```js
      import LatexBlockRenderer from './LatexBlockRenderer';
      ```

- [ ] Bước 3: Check it works
      Run: `$env:CI="false"; npm run build`  → `Compiled successfully`.
      Rồi `npx tauri dev`, bấm vào một bài để mở Xem trước.
      You should see: đề và lời giải render **y hệt như trước** (không đổi gì về hiển thị).
      Nếu lỗi `LatexBlockRenderer is not defined`: kiểm tra đã thêm dòng import ở Bước 2.

- [ ] Bước 4: Save your progress
      Run: `git add . && git commit -m "refactor(ux): tach LatexBlockRenderer dung chung"`

---

### Task 5: Render công thức ngay trong danh sách

**What you'll have when this is done:** Cột "Trích dẫn đề bài" hiện công thức đã render (đẹp) thay vì chuỗi LaTeX thô — đọc lướt dễ hơn hẳn.

- [ ] Bước 1: Trong `src/components/DataGrid.jsx`, thêm import ở đầu:
      ```js
      import LatexBlockRenderer from './LatexBlockRenderer';
      ```

- [ ] Bước 2: Tìm ô đề bài (dòng ~102) đang là:
      ```jsx
      <div style={{ fontWeight: 500, color: '#334155', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
        {problem.statement}
      </div>
      ```
      Đổi phần bên trong thành:
      ```jsx
      <div style={{ color: 'var(--color-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
        <LatexBlockRenderer text={problem.statement} />
      </div>
      ```

- [ ] Bước 3: Check it works
      Run: `npx tauri dev`
      You should see: trong bảng, các công thức (phân số, căn, mũ…) hiện đã render thay vì `\frac{...}`. Vẫn kẹp gọn 2 dòng.
      Nếu một bài quá dài tràn dòng: không sao, GĐ2 sẽ chuyển sang thẻ; ở đây chỉ cần render đúng.

- [ ] Bước 4: Save your progress
      Run: `git add . && git commit -m "feat(ux): render LaTeX ngay trong danh sach"`

---

### Task 6: Sửa Xem trước hiện đúng phân loại mới

**What you'll have when this is done:** Dòng thông tin trong Xem trước hiện đúng **chuyên đề · độ khó · lớp** của bài, thay vì luôn hiện sai "Chưa phân loại • Mức 1".

- [ ] Bước 1: Trong `src/components/PreviewPanel.jsx`, thêm import:
      ```js
      import { useTaxonomy } from '../hooks/useTaxonomy';
      ```

- [ ] Bước 2: Ngay đầu thân hàm `PreviewPanel` (sau `if (!problem) return null;`), thêm:
      ```js
      const { categories, difficulties, grades } = useTaxonomy();
      const catById = Object.fromEntries(categories.map(c => [c.id, c]));
      const diffById = Object.fromEntries(difficulties.map(d => [d.id, d]));
      const gradeById = Object.fromEntries(grades.map(g => [g.id, g]));
      const catNames = (problem.categoryIds || []).map(id => catById[id]?.name).filter(Boolean);
      const diffNames = Object.values(problem.difficultyByHe || {}).map(id => diffById[id]?.name).filter(Boolean);
      const gradeNames = (problem.gradeIds || []).map(id => gradeById[id]?.name).filter(Boolean);
      ```

- [ ] Bước 3: Tìm dòng (dòng ~180):
      ```jsx
      {problem.topic} • Độ khó: Mức {problem.level} • Loại: {parsed.type}
      ```
      Thay bằng:
      ```jsx
      {catNames.length ? catNames.join(', ') : 'Chưa phân loại'}
      {diffNames.length ? ` • ${diffNames.join(' / ')}` : ''}
      {gradeNames.length ? ` • Lớp ${gradeNames.join(', ')}` : ''}
      {` • ${parsed.type}`}
      ```

- [ ] Bước 4: Check it works
      Run: `npx tauri dev`, mở một bài **đã gắn phân loại**.
      You should see: dòng phụ hiện đúng tên chuyên đề, độ khó, lớp của bài đó. Bài chưa gắn → hiện "Chưa phân loại • <loại câu>".

- [ ] Bước 5: Save your progress
      Run: `git add . && git commit -m "fix(ux): Xem truoc hien dung phan loai moi (bo topic/level legacy)"`

---

### Task 7: Trạng thái rỗng cho danh sách

**What you'll have when this is done:** Khi không có bài nào khớp, danh sách hiện thông báo rõ ràng thay vì bảng trắng trơn.

- [ ] Bước 1: Trong `src/components/DataGrid.jsx`, thêm thuộc tính `components` vào `<TableVirtuoso ...>` (đặt cạnh `data={...}`):
      ```jsx
      components={{
        EmptyPlaceholder: () => (
          <tbody>
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
              {problems.length === 0
                ? 'Chưa có bài nào. Bấm “+ Thêm bài tập” để bắt đầu.'
                : 'Không có bài nào khớp bộ lọc. Thử nới bộ lọc hoặc xoá ô tìm kiếm.'}
            </td></tr>
          </tbody>
        )
      }}
      ```

- [ ] Bước 2: Check it works
      Run: `npx tauri dev`, gõ vào ô tìm kiếm một chuỗi vô nghĩa (vd `zzzzz`).
      You should see: dòng chữ "Không có bài nào khớp bộ lọc…". Xoá ô tìm kiếm → danh sách hiện lại.

- [ ] Bước 3: Save your progress
      Run: `git add . && git commit -m "feat(ux): trang thai rong cho danh sach"`

---

### Task 8: Nâng tương phản chữ phụ + dọn code chết

**What you'll have when this is done:** Chữ phụ đậm vừa đủ đọc (đạt chuẩn tương phản); xoá file CSS chết và sửa hiệu ứng động không tồn tại.

- [ ] Bước 1: Trong `src/components/DataGrid.jsx`, đổi 2 chỗ chữ nhạt `#94a3b8` → `var(--color-text-muted)`: dòng tag (dòng ~106) và chữ "Chưa phân loại" (dòng ~119). Trong `src/components/CartPanel.jsx`, đổi `#94a3b8` (chữ "Giỏ trống…", dòng ~49) → `var(--color-text-muted)`.

- [ ] Bước 2: Xoá file chết `src/App.css`
      Run: `git rm src/App.css`
      > File này không nơi nào import (chỉ `index.css` được nạp), nên xoá an toàn.

- [ ] Bước 3: Sửa hiệu ứng `fadeIn` (đang được gọi ở `Toolbar.jsx` nhưng chưa khai báo). Thêm vào cuối `src/index.css`:
      ```css
      @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
      ```

- [ ] Bước 4: Check it works
      Run: `$env:CI="false"; npm run build`  → `Compiled successfully`, **0 warning**.
      Rồi `npx tauri dev`: chọn vài bài (tick ô) → cụm nút "Thêm vào giỏ / Xóa" hiện ra có hiệu ứng mờ-dần nhẹ.
      Nếu build báo thiếu `App.css`: tìm xem còn dòng `import './App.css'` nào không (đáng lẽ không có) và xoá.

- [ ] Bước 5: Save your progress
      Run: `git add . && git commit -m "chore(ux): nang tuong phan chu phu + don App.css chet + fix fadeIn"`

---

### Task 9: Header gọn lại

**What you'll have when this is done:** Thanh đầu trang dịu hơn (bớt 4-màu-rực), dùng token, bỏ emoji làm icon — hợp tinh thần "calm".

- [ ] Bước 1: Trong `src/components/Header.jsx`, ở mảng `statCards`, đổi nền 4 thẻ về cùng một nền dịu: đặt `bg: 'var(--color-surface)'` cho cả 4 (giữ icon màu để vẫn phân biệt), và đổi `textColor` của cả 4 thành `'var(--color-text)'`.

- [ ] Bước 2: Bỏ emoji ở nhãn người dùng: đổi `👨‍🏫 Thầy Sơn` (dòng ~21) thành `Thầy Sơn`.

- [ ] Bước 3: Đổi viền/đường kẻ Header dùng token: trong thẻ ngoài cùng của Header, đổi `borderBottom: '1px solid #e2e8f0'` → `borderBottom: '1px solid var(--color-border)'`.

- [ ] Bước 4: Check it works
      Run: `npx tauri dev`
      You should see: 4 thẻ thống kê cùng nền trắng dịu, chữ dễ đọc, không còn emoji ông giáo. Số liệu vẫn đúng.

- [ ] Bước 5: Save your progress
      Run: `git add . && git commit -m "feat(ux): Header gon lai, dung token, bo emoji icon"`

---

### Task 10: Kiểm thử hồi quy — biên dịch sạch + xuất `.tex` còn nguyên

**What you'll have when this is done:** Bằng chứng GĐ1 **không làm hỏng** việc quan trọng nhất: xuất đề `.tex`.

> Bắt buộc theo luật an toàn LaTeX: dù GĐ1 không đụng logic xuất, vẫn phải xác nhận xuất `.tex` còn nguyên vẹn.

- [ ] Bước 1: Biên dịch sạch
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully`, **0 warning**.

- [ ] Bước 2: Tạo bài kiểm tra có công thức
      Mở `npx tauri dev` → "Thêm bài tập" → dán:
      ```
      \begin{bt}
      Cho $x^2 + y^2 = z^2$. Chứng minh khẳng định.
      \loigiai{ Ta có $x^2+y^2=z^2$. }
      \end{bt}
      ```
      Lưu lại.

- [ ] Bước 3: Xuất ra `.tex`
      Thêm bài vừa tạo vào Giỏ → mở Giỏ → "Xuất Đề (.tex)" → lưu file.

- [ ] Bước 4: Kiểm tra file `.tex`
      Mở file vừa tải bằng trình soạn thảo.
      You should see: có `\begin{bt}`, công thức `$x^2 + y^2 = z^2$` **giữ nguyên không sai ký tự**, và `\loigiai{...}` đúng. Cấu trúc `\documentclass`, `\usepackage{ex_test}` còn nguyên.
      Nếu công thức bị lệch/mất ký tự: **DỪNG LẠI**, báo lại ngay — đây là lỗi nghiêm trọng nhất, không tự sửa lung tung.

- [ ] Bước 5: Save your progress (nếu mọi thứ ổn)
      Run: `git add . && git commit -m "test(ux): xac nhan GD1 khong lam hong xuat .tex"`

---

## Ready to Build

The plan is saved (`.docs/plans/2026-06-21-ux-overhaul-gd1-nen-tang.md`). Here's what to do next:

1. Đọc qua cả kế hoạch một lượt trước khi bắt đầu.
2. Làm từng Task theo thứ tự — không nhảy cóc.
3. Hoàn thành bước "Check it works" trước khi sang Task kế.
4. Nếu có gì không đúng như mong đợi, **dừng lại và mô tả những gì Thầy thấy** — đừng thử sửa lung tung.

Nói **"let's start building"** khi Thầy sẵn sàng bắt đầu Task 1.
