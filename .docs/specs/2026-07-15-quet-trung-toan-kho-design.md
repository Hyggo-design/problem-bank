# Thiết Kế: Quét Trùng Toàn Kho — Problem Bank

## 1. Thông tin chung
- **Ngày**: 15/07/2026
- **Trạng thái**: Đã brainstorm chi tiết (4 câu hỏi chốt) + Thầy DUYỆT thiết kế ("oke ạ"). Sẵn sàng chuyển sang Plan.
- **Đợt**: Roadmap **Đợt B** (`.docs/ROADMAP.md`) — mục "🧩 Quét trùng toàn kho" (món Đợt B cuối cùng còn lại, cạnh đợt con Ma trận v2).
- **Phạm vi**: một **màn mới rà cả kho** để tìm các bài giống nhau, gom thành **nhóm**, cho Thầy **xử lý ngay tại chỗ** (Xem đầy đủ + Xoá mềm). Mở từ **Cài đặt**.
- **KHÔNG trong phạm vi đợt này**: gộp/hợp-nhất bài tự động; sửa nội dung bài từ màn quét; chỉnh ngưỡng trên màn quét (dùng chung ngưỡng Cài đặt); thêm bảng/cột CSDL; lưu lịch sử các lần quét; quét trùng *nội bộ một mẻ Smart Import* (đã có kiểm trùng-với-kho khi Import từ NK21).

### Bối cảnh (vì sao làm việc này)
- App hiện **chỉ kiểm trùng lúc thêm/sửa MỘT bài** (`checkDuplicate` → `findDuplicates`, `DuplicateWarningModal`): so bài đang soạn với cả kho. Nhưng **không có công cụ nào rà *cả kho*** để tìm các cặp bài **đã lỡ nhập trùng nhau từ trước** (ví dụ nhập tay rồi lại Import lại, hoặc dán trùng).
- Roadmap Đợt B chốt: "hiện chỉ kiểm trùng lúc thêm; thêm công cụ rà trùng cả kho".

## 2. Mục tiêu
- **Dọn kho**: tìm các bài trùng/gần trùng đã tồn tại, dọn cho gọn (giảm nhiễu khi bốc câu, tạo đề, tra cứu).
- **Xử lý nhanh, an toàn**: xem đối chiếu và xoá ngay trong màn kết quả; xoá là **xoá mềm** (vào Thùng rác, có Hoàn tác) nên không sợ mất bài.
- **Nhất quán với cảnh báo lúc thêm**: cùng thuật toán (Sørensen-Dice), cùng "đề HOẶC lời giải", cùng ngưỡng ở Cài đặt → kết quả không mâu thuẫn giữa hai chỗ.

## 3. Bối cảnh dữ liệu thật (kiểm CSDL read-only 15/07, mô phỏng đúng `calculateSimilarity`)
Quan trọng để đặt kỳ vọng đúng — và để thấy tính năng **có ích ngay**:
- **73 bài còn sống** → **2628 cặp** phải so.
- **Ở ngưỡng mặc định 85%: đúng 1 cặp nghi trùng — và là TRÙNG THẬT 100%/100%**: hai bài y hệt nhau (đề: "Xác định tất cả các số nguyên tố $p_1,\ldots,p_{13}$ … $p_1^2+\ldots+p_{12}^2=p_{13}^2$"; cả đề lẫn lời giải khớp từng ký tự). Một bài thêm **25/06**, bài kia thêm **28/06** — Thầy lỡ nhập lại. ⇒ Lần quét đầu tiên sẽ bắt ngay một bài trùng thật.
- Hạ ngưỡng để tham khảo (không phải trùng thật, chỉ cùng họ đề): **75% → 3 cặp**, **70% → 6 cặp** (các cặp thêm đều "đề ~70–76%, lời giải khác hẳn" — là bài khác nhau chung cấu trúc, KHÔNG nên xoá). ⇒ **85% mặc định là ngưỡng tốt**: bắt trúng cặp trùng thật, 0 nhiễu.
- **Hệ quả thiết kế**: (a) tính năng hữu ích thực tế ngay; (b) ở 85% nhóm hầu như chỉ gồm **2 bài** — gom-nhóm chỉ có tác dụng khi lỡ nhập ≥3 lần; (c) giữ **xoá mềm** vì các cặp gần-giống (nếu Thầy hạ ngưỡng) có thể là bài khác nhau → lỡ xoá vẫn khôi phục được.

## 4. Hiện trạng (điểm xuất phát trong code)
- **So trùng lúc thêm** — `src/utils/findDuplicates.js`:
  - `calculateSimilarity(str1, str2)` — Sørensen-Dice trên **tập bigram ký tự**. Chuẩn hoá: `toLowerCase()` + bỏ mọi khoảng trắng (`\s+`→''). Trả `1.0` nếu chuỗi chuẩn-hoá bằng nhau; `0.0` nếu một trong hai rỗng hoặc <2 ký tự. Công thức: `2·|A∩B| / (|A|+|B|)`.
  - `findDuplicates(problems, newStatement, newSolution, threshold, currentId)` — so **MỘT** bài mới với cả kho; gắn cờ nếu **đề HOẶC lời giải** ≥ ngưỡng; trả **mảng** match xếp % giảm. *(Đường thêm-bài — GIỮ NGUYÊN, không đụng.)*
- **Ngưỡng**: `useProblems.checkDuplicate` đọc `localStorage['pb-dup-threshold']` (mặc định `85`, đơn vị %), chia 100. *(Màn quét dùng lại đúng khóa này.)*
- **Đường xoá mềm + Hoàn tác (TÁI DÙNG)** — `App.jsx` (khối `DataGrid onDelete`, ~dòng 245):
  ```js
  if (await deleteProblem(id)) {
    removeFromCart(id);
    if (selectedPreview?.id === id) setSelectedPreview(null);
    undoToast('Đã chuyển vào thùng rác', async () => {
      if (!(await restoreProblem(id))) error('Chưa khôi phục được — thử lại nhé.');
    });
  } else { error('Chưa xoá được — thử lại nhé.'); }
  ```
  `deleteProblem`/`restoreProblem` (từ `useProblems`) trả `true/false` (Đợt A #1 — không nuốt lỗi). Bài xoá tự biến khỏi feed vì `loadProblems` lọc `deletedAt IS NULL` tại nguồn.
- **Xem đầy đủ (TÁI DÙNG)**: đặt `selectedPreview` → `PreviewModal` render (App.jsx ~dòng 383), **độc lập với `currentView`** + tự lấy `recentUsage`. ⇒ "Xem đầy đủ" từ màn quét chạy được ngay, không cần thêm gì.
- **Hệ thống màn (view)**: cột phải render theo `ui.currentView` (`'dashboard' | 'feed' | 'matrix' | 'cart' | 'settings' | 'trash'`) trong `App.jsx`. Thêm màn mới = thêm giá trị `'duplicates'` + một khối render.
- **Cài đặt** (`SettingsPage.jsx`): danh sách "Row"; "Quản lý phân loại"/"Quản lý tag" mở qua prop `onManageCategories`/`onManageTags`. Thêm Row mới theo đúng khuôn.
- **Xuất `.tex`**: `buildProblemTex.js`/`buildContentFile.js` **không tham chiếu** gì ở luồng này. ⇒ tính năng không thể làm hỏng đường xuất.

## 5. Thiết kế chi tiết

### 5.1 Thuật toán quét — `src/utils/scanDuplicates.js` (util THUẦN mới, có test)
- **Tách riêng, thuần, testable**; **KHÔNG sửa `findDuplicates.js`** (để đường thêm-bài byte-identical). Có test khoá kết quả **khớp** `calculateSimilarity` trên mẫu.
- **Tối ưu**: precompute **1 lần/bài** phần chuẩn-hoá + tập bigram cho *đề* và *lời giải*, rồi so từng cặp bằng giao tập. O(n) tiền xử lý + O(n²) giao tập. Ở 73 bài: tức thời; ở 2000 bài: chấp nhận được vì **chỉ chạy khi bấm** (kèm trạng thái "Đang quét…").
- **Hàm**:
  - `normalizeForSim(str)` → chuỗi `toLowerCase()` đã bỏ `\s+` (khớp `calculateSimilarity`).
  - `bigramSet(clean)` → `Set` bigram ký tự (rỗng nếu <2 ký tự).
  - `diceOfSets(cleanA, setA, cleanB, setB)` → hệ số: `0` nếu một chuỗi rỗng; `1` nếu `cleanA===cleanB`; `<2 ký tự` → `0` (trừ khi bằng nhau); ngược lại `2·|∩|/(|A|+|B|)`. *(Tái lập đúng nhánh của `calculateSimilarity`.)*
  - `scanDuplicates(problems, threshold)` → **mảng NHÓM**:
    1. Tiền xử lý: mỗi bài → `{ id, ref, stmtClean, stmtBg, solClean, solBg }` (`ref` = object bài gốc).
    2. Duyệt mọi cặp `i<j`; tính `stmtSim`, `solSim`; nếu `stmtSim ≥ threshold || solSim ≥ threshold` → là **cạnh** `{ aId, bId, stmtSim, solSim }`.
    3. **Union-Find** gộp các bài nối nhau thành **cụm liên thông** (A~B, B~C ⇒ nhóm {A,B,C} dù A,C có thể dưới ngưỡng).
    4. Mỗi nhóm (≥2 bài): `{ members: [bài…], pairs: [cạnh trong nhóm], maxStmtSim, maxSolSim }`. `members` xếp theo `dateAdded` **tăng dần** (bài cũ trước → Thầy dễ thấy bản gốc vs bản nhập lại).
    5. Mảng nhóm xếp theo `max(maxStmtSim, maxSolSim)` **giảm dần** (cặp chắc-trùng nhất lên đầu).
  - Bài `statement`/`solution` rỗng/thiếu: xử lý an toàn (không ném lỗi; hai lời giải cùng rỗng KHÔNG bị gộp vì sim=0).

### 5.2 Màn kết quả — `src/components/DuplicateScanPage.jsx` (màn mới, `currentView='duplicates'`)
- **Props**: `problems` (mảng bài sống), `onPreview(prob)`, `onDelete(id)`, `onBack()`.
- **Tự quét khi mở**: `useEffect` lúc mount → đặt `scanning=true`, nhường 1 nhịp cho giao diện vẽ "Đang quét…" rồi tính `scanDuplicates(problems, threshold)` (đọc ngưỡng từ `localStorage['pb-dup-threshold']`, cùng logic `checkDuplicate`), lưu vào state `groups`, `scanning=false`. Nút **"Quét lại"** chạy lại với `problems` hiện tại.
- **Bố cục**:
  - **Thanh đầu**: nút ← "Cài đặt" (`onBack`) · tiêu đề "Quét trùng toàn kho" · nhãn "Ngưỡng: N%" · nút **"Quét lại"**.
  - **Dòng tóm tắt**: "Tìm thấy X nhóm nghi trùng (Y bài)" hoặc trạng thái rỗng.
  - **Danh sách nhóm**: mỗi nhóm là một khối:
    - Tiêu đề nhóm: "Nhóm k · Đề {maxStmtSim}% · Lời giải {maxSolSim}%".
    - Từng **bài** trong nhóm: đề render LaTeX rút gọn (`MathText`/`LatexBlockRenderer`, cuộn trong ~4–5 dòng) + dòng phụ "Thêm {dateAdded}" + phân loại gọn nếu có (tái dùng `classification.js` như thẻ) + nút **[Xem đầy đủ]** (`onPreview`) và **[Xoá]** (`onDelete`).
  - **Rỗng**: "Không tìm thấy bài nào nghi trùng ở ngưỡng N%." + gợi ý: "Muốn bắt cả bài gần giống, hạ ngưỡng trong Cài đặt rồi Quét lại."
- **Xoá cập nhật TẠI CHỖ (không tự quét lại)** — chốt brainstorm 4(b):
  - Bấm [Xoá] → gọi `onDelete(id)` (xoá mềm + toast Hoàn tác qua đường App). Đồng thời **loại `id` khỏi `groups` cục bộ**: bỏ bài khỏi `members`; **nhóm còn <2 bài thì bỏ nhóm**.
  - KHÔNG tự quét lại khi `problems` đổi (tránh màn nhảy loạn khi đang dọn). Muốn rà mới → "Quét lại".
  - *(Nếu Thầy bấm Hoàn tác: bài trở lại kho nhưng KHÔNG tự chèn lại vào nhóm đang xem — "Quét lại" sẽ thấy. Chấp nhận, nhất quán với cách Thùng rác/khôi phục không tự nhét lại giỏ.)*
- **Gom nhóm thay vì từng cặp** — chốt brainstorm 4(a): dùng cụm liên thông (5.1). Thực tế 85% hầu hết nhóm 2 bài.

### 5.3 Mở từ Cài đặt + ráp vào App
- **`SettingsPage.jsx`**: thêm Row "Quét trùng toàn kho" (icon `Copy`/`CopyCheck` hoặc `ScanSearch` của lucide) với nút "Mở" gọi prop mới `onScanDuplicates` (song song `onManageTags`).
- **`App.jsx`**:
  - Truyền `onScanDuplicates={() => ui.setCurrentView('duplicates')}` vào `SettingsPage`.
  - Thêm khối render `ui.currentView === 'duplicates'` →
    ```jsx
    <DuplicateScanPage
      problems={problems}
      onPreview={(prob) => ui.setSelectedPreview(prob)}
      onDelete={handleDeleteWithUndo}
      onBack={() => ui.setCurrentView('settings')}
    />
    ```
  - **Rút gọn DRY**: tách khối `DataGrid onDelete` (dòng ~245) thành hàm `handleDeleteWithUndo(id)` trong `App`, dùng chung cho DataGrid **và** DuplicateScanPage (không lặp logic xoá+Hoàn tác). Đây là thay đổi hành vi **trung tính** với DataGrid (cùng mã, chỉ đổi chỗ đặt).
- **NavRail**: KHÔNG thêm mục (Thầy chọn mở từ Cài đặt). Khi ở màn `duplicates` không có mục nav nào sáng — chấp nhận; nút ← đưa về Cài đặt.
- **`useUIState.js`**: cập nhật chú thích danh sách `currentView` thêm `'duplicates'` (không thêm state mới — vẫn dùng `currentView`/`setCurrentView` sẵn có).

### 5.4 Độ tin cậy (bám Đợt A #1)
- Màn quét **chỉ đọc** + **xoá mềm qua đường App đã báo lỗi thật** (`deleteProblem` trả `true/false`; hỏng → toast lỗi, không báo giả). Không thêm đường ghi mới.
- Không đụng `problemWrites.js`/`useProblems` ghi (trừ việc *dùng lại* `deleteProblem`/`restoreProblem` đã có).

## 6. Guardrail (an toàn)
- ❌ **KHÔNG đổi schema DB**, không thêm bảng/cột, không migration.
- ❌ **KHÔNG đụng đường xuất `.tex`**: `buildProblemTex.js`/`buildContentFile.js` giữ nguyên byte-for-byte ⇒ **golden-file test KHÔNG đổi**.
- ❌ **KHÔNG sửa `findDuplicates.js`** (đường cảnh báo lúc thêm giữ nguyên). Thuật toán quét là **util mới** riêng.
- ❌ **KHÔNG đụng Rust**, không thêm thư viện.
- ✅ Xoá = **xoá mềm** (Thùng rác, Hoàn tác) — không xoá cứng từ màn quét.
- ✅ Chỉ quét **bài sống** (App truyền mảng `problems` đã lọc `deletedAt IS NULL`).

## 7. Kiểm thử
- **`scanDuplicates.test.js`** (hàm thuần):
  - Hai bài **đề y hệt** → 1 nhóm 2 bài, `stmtSim=1.0`.
  - Đề khác nhưng **lời giải y hệt** ≥ ngưỡng → vẫn gộp (logic OR).
  - Cặp **dưới ngưỡng** → 0 nhóm.
  - **Bắc cầu**: A~B, B~C (đều ≥ ngưỡng) → **một** nhóm {A,B,C} (union-find), kể cả khi A,C dưới ngưỡng.
  - **Xếp nhóm** theo sim giảm dần; **members** theo `dateAdded` tăng dần.
  - **An toàn rỗng**: bài `statement`/`solution` rỗng không ném lỗi; hai lời giải cùng rỗng KHÔNG bị gộp.
  - **Khớp công thức**: `diceOfSets`/`scanDuplicates` cho cùng giá trị `calculateSimilarity` trên vài cặp mẫu (khoá không lệch thuật toán giữa hai đường).
  - Không tự-ghép (chỉ cặp `i<j`); một bài chỉ nằm dưới-ngưỡng ⇒ không vào nhóm nào.
- **Regression**: chạy full test; **`buildContentFile` golden KHÔNG đổi**; `CI=true npm run build` **0 warning**.
- **GUI** (cần Tauri + SQL ⇒ Claude không tự kiểm được → **Thầy nghiệm thu** trong `npx tauri dev`), checklist:
  - Cài đặt → "Quét trùng toàn kho" → mở màn; tự quét; hiện **đúng cặp bài số-nguyên-tố trùng 100%** (nhóm 1 bài, "Đề 100% · Lời giải 100%", 2 bài ghi ngày 25/06 và 28/06).
  - [Xem đầy đủ] mở PreviewModal đúng bài; [Xoá] → bài vào Thùng rác + toast **Hoàn tác**; nhóm còn 1 bài tự biến mất.
  - Bấm **Hoàn tác** → bài trở lại (kiểm màn Bài / Quét lại thấy lại).
  - "Quét lại" chạy lại; nút ← về Cài đặt.
  - **An toàn LaTeX**: sau khi xoá 1 bài trùng, xuất `.tex` một đề bất kỳ → công thức nguyên vẹn (đường xuất không dính).
  - (tuỳ) Hạ `pb-dup-threshold` xuống 70% trong Cài đặt → Quét lại → thấy ~6 cặp (kiểm ngưỡng đọc đúng).

## 8. Những gì KHÔNG làm đợt này (chốt để tránh phình)
- Gộp/hợp-nhất hai bài thành một tự động; sửa nội dung bài từ màn quét.
- Chỉnh ngưỡng ngay trên màn quét (đã chốt dùng ngưỡng Cài đặt).
- Xoá cứng từ màn quét (chỉ xoá mềm).
- Lưu lịch sử các lần quét; đánh dấu "đã bỏ qua nhóm này".
- Quét trùng nội bộ một mẻ Smart Import (kiểm trùng-với-kho khi Import đã có từ NK21).

## 9. Backlog / mở rộng sau
- Nút "Bỏ qua nhóm này" (ẩn cặp Thầy xác nhận không trùng) + nhớ lựa chọn.
- Gộp thông minh: giữ 1 bài, chuyển phân loại/tag của bài kia sang trước khi xoá.
- Quét trùng nội bộ mẻ Import; quét theo phạm vi (một hệ/một nhánh).
- (Đợt B khác) đợt con Ma trận v2: lưu mẫu · điểm số.

---
*Thầy đã duyệt thiết kế ("oke ạ"). Bước tiếp: lập Plan (writing-plans) chia task app-chạy-được-sau-mỗi-bước, rồi build.*
