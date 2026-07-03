# Bảng Thống Kê + Theo Dõi "Đã Dùng" — Design Spec

**Ngày:** 03/07/2026
**Trạng thái:** Thiết kế đã chốt (Thầy duyệt 03/07/2026: "Đề xuất hay. Sử dụng nhé"). Chờ lập plan → build.
**Quy trình:** Claude brainstorm + spec + plan → build → Claude check lại.
**Bối cảnh:** 1 trong 2 đề xuất cải thiện còn lại sau NK21→NK24 ("xuất đề+đáp án riêng" · "bảng tổng quan (dashboard)"). Thầy chọn làm bảng thống kê trước.

## Mục tiêu
Hai việc gộp chung 1 đợt vì cùng dùng chung một nguồn dữ liệu (`export_history`):
1. **Tổng quan kho đề** — nhìn được ngay quy mô kho theo Hệ và theo nhánh chủ đề, không phải lướt cả danh sách để tự đếm.
2. **Tránh soạn trùng** — khi chọn bài cho đề mới, biết ngay bài nào đã dùng trong các đề đã xuất trước đó.

## Quyết định đã chốt (qua brainstorm)
1. **Màn Thống kê** = mục điều hướng riêng trên nav rail, đặt **trên cùng** cụm Bài/Giỏ, và là **màn mặc định khi mở app**.
2. **Trục thống kê**: theo **Hệ** (THCS/THPT/Chuyên/Olympic + "Chưa phân loại") và theo **nhánh chủ đề cấp 1** trong mỗi hệ (gộp cả nhánh con bên trong mỗi nhánh cấp 1). KHÔNG làm trục Lớp/Độ khó, KHÔNG đào sâu hơn cấp 1.
3. **Trình bày**: thẻ số + danh sách (đồng bộ phong cách thẻ Header hiện có), KHÔNG thêm thư viện biểu đồ.
4. **Tương tác**: bấm vào một số (Hệ hoặc nhánh) → chuyển sang "Bài" đã lọc đúng hệ/nhánh đó — tái dùng đúng cơ chế "Chưa phân loại" ở Header đang có.
5. **Nguồn dữ liệu "đã dùng"**: đếm số lần mỗi bài xuất hiện trong toàn bộ `export_history.problem_ids`. **KHÔNG dùng cột `problems.timesUsed`** — cột này không được cập nhật ở bất kỳ đâu trong code (kể cả lúc xuất đề), luôn = 0, là số liệu chết.
6. **Hiển thị "đã dùng"**: badge trên từng thẻ bài + trong "Xem đầy đủ" (chỉ hiện khi đã dùng ≥1 lần, giống hệt cách badge "📐 Có hình" hoạt động) + bộ lọc mới "Chỉ hiện bài chưa dùng" ở cột lọc.
7. **Dọn kèm**: bỏ thẻ "Lượt sử dụng" (đọc `timesUsed`, luôn hiện 0) khỏi Header.

## Bối cảnh kỹ thuật (đã xác minh)
- `problems.timesUsed`: chỉ được **ghi lúc tạo** (`AddProblemModal.jsx`, `SmartImportModal.jsx`, `useProblems.js` — luôn `|| 0`), **không nơi nào tăng nó**, kể cả `ExportModal.doExport` (chỉ gọi `saveHistory`, không đụng `timesUsed`). Header (`App.jsx:132`) đang cộng dồn cột chết này.
- `export_history` (bảng có sẵn, `db.js:135`): `id · export_date · template_name · problem_ids` (JSON mảng id). Đọc qua `useExportHistory().loadHistory()` → `historyItems` (đã `JSON.parse` sẵn `problem_ids`).
- **`useExportHistory()` hiện chỉ được gọi cục bộ** trong `ExportHistoryModal.jsx` (đọc) và `ExportModal.jsx` (ghi qua `saveHistory`) — **chưa có ở cấp `App.jsx`**. Để badge/dashboard dùng chung một nguồn, cần gọi hook này thêm 1 lần ở `App.jsx` (độc lập với 2 chỗ gọi cũ, không đụng chúng).
- Cây phân loại: `useTaxonomy()` đã có sẵn `categories`/`difficulties`/`grades` + 2 hàm thuần **`getRootHeId`/`getDescendantIds`** (export từ `useTaxonomy.js`) — dùng lại để leo gốc-hệ và gộp đếm nhánh-con-vào-nhánh-cấp-1, không viết lại logic cây.
- Badge "📐 Có hình" — khuôn mẫu để mirror: `ProblemCard.jsx:86-88` (nối chuỗi `· 📐 Có hình` khi có `figStatement`/`figSolution`, dùng dấu `·`) và `PreviewPanel.jsx:108` (cùng ý nhưng dùng dấu `•`, style riêng file này).
- Điều hướng hiện có: `currentView` (`useUIState.js:23`, mặc định `'feed'`) switch trong `App.jsx` (~dòng 158-236) theo khuôn `{ui.currentView === 'x' && <XPage .../>}` — thêm `'dashboard'` là **thêm 1 nhánh mới đúng khuôn cũ**, không phải kiến trúc mới. `NavRail.jsx` render các nút theo `currentView`/`onNavigate` — thêm 1 `<button>` là đủ.
- Lọc hiện có nằm trong `DataGrid.jsx` (`filteredAndSorted` useMemo, dòng 50-73) — nơi sẽ thêm điều kiện lọc "chỉ hiện chưa dùng".
- `PreviewModal` nhận `problem={ui.selectedPreview}` trực tiếp từ `App.jsx` (dòng ~312-316) — 1 điểm chèn `usageCount` duy nhất.

## Thiết kế

### 1. Điều hướng
- `useUIState.js`: đổi khởi tạo `currentView` từ `'feed'` → `'dashboard'`; cập nhật comment liệt kê giá trị hợp lệ.
- `NavRail.jsx`: thêm nút **"Thống kê"** (icon `BarChart3`) ngay sau vạch chia, **trước** nút "Bài" — thứ tự mới: Thống kê → Bài → Giỏ.
- `App.jsx`: thêm nhánh `{ui.currentView === 'dashboard' && <DashboardPage ... />}` theo đúng khuôn `SettingsPage`/`TrashPage`.

### 2. Nguồn dữ liệu dùng chung (App.jsx)
- Gọi thêm `const { historyItems, loadHistory } = useExportHistory();` ở `App.jsx` (instance riêng, không đụng 2 chỗ gọi cũ trong ExportModal/ExportHistoryModal).
- `useEffect` tải `loadHistory()` khi mount **và mỗi khi `currentView` chuyển sang `'feed'` hoặc `'dashboard'`** — đảm bảo sau khi xuất đề xong rồi quay lại 1 trong 2 màn này, số liệu "đã dùng" luôn mới, mà không cần sửa `ExportModal.jsx`/`ExportHistoryModal.jsx`.
- `usageByProblemId = useMemo(() => countUsageByProblemId(historyItems), [historyItems])` — map `{ [problemId]: soLan }`.
- Truyền `usageByProblemId` xuống `DataGrid` (→ `ProblemCard`), `FilterSidebar` (cho việc lọc), `PreviewModal` (→ `PreviewPanel`), và `DashboardPage`.

### 3. Util thuần mới — `src/utils/usageStats.js`
```
countUsageByProblemId(historyItems) → { [problemId]: number }
```
Duyệt toàn bộ `historyItems[].problem_ids`, cộng dồn theo id. Thuần (không import DB/React) → có test riêng (`usageStats.test.js`), theo đúng khuôn `findDuplicates.js`/`searchText.js`/`backupRotation.js`.

### 4. Màn `DashboardPage.jsx` (mới)
- Nhận props: `problems`, `usageByProblemId`, `onNavigateToHe(heId)`, `onNavigateToBranch(branchId)`, `onNavigateToUnclassified()`. Tự gọi `useTaxonomy()` để lấy `categories` (giống cách `DataGrid`/`FilterSidebar` đang làm).
- Với mỗi **Hệ** (root category, sắp theo `position`) + 1 khối **"Chưa phân loại"**: đếm số bài có ≥1 `categoryIds` leo gốc về hệ đó (dùng `getRootHeId`); "Chưa phân loại" = bài có `categoryIds` rỗng.
- Trong mỗi khối Hệ: liệt kê **toàn bộ nhánh cấp 1** của hệ đó (kể cả nhánh đang có 0 bài — không ẩn, để thấy đúng cấu trúc cây đã có), mỗi nhánh đếm bằng `getDescendantIds(nhánh, childrenMap)` rồi đếm bài có ít nhất 1 `categoryIds` nằm trong tập đó.
- Số Hệ và số nhánh đều là nút bấm được → gọi `onNavigateToHe`/`onNavigateToBranch`/`onNavigateToUnclassified` (App.jsx nối các hàm này = tổ hợp `ui.selectHe`/`ui.setFilterTopic`/`ui.showUnclassified` + `ui.setCurrentView('feed')`, tái dùng logic đã có của Header, không viết mới).
- Trình bày: mỗi Hệ 1 khối thẻ lớn (style đồng bộ thẻ Header), nhánh liệt kê dạng hàng "tên — số" bên trong khối.

### 5. Badge "đã dùng" (ProblemCard + PreviewPanel)
- `ProblemCard.jsx`: thêm prop `usageCount`; nối vào dòng badge sẵn có (cạnh "📐 Có hình"): `usageCount > 0 ? ' · 🔁 Đã dùng {usageCount} lần' : ''`.
- `PreviewPanel.jsx`: thêm prop tương tự, nối theo style dấu `•` sẵn có của file này.
- `DataGrid.jsx`: nhận prop `usageByProblemId`, truyền `usageCount={usageByProblemId[problem.id] || 0}` cho từng `ProblemCard`.
- `App.jsx`: truyền `usageCount={usageByProblemId[ui.selectedPreview?.id] || 0}` cho `PreviewModal`.

### 6. Bộ lọc "Chỉ hiện bài chưa dùng"
- `useUIState.js`: thêm state `onlyUnused` (boolean, mặc định `false`) + `setOnlyUnused`; thêm vào `clearFilters()`.
- `FilterSidebar.jsx`: thêm 1 chip/checkbox "Chỉ hiện bài chưa dùng" (cạnh cụm Lớp, trước nút "Xoá lọc").
- `DataGrid.jsx`: nhận prop `onlyUnused`; trong `filteredAndSorted`, thêm điều kiện `if (onlyUnused && usageByProblemId[p.id]) return false;`.

### 7. Dọn Header
- `Header.jsx`: bỏ mục "Lượt sử dụng" khỏi `statCards` + import `Activity` không dùng nữa.
- `App.jsx`: bỏ field `used` trong object `stats` truyền cho `Header`.

## Phạm vi code
**Thêm mới**: `src/utils/usageStats.js` (+ test) · `src/components/DashboardPage.jsx`.
**Sửa**: `useUIState.js` · `NavRail.jsx` · `App.jsx` · `Header.jsx` · `ProblemCard.jsx` · `PreviewPanel.jsx` · `FilterSidebar.jsx` · `DataGrid.jsx`.
**KHÔNG đụng**: schema DB (không bảng/cột mới), `buildProblemTex`/`buildContentFile` (xuất `.tex`), `ExportModal.jsx`, `ExportHistoryModal.jsx`, Rust, thư viện mới.

## Ngoài phạm vi (YAGNI)
- Breakdown theo Lớp/Độ khó trong màn Thống kê.
- Xem sâu hơn cấp 1 (không có UI mở rộng cây trong Dashboard).
- Biểu đồ (pie/bar chart) — chữ + số + thanh ngang CSS đơn giản là đủ ở quy mô ~73–2000 bài.
- Xu hướng nhập liệu theo thời gian (bao nhiêu bài/tháng).
- Bảng liệt kê riêng "Top bài dùng nhiều nhất/chưa dùng bao giờ" dạng danh sách — thay bằng badge + lọc tại chỗ.
- Sửa cột `timesUsed` cho đúng nghĩa — bỏ hẳn khỏi Header thay vì sửa lại cách tính.

## Rủi ro & cách xử lý
- **Dữ liệu "đã dùng" có thể cũ nếu Thầy vừa xuất đề mà chưa chuyển màn** — chấp nhận được vì `loadHistory()` tự chạy lại ngay khi vào "Bài" hoặc "Thống kê" (mục Thiết kế §2); không cần bấm nút làm mới thủ công.
- **Bài mồ côi id lạ trong `export_history`** (bài đã bị xoá hẳn khỏi kho nhưng từng nằm trong 1 đề đã xuất) → `usageByProblemId` vẫn có entry cho id đó nhưng không bài nào khớp để hiện badge — vô hại, không cần lọc riêng.
- **Nhánh chủ đề cấp 1 nhưng bài gắn ở hệ khác cùng tên** — không xảy ra vì đếm luôn bám theo `getRootHeId`/`getDescendantIds` (đi theo `parent_id` thật, không so tên).

## Tiêu chí nghiệm thu (cho bước Claude check lại) — bản GỐC, xem SỬA ĐỔI bên dưới cho hành vi hiện hành
- Mở app → vào thẳng màn Thống kê (không phải Bài).
- Tổng số bài mỗi Hệ + "Chưa phân loại" cộng lại = tổng số bài toàn kho (`problems.length`, trừ đã xoá mềm).
- Bấm số của 1 Hệ hoặc 1 nhánh → chuyển sang "Bài", đúng bộ lọc, đúng danh sách hiển thị khớp con số vừa bấm.
- ~~Xuất 1 đề có bài X → quay lại "Bài"/"Thống kê" → thẻ bài X hiện "🔁 Đã dùng 1 lần"; xuất thêm 1 đề nữa cũng có bài X → hiện "Đã dùng 2 lần".~~ (đổi ở bản sửa đổi bên dưới)
- Bật "Chỉ hiện bài chưa dùng" → bài đã dùng biến mất khỏi danh sách; tắt lại → hiện lại đầy đủ.
- Header không còn thẻ "Lượt sử dụng".
- `npm run build` 0 warning; test mới (`usageStats.test.js`) xanh; **golden export `.tex` giữ nguyên tuyệt đối** (không đụng `buildProblemTex`/`buildContentFile`).

---

## SỬA ĐỔI 03/07/2026 (sau khi Thầy kiểm GUI lần đầu)

Thầy build xong bản gốc ở trên (9 task, đã commit, chưa push), kiểm GUI thì phản hồi 2 điểm — đi qua brainstorm lại (hỏi-đáp) trước khi sửa, chốt như sau:

### 1. Bỏ Header hoàn toàn
Lý do: cả 3 thẻ còn lại (Tổng bài tập/Chưa phân loại/Giỏ đề thi) đều đã trùng lặp thông tin — Tổng bài tập + Chưa phân loại đã có ở màn Thống kê mới; Giỏ đề thi đã có badge số trên nút "Giỏ" ở nav rail. **Quyết định: xoá hẳn `Header.jsx`, không giữ lại gì** (kể cả tên app/"Thầy Sơn") — nhường toàn bộ chiều cao màn hình cho nội dung.

### 2. Badge "đã dùng" đổi hẳn cách tính — từ đếm cộng dồn sang "gần đây trong 30 ngày + tên file"
Lý do Thầy nêu: đếm cộng dồn vĩnh viễn ("Đã dùng N lần") sẽ gây rối khi dùng lâu dài — không phân biệt được bài dùng tuần trước với bài dùng 2 năm trước. Thầy muốn biết **bài nào vừa dùng GẦN ĐÂY** để né trùng khi soạn đề mới, và biết **lưu ở file nào** để tìm lại.

**Chốt (qua brainstorm)**:
- Chỉ hiện badge nếu bài có ít nhất 1 lần xuất **trong 30 ngày gần nhất tính từ hôm nay** (cố định 30, không có ô chỉnh trong Cài đặt).
- Nội dung badge = **tên file Thầy đã lưu** (Save As) của lần xuất gần nhất trong 30 ngày đó — KHÔNG phải đếm số lần. Nếu xuất nhiều lần trong 30 ngày với cùng bài, chỉ hiện tên file **mới nhất**.
- Quá 30 ngày kể từ lần xuất gần nhất → badge tự biến mất (tính lại mỗi lần hiện, không cần dọn dữ liệu).
- Badge mới: `· 🔁 Đã dùng: <tên file>` (ví dụ `· 🔁 Đã dùng: NoiDung.tex`) — thay cho `· 🔁 Đã dùng N lần`.

**Lưu tên file thật (kỹ thuật quan trọng)**: `export_history.template_name` (cột có sẵn) đang lưu SAI — lưu tên FILE MẪU (`baseName(selected)`), không phải tên file Thầy lưu ra. **Chốt: sửa lại giá trị ghi vào ĐÚNG cột này** — đổi `ExportModal.jsx` chỗ gọi `saveHistory(baseName(selected), problemIds)` → `saveHistory(baseName(savePath), problemIds)`. KHÔNG thêm cột CSDL mới (Thầy chọn phương án đơn giản hơn, chấp nhận đổi luôn ý nghĩa cột cũ). Hệ quả: màn "Lịch sử xuất đề" có sẵn (`ExportHistoryModal.jsx`) tự động đổi sang hiện **tên file đã lưu** thay vì tên mẫu — không cần sửa code màn đó, chỉ đổi giá trị nguồn. Đây là điểm DUY NHẤT đụng tới `ExportModal.jsx` (1 dòng, không đụng `buildContentFile`/nội dung `.tex`/`write_text_file`).

**Bộ lọc "Chỉ hiện bài chưa dùng" đổi nghĩa theo**: giờ nghĩa là "chưa dùng **trong 30 ngày qua**" (khớp badge) — bài dùng từ lâu hơn 30 ngày vẫn hiện trong danh sách đã lọc, vì được xem là "an toàn để dùng lại". Đổi nhãn ô tick thành **"Chỉ hiện bài chưa dùng (30 ngày qua)"** để rõ nghĩa.

### Thiết kế lại `usageStats.js`
Đổi từ `countUsageByProblemId(historyItems) → {id: count}` sang:
```
getRecentUsageByProblemId(historyItems, now = new Date(), withinDays = 30) → { [problemId]: { fileName, exportDate } }
```
Chỉ chứa bài có ít nhất 1 lần xuất còn trong hạn; mỗi bài giữ đúng 1 bản ghi = lần xuất **gần nhất** trong hạn. Hàm vẫn THUẦN (nhận `now` qua tham số để test được tất định, không gọi `new Date()` ngầm bên trong logic so sánh).

### Phạm vi sửa (trên nền code vừa build, CHƯA push — sửa trực tiếp các file/commit vừa tạo)
- **Xoá**: `src/components/Header.jsx`.
- **Sửa**: `src/utils/usageStats.js` + test (viết lại thuật toán); `src/App.jsx` (bỏ `<Header>`+import, đổi `usageByProblemId`→`recentUsageByProblemId`); `src/components/DataGrid.jsx`, `ProblemCard.jsx`, `PreviewModal.jsx`, `PreviewPanel.jsx` (đổi prop `usageCount` số → `recentUsage` object, badge mới); `src/components/FilterSidebar.jsx` (đổi nhãn ô tick); `src/components/Modals/ExportModal.jsx` (1 dòng, xem trên).
- **Không đổi**: schema CSDL (không thêm cột — dùng lại `template_name` có sẵn), `DashboardPage.jsx`, `NavRail.jsx`, `db.js`, `ExportHistoryModal.jsx` (code giữ nguyên, chỉ đổi Ý NGHĨA dữ liệu hiện ra), `buildProblemTex`/`buildContentFile`.

### Tiêu chí nghiệm thu — bản HIỆN HÀNH (thay bản gốc ở trên)
- Không còn Header trên bất kỳ màn nào; nội dung chiếm trọn chiều cao còn lại (dưới thanh nào đó nếu có).
- Xuất 1 đề có bài X, đặt tên file lúc Save As là "NoiDung.tex" → quay lại "Bài" → thẻ X hiện `🔁 Đã dùng: NoiDung.tex`.
- Xuất thêm 1 lần nữa cùng bài X, đặt tên khác "DeThi2.tex" → badge X đổi thành `🔁 Đã dùng: DeThi2.tex` (không cộng dồn, chỉ hiện file mới nhất).
- Mở "Lịch sử xuất đề" → các dòng giờ hiện tên file đã lưu (khớp tên Thầy đặt lúc Save As), không phải tên template.
- Bật "Chỉ hiện bài chưa dùng (30 ngày qua)" → bài vừa xuất (còn trong hạn) biến mất khỏi danh sách.
- (Không kiểm được tự động việc "quá 30 ngày badge tự mất" trong 1 phiên — xác nhận qua test thuần với `now` giả lập ngày tương lai thay vì chờ thật 30 ngày.)
- `npm run build` 0 warning; test `usageStats.test.js` xanh (bộ test mới); **golden export `.tex` giữ nguyên tuyệt đối**.
