# Thiết Kế: GĐ3 (đợt 1) — Khung điều hướng + Lọc hệ-first (bố cục 3 cột)

## 1. Thông tin chung
- **Ngày**: 23/06/2026
- **Trạng thái**: Đã chốt hướng đi & mọi câu hỏi mở qua phiên brainstorm (skill `brainstorming` + `problem-bank-ui`, dùng mockup trực quan). **Chờ Thầy duyệt tài liệu này trước khi lập kế hoạch build.**
- **Phạm vi**: Chỉ làm **phần KHUNG** của Giai đoạn 3 — nav rail kiểu Gmail + lọc **hệ-first** (sidebar cây của 1 hệ) + **bố cục 3 cột**. Thuần UI/bố cục, rủi ro thấp.
- **Bối cảnh**: Nối tiếp GĐ2 (card feed, đã merge `master`, Thầy nghiệm thu). Thầy chọn **chia nhỏ GĐ3** và **làm khung trước**. Các tính năng còn lại của GĐ3 (Thùng rác · Template xuất Mức 2 · Lịch sử đề) tách thành các **đợt con riêng**, mỗi cái brainstorm + spec riêng.
- **Tài liệu gốc**: [.docs/specs/2026-06-21-ux-overhaul-design.md](2026-06-21-ux-overhaul-design.md) (mục 8 — tầm nhìn GĐ3). Nhật ký gần nhất: [.docs/10_2026_06_23.md](../10_2026_06_23.md).

## 2. Mục tiêu đợt này
Đưa app từ **một cột + công tắc 2 tab tạm** (mầm GĐ2) lên **khung 3 cột thật**: điều hướng rõ ràng ở mép trái, và một cột lọc **gọn theo từng hệ** giúp Thầy soạn nhanh trong đúng hệ đang dạy (THCS/THPT/Chuyên/Olympic) mà không bị nhiễu bởi các hệ khác.

## 3. Các quyết định đã chốt (kèm lý do — "Teach Me Why")

1. **Chia nhỏ GĐ3, làm khung trước.** *Vì sao:* GĐ3 không thuần UI (có Template/Thùng rác đụng dữ liệu & golden-file). Tách khung (thuần UI, rủi ro thấp) ra trước giữ đúng nhịp GĐ1/GĐ2 và mở "đường ray" (rail) cho các tính năng sau gắn vào.
2. **Bố cục 3 cột**: `nav rail | cột lọc (khoá 1 hệ) | feed`. *Vì sao:* tách bạch 3 việc — *đi đâu trong app* (rail) · *lọc gì* (sidebar) · *đọc/sản xuất bài* (feed).
3. **Chọn hệ = dải tab phân đoạn** trên đỉnh cột lọc. *Vì sao:* Thầy luôn soạn trong 1 hệ rồi đổi qua lại; tab cho đổi-một-bấm và luôn thấy hệ đang chọn. Số hệ ít & ổn định (đang 4) nên tab không chật.
4. **Nav rail = icon + nhãn, gập được.** *Vì sao:* nhãn chữ rõ cho dùng hằng ngày (không phải dân lập trình); nút gập về chỉ-icon khi muốn nhường bề ngang cho feed — đúng tinh thần "rail mảnh, gập được" của spec gốc.
5. **Quản lý phân loại nằm TRONG Cài đặt** (không phải đích riêng như Bài/Giỏ, cũng bỏ vai trò "nút mở modal" rời ở Toolbar). *Vì sao (Thầy chốt):* bản chất nó là *thiết lập* phân loại — cài lúc đầu, thỉnh thoảng chỉnh, không phải nơi lui tới thường xuyên. Để trong Cài đặt đúng ngữ nghĩa và gọn rail. **Kỹ thuật:** mục này chỉ **mở đúng `CategoryManagerModal` hiện có** — KHÔNG dựng lại màn quản lý (giữ rủi ro thấp).
6. **Bài "Chưa phân loại" = bấm số trên Header.** *Vì sao:* khoá-1-hệ khiến feed chỉ hiện bài thuộc hệ đó → bài chưa gắn hệ nào bị ẩn khỏi mọi tab. Header vốn đã đếm số "chưa phân loại"; cho **bấm vào con số đó** để feed lọc ra các bài này (chế độ tạm) — giữ được khả năng triệt để phân loại như hiện nay mà không phải thêm mục vào cột lọc.

## 4. Bố cục 3 cột — chi tiết (xem mockup đã duyệt)

### 4.1. Header (full-width, trên cùng) — gần như giữ nguyên
- Tên app + các chỉ số. **Thay đổi duy nhất:** chỉ số **"Chưa phân loại: N" trở thành nút bấm được** → bật chế độ xem bài chưa phân loại (mục 5.4).

### 4.2. Cột 1 — Nav rail (thay công tắc 2 tab của GĐ2)
- **Trên (hành động nhanh):** `+ Thêm bài` (CTA cobalt) · `Import`. → Toolbar cũ (Thêm/Import/Quản lý) **bỏ đi**, dồn lên rail.
- **Giữa (đích lõi):** `Bài` (Home — feed) · `Giỏ` (badge số bài, amber khi >0).
- **Dưới:** `Cài đặt` — đích riêng; bên trong có **Quản lý phân loại** + (chừa chỗ) dark mode, cỡ chữ, mặc định xuất đề, khoá API Gemini, vị trí DB/backup.
- **Gập:** mặc định icon+nhãn; nút `‹‹` thu còn icon (nhãn ẩn). Trạng thái gập giữ trong phiên.

### 4.3. Cột 2 — Cột lọc hệ-first (chỉ hiện khi đang ở đích "Bài")
Thứ tự từ trên xuống:
1. **Dải tab hệ** (segmented): THCS · THPT · Chuyên · Olympic. Đúng **một** tab active.
2. **Cây chuyên đề** (của riêng hệ đang chọn): mỗi nhánh gập/mở; **bấm một nhánh = lọc** bài của nhánh đó **gồm mọi nhánh con**. Có cách bỏ chọn nhánh (về "cả hệ").
3. **Độ khó (của hệ)**: chỉ các mức của hệ đang chọn (hết cảnh gom nhóm `optgroup` rối ở dropdown cũ).
4. **Lớp**: danh sách lớp (dùng chung mọi hệ).
5. **Xoá lọc**: trả nhánh/độ khó/lớp/tìm về mặc định (vẫn giữ hệ đang chọn).
- **Gập:** nút thu cột lọc để còn `rail | feed` (feed rộng tối đa).

### 4.4. Cột 3 — Feed (giữ nguyên GĐ2)
- Đỉnh: ô **tìm kiếm** + **sắp xếp** (chuyển từ ControlsRow cũ sang đây; các dropdown chuyên đề/độ khó **bỏ** vì đã thay bằng cột lọc).
- Thanh **hàng loạt** (chọn bằng bấm thẻ) — y như GĐ2.
- **Thẻ bài (`ProblemCard`) KHÔNG đổi.**
- Khi đang ở đích `Giỏ` → cột phải là trang `CartPanel`; đích `Cài đặt` → trang Cài đặt. (Cột lọc ẩn ở 2 đích này.)

## 5. Hành vi lọc (phần "hồn" của hệ-first)

### 5.1. Khoá 1 hệ
- Có một **hệ đang chọn** (`selectedHe` = id nút gốc). Feed **chỉ hiện bài thuộc hệ đó** = bài có ít nhất một `categoryId` mà leo `parent_id` về gốc đúng bằng `selectedHe` (dùng `getRootHeId` đã có). Bài thuộc nhiều hệ vẫn hiện ở mỗi hệ liên quan.
- **Mặc định:** mở app vào **hệ đầu tiên** theo `position`. Nhớ hệ vừa chọn **trong phiên** (chưa lưu vĩnh viễn — để sau cùng dark mode).

### 5.2. Lọc theo nhánh cây
- Bấm một nhánh → giữ bài có `categoryId` nằm trong `getDescendantIds(nhánh)` (nhánh + con cháu) — **tái dùng nguyên logic GĐ2**.
- Nhánh luôn **thuộc hệ đang chọn** (cây chỉ vẽ cây của hệ đó).

### 5.3. Đổi hệ → reset cục bộ
- Đổi tab hệ ⇒ **xoá lựa chọn nhánh + độ khó** (vì chúng thuộc hệ cũ). **Lớp** và **ô tìm** giữ nguyên (lớp dùng chung; tìm là xuyên suốt).

### 5.4. Chế độ "Chưa phân loại"
- Bấm số "Chưa phân loại" trên Header ⇒ feed **chỉ hiện bài có 0 phân loại** (`categoryIds` rỗng). Chế độ này **đè** lên lọc hệ/nhánh/độ khó.
- Có chỉ báo nhỏ "Đang xem: Chưa phân loại ✕"; bấm ✕ **hoặc bấm bất kỳ tab hệ nào** = thoát, về lọc hệ bình thường.

### 5.5. Kết hợp lọc
- Trong một hệ: `nhánh (gồm con) × độ khó (của hệ) × lớp × tìm văn bản` — giao nhau (AND), như hiện tại.

## 6. Những gì KHÔNG đổi / ngoài phạm vi đợt này
- **KHÔNG đụng:** nội dung/định dạng LaTeX mỗi bài, bóc tách khi nhập, **xuất `.tex`** (helper `buildProblemTex` + `handleFinalExport` giữ nguyên → output **byte-identical**), schema taxonomy, `useProblems`/`useTaxonomy` (chỉ *đọc* thêm, không đổi CRUD), `ProblemCard`, `PreviewModal`, `CartPanel` (nội dung).
- **KHÔNG thêm trường dữ liệu** cho bài.
- **Để các đợt con sau của GĐ3:** Thùng rác (xoá mềm) · Template xuất Mức 2 (+ golden-file) · Lịch sử đề · **nội dung thật** của trang Cài đặt (dark mode, cỡ chữ, mặc định xuất, API, DB/backup).

## 7. Phần kỹ thuật (cho bước lập kế hoạch)

### 7.1. State mới trong `useUIState.js`
- `selectedHe` (id hệ gốc; khởi tạo = hệ đầu theo `position` — set sau khi taxonomy tải xong).
- `unclassifiedMode` (bool) — chế độ xem bài chưa phân loại.
- `railCollapsed`, `sidebarCollapsed` (bool) — trạng thái gập.
- Tổng quát hoá `currentView`: `'feed' | 'cart' | 'settings'` (thêm `'settings'`).
- Giữ `filterTopic` làm **nhánh đang chọn trong hệ** (id nhánh, hoặc `'all'`); `filterDifficulty`, `filterGrade`, `searchTerm`, `sortBy` như cũ.
- Luật reset: đổi `selectedHe` ⇒ `filterTopic='all'`, `filterDifficulty='all'`. Chọn tab hệ ⇒ `unclassifiedMode=false`.

### 7.2. Component
- **Mới** `NavRail.jsx` (cột 1) — icon+nhãn, gập; gọi các handler Thêm/Import + đổi `currentView`.
- **Mới** `FilterSidebar.jsx` (cột 2) — dải tab hệ + cây lọc (1 hệ) + độ khó (1 hệ) + lớp + xoá lọc. Dựng `childrenMap`/`roots` từ `useTaxonomy` (như `ControlsRow`/`DataGrid` đang làm); cây dạng **bấm-để-lọc** (khác `ClassificationPicker` dạng tick) nhưng tham khảo cách dựng cây của nó.
- **Mới** `SettingsPage.jsx` (cột 3 khi `currentView='settings'`) — nút **Quản lý phân loại** (mở `CategoryManagerModal` hiện có) + các mục placeholder.
- **Sửa** `App.jsx` — layout 3 cột: `NavRail` luôn hiện; giữa = `FilterSidebar` (chỉ khi `currentView='feed'`); phải = feed | `CartPanel` | `SettingsPage`. Bỏ `Toolbar`; rút `ControlsRow` còn **tìm + sắp xếp** (đặt ở đỉnh feed) hoặc gộp vào header feed (chốt ở bước build).
- **Sửa** `Header.jsx` — chỉ số "Chưa phân loại" thành nút (`onClick` → bật `unclassifiedMode`).
- **Sửa** `DataGrid.jsx` — nhận thêm `selectedHe` + `unclassifiedMode`; thêm bước lọc theo hệ gốc (dùng `getRootHeId` + `parentMap` đã có) và nhánh chưa-phân-loại. Lọc nhánh/độ khó/lớp/tìm giữ nguyên.

### 7.3. Tái dùng (không viết mới)
- `getRootHeId`, `getDescendantIds` (đã export ở `useTaxonomy.js`).
- `groupClassificationByHe` (`utils/classification.js`).
- `CategoryManagerModal`, `ProblemCard`, `PreviewModal`, `CartPanel`.

## 8. Câu hỏi mở / chốt ở bước build
- Tìm+sắp xếp: đặt thành một **thanh đỉnh feed** riêng hay gộp vào header của `DataGrid`? (gọn hơn)
- Cây lọc: nhánh đang chọn hiển thị "đường về cả hệ" thế nào (nút "Tất cả chuyên đề của hệ").
- Hoạt ảnh gập rail/sidebar (nhẹ, không bắt buộc).

## 9. Tiêu chí nghiệm thu (đợt khung)
1. **Biên dịch:** `CI=false npm run build` → **Compiled successfully, 0 warning**.
2. **An toàn xuất `.tex`:** không sửa `buildProblemTex`/`handleFinalExport`; xuất một đề mẫu vẫn **byte-identical** với trước đợt.
3. **Trực quan (Thầy chạy `npx tauri dev`):**
   - 3 cột hiện đúng; rail icon+nhãn, gập được; cột lọc gập được.
   - Đổi tab hệ ⇒ cây + độ khó đổi theo hệ; feed chỉ còn bài của hệ đó; nhánh/độ khó cũ được reset; **lớp giữ nguyên**.
   - Bấm nhánh ⇒ feed lọc gồm nhánh con.
   - `Cài đặt` mở được; trong đó **Quản lý phân loại** mở đúng cửa sổ cũ và CRUD vẫn chạy.
   - Bấm "Chưa phân loại" trên Header ⇒ feed hiện bài chưa phân loại; thoát được.
   - Giỏ/Xem đầy đủ/Mã LaTeX/chọn-bằng-bấm-thẻ của GĐ2 vẫn nguyên vẹn.

## 10. Bước tiếp theo
Sau khi Thầy **duyệt spec này** → chuyển sang skill `writing-plans` lập **build plan** chia task nhỏ (đặt token nếu cần, dựng `NavRail`/`FilterSidebar`/`SettingsPage`, nối state, soát byte-identical) rồi mới code.
