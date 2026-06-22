# Thiết Kế: GIAI ĐOẠN 2 — Danh Sách Kiểu Thẻ (Card Feed)

## 1. Thông tin chung
- **Ngày**: 22/06/2026
- **Trạng thái**: Đã chốt qua phiên brainstorm chi tiết (skill `brainstorming` + `problem-bank-ui`) — chờ Thầy duyệt tài liệu này trước khi lập **build plan** GĐ2.
- **Phạm vi**: Dựng lại **lớp giao diện danh sách + luồng đọc/giỏ** của app. **KHÔNG** đụng nội dung LaTeX, logic bóc tách, logic xuất `.tex`, schema taxonomy, hay nghiệp vụ.
- **Bối cảnh**: Nối tiếp **GĐ1 (Nền tảng) đã hoàn tất** (Task 1–10, nhật ký `.docs/09_2026_06_22.md`). GĐ2 tái dùng toàn bộ nền GĐ1: font Inter/JetBrains Mono, tokens CSS, `LatexBlockRenderer`, logic đọc phân loại trong Preview.
- **Tài liệu gốc**: spec 3 giai đoạn [.docs/specs/2026-06-21-ux-overhaul-design.md](2026-06-21-ux-overhaul-design.md) (mục 7).

## 2. Mục tiêu GĐ2
Biến danh sách từ **bảng dày in LaTeX thô** (đã render ở GĐ1) thành **feed thẻ full-width, cuộn vô tận**, mỗi bài dẫn bằng **đề render**, đọc rõ trong một liếc, thao tác chọn/giỏ/xuất ít bước. Trả lại không gian full-width cho danh sách bằng cách đưa **Xem trước** và **Giỏ** ra **lớp phủ / trang riêng** thay vì panel cố định chiếm nửa màn.

## 3. Nguyên tắc nền (kế thừa GĐ1 + skill `problem-bank-ui`)
- Hệ thiết kế: nền trắng-ấm `#FAFAF9` + slate + **một** màu nhấn xanh `#3B82F6`; chữ Inter (nội dung) + JetBrains Mono (mã); công thức render bằng KaTeX (qua `LatexBlockRenderer`/`MathText`, đã `throwOnError:false`); lưới 8px; icon Lucide.
- Thứ tự ưu tiên: ① Dễ đọc → ② Bàn-phím → ③ Mật độ → ④ Nhất quán → ⑤ Trạng thái rỗng → ⑥ Tương phản ≥4.5:1 → ⑦ Hover → ⑧ Lỗi → ⑨ Dark mode (để sau) → ⑩ Animation nhẹ.
- Luật **"Teach Me Why"**: mỗi quyết định kèm lý do (ghi trong tài liệu này).

## 4. Các quyết định đã CHỐT (bảng tổng)

| # | Hạng mục | Chốt |
|---|---|---|
| 1 | Danh sách | Card feed full-width, cuộn vô tận (`TableVirtuoso` → `Virtuoso`, cùng `react-virtuoso`) |
| 2 | Thẻ — 3 vùng tách màu (**Phương án C**) | **ĐỀ** nổi trong khung trắng trên "khay" slate-50 → **Phân loại+tag** trên khay → **Nút** ở footer slate-100 |
| 3 | Phân loại | Nhóm theo **hệ**: mỗi hệ một dòng = trọn đường cây `Hệ › … › nhánh` + **badge độ khó bên phải**; độ khó hiện **một lần/hệ** |
| 4 | Đề dài | Vùng đề cao tối đa **~5 dòng**; quá thì **cuộn trong vùng đề** (rê chuột vào vùng đề để cuộn; ra ngoài cuộn cả trang) |
| 5 | Chọn bài | **Bấm thân thẻ = chọn/bỏ chọn** (không phải nút); ≥1 bài chọn → **thanh hành động hàng loạt tự sáng** (Thêm N giỏ / Xoá N / Bỏ chọn). **Bỏ** nút "Chọn nhiều" và ô tick rê-chuột |
| 6 | Mở đọc 1 bài | Chỉ qua nút **"Xem đầy đủ"** (vì bấm thân thẻ đã dành cho chọn) |
| 7 | Hàng nút | Trái `[Xem đầy đủ] [Lời giải] [Mã LaTeX]` · Phải `[Thêm giỏ] [Sửa] [Xoá]`. **Bỏ** nút Nguồn + vạch màu trái |
| 8 | Mã LaTeX | **1 bấm = chép trọn khối** `\begin{bt}…\end{bt}` của bài đó (helper tách từ `handleFinalExport`, **byte-identical**) |
| 9 | Xem đầy đủ | **Hộp thoại giữa màn** (như modal Thêm bài), tái dùng `PreviewPanel`; thêm **Chép Mã LaTeX** + **bật/tắt lời giải**; đóng bằng `Esc`/bấm nền |
| 10 | Giỏ | **Trang riêng chiếm trọn màn** (công tắc `Danh sách bài \| Giỏ đề`), tái dùng `CartPanel` + `ExportModal`; **badge số bài, chỉ hiện khi >0** |
| 11 | Thêm giỏ | Toast "Đã thêm" + **tăng badge**, **KHÔNG** nhảy trang (khỏi ngắt mạch chọn bài) |
| 12 | Cầu nối GĐ3 | Công tắc 2 tab là bản tạm; GĐ3 nâng thành **nav rail** đầy đủ (thêm Quản lý phân loại, Cài đặt, Template…) |

## 5. Giải phẫu thẻ (chi tiết) — Phương án C

Từ trên xuống, mỗi thẻ là một khối bo góc `--radius-md`, viền `--color-border`, **nền khay** `--color-surface-sunken` (slate-50):

1. **Vùng ĐỀ** — khung trắng `--color-surface` (#FFF) **nổi trên khay**, viền `--color-border`, bo `--radius-md`, đệm trong. Render đề bằng `LatexBlockRenderer`. Cao tối đa ~5 dòng → vượt thì `overflow-y:auto` (cuộn trong khung).
   - > 💡 **Vì sao đề trên nền trắng riêng:** công thức toán (phân số, chỉ số dưới) cần tương phản cao nhất; tách đề ra khung trắng nổi trên khay xám khiến đề là "nhân vật chính", đồng ngôn ngữ với khung Xem trước → nhất quán.
2. **Vùng LỜI GIẢI (tùy chọn, bung tại chỗ)** — ẩn mặc định; bấm `[Lời giải]` thì hiện khung xanh lá ngay dưới đề: nền `--color-solution-bg`, viền `--color-solution-border`, nhãn "Lời giải." màu `--color-solution-text`. (Cùng màu với khung lời giải trong Xem trước.)
3. **Vùng PHÂN LOẠI + TAG** — đặt thẳng trên khay (không khung trắng). Mỗi **hệ** một dòng `display:flex; justify-content:space-between`:
   - Trái: đường cây `Hệ › … › nhánh` — tên **hệ** đậm `--color-text` (medium), các nhánh `--color-text-subtle`, dấu `›` màu `--color-text-faint`.
   - Phải: **badge độ khó** của hệ đó (nền `--color-diff-bg`, chữ `--color-diff-text`, viền `--color-diff-border`).
   - Một hệ nhiều chuyên đề → nhiều dòng cây, **badge độ khó vẫn 1 lần/hệ** (độ khó định theo hệ).
   - Dưới cùng: dòng chân **loại câu · lớp · tag** màu `--color-text-muted`; tag màu `--color-tag-text`.
4. **Vùng NÚT (footer)** — nền `--color-surface-muted` (slate-100), kẻ trên `--color-border` 1px. Trái 3 nút đọc/giải/chép, phải 3 nút giỏ/sửa/xoá. Nút kiểu ghost; "Thêm giỏ" nhấn xanh nhẹ; "Xoá" màu nguy hiểm.
   - > 💡 **Vì sao footer xám đậm hơn khay:** tách bạch "nội dung" (đề/khay) với "công cụ" (nút) bằng bậc màu + kẻ đậm 1px, để mắt lướt feed không lẫn vùng đọc với vùng thao tác.

**Trạng thái thẻ được chọn**: viền `--color-accent` + ring `box-shadow:0 0 0 1px accent` (không tô nền rực để khỏi đè 3 vùng) + dấu tích `CheckCircle` xanh góc trên phải.

## 6. Bảng màu GĐ2 (tokens cần thêm vào `:root` của `index.css`)

Giữ nguyên token GĐ1; **thêm** các token theo nghĩa sau (đặt sẵn khe dark mode, chưa bật):

```css
/* Bề mặt phụ */
--color-surface-sunken: #F8FAFC;  /* slate-50  — "khay" thẻ, nền vùng phân loại */
--color-surface-muted:  #F1F5F9;  /* slate-100 — footer nút */
/* Chữ phụ trợ (đường cây) */
--color-text-subtle:    #475569;  /* slate-600 — nhánh con trong đường cây */
--color-text-faint:     #94A3B8;  /* slate-400 — dấu › phân cách, marker */
/* Badge độ khó (hổ phách) */
--color-diff-bg:        #FEF3C7;  /* amber-100 */
--color-diff-text:      #92400E;  /* amber-800 — tương phản ~6.6:1 */
--color-diff-border:    #FDE68A;  /* amber-200 */
/* Khung lời giải bung tại chỗ (giống Xem trước) */
--color-solution-bg:    #F0FDF4;  /* green-50  */
--color-solution-border:#BBF7D0;  /* green-200 */
--color-solution-text:  #15803D;  /* green-700 */
```

Token đã có dùng lại: `--color-bg #FAFAF9`, `--color-surface #FFF`, `--color-border #E2E8F0`, `--color-text #1E293B`, `--color-text-muted #64748B`, `--color-accent #3B82F6` (+`-hover #2563EB`), `--color-tag-bg #EFF6FF`, `--color-tag-text #1D4ED8`, `--color-danger #EF4444`, `--color-success #22C55E`.

> 💡 **Vì sao thêm token thay vì hex rời:** đúng luật "không hardcode hex trong component"; tên theo nghĩa (sunken/muted/diff/solution) để GĐ-sau bật dark mode chỉ cần đổi giá trị tại một nơi.

**Kiểm tra tương phản (≥4.5:1):** đề slate-800/trắng ~13.6:1; nhánh slate-600/slate-50 ~7.5:1; footer slate-500/slate-100 ~4.7:1; badge amber-800/amber-100 ~6.6:1; tag blue-700/blue-50 ~7:1; lời giải green-700/green-50 ~5:1. Tất cả đạt.

## 7. Lớp phủ "Xem đầy đủ" (hộp thoại giữa màn)
- Mở khi bấm nút **[Xem đầy đủ]** trên thẻ. Là **modal trong-app** (overlay nền mờ + hộp giữa, max-width ~720px), **không** mở cửa sổ Tauri thứ hai (tránh đồng bộ state — tin-cậy > tính-năng).
- **Tái dùng `PreviewPanel`** gần như nguyên trạng (đã render đủ Tự luận / Trắc nghiệm / Đúng-Sai / Trả lời ngắn / lời giải; đã đọc đúng `categoryIds/difficultyByHe/gradeIds` từ GĐ1) — chỉ **bọc** vào khung modal thay vì panel phải.
- Thêm 2 affordance: **[Chép Mã LaTeX]** (dùng chung helper ở mục 9) và **[Ẩn/Hiện lời giải]**.
- Đóng bằng nút `×`, phím `Esc`, hoặc bấm nền mờ.
- > 💡 **Vì sao hộp giữa (không drawer):** đọc sâu một bài là thao tác "tập trung"; hộp giữa + nền mờ cắt nhiễu, đúng tinh thần focus-mode; lại đồng dạng modal Thêm/Sửa nên nhất quán.

## 8. Trang "Giỏ đề" (trang riêng) + công tắc chuyển trang
- **Công tắc** đặt đầu màn: hai mục `[Danh sách bài] | [Giỏ đề (N)]` (kiểu Mail/Chat/Meet của Gmail — bấm đổi **trọn** màn). Mục Giỏ có **badge số bài**, **chỉ hiện khi N>0**.
- Trang **Giỏ đề** chiếm trọn vùng nội dung: tiêu đề "Giỏ đề thi · N bài", nút **[Làm sạch]** + **[Xuất đề (.tex)]**, danh sách bài đã chọn (#1, #2…) có nút gỡ từng bài. **Tái dùng `CartPanel`** (đưa từ panel 40% ra thành trang) + **`ExportModal`** (giữ nguyên cấu hình tên trường/tiêu đề/thời gian/trộn/kèm lời giải).
- Quản lý bằng **state `currentView: 'feed' | 'cart'`** (thay cho `isCartOpen` panel cũ). Đây là **mầm của nav rail GĐ3**.
- > 💡 **Vì sao trang riêng (không panel/drawer):** trả full-width cho feed; giỏ là "bàn soạn đề" cần không gian rộng để xem thứ tự; tách trang giúp GĐ3 nâng thẳng lên nav rail mà không phải làm lại.

## 9. Nút "Mã LaTeX" + helper dùng chung
- **Hành vi**: 1 bấm = chép trọn khối `\begin{bt} … \end{bt}` của **đúng bài đó** vào clipboard + toast "Đã chép mã LaTeX".
- **Kỹ thuật**: rút đoạn dựng mỗi-bài trong `App.handleFinalExport` (dòng `% Câu … \begin{bt} … \choice … \loigiai … \end{bt}`) thành **helper dùng chung** `buildProblemTex(item, { includeSolution })` (đặt ở `src/utils/`). Cả **Xuất đề** lẫn **nút Mã LaTeX** và **Xem đầy đủ** gọi cùng helper. **Không đổi định dạng đầu ra.**
- > 💡 **An toàn tuyệt đối:** vì cùng một helper sinh ra khối bài cho cả xuất file lẫn nút chép, đầu ra **giống hệt** — chứng minh bằng kiểm thử ở mục 12.

## 10. Mô hình chọn bài + thanh hành động hàng loạt
- Bấm **bất kỳ chỗ nào của thẻ không phải nút** → toggle chọn bài (`selectedIds`, đã có). Thẻ chọn: viền/ring xanh + dấu tích.
- Nút trong thẻ chặn nổi bọt sự kiện (không kích hoạt chọn).
- **Thanh hành động** (thay khu bulk cũ ở Toolbar): luôn hiển thị; khi `selectedIds.length === 0` → mờ + vô hiệu, chữ gợi ý "Bấm vào thẻ để chọn…"; khi ≥1 → sáng, nút **[Thêm N vào giỏ] [Xoá N] [Bỏ chọn]** (tái dùng `handleBulkAddToCart`, `handleBulkDelete`).
- Cuộn trong vùng đề (đề dài) dùng con lăn; bấm (không kéo) mới toggle chọn → không xung đột.
- > 💡 **Vì sao bấm thẻ = chọn:** trên feed, chọn-nhiều-để-gom-giỏ/xoá là thao tác chính & lặp nhiều; biến cả thẻ thành vùng chọn giảm số lần nhắm chuột; đọc sâu (ít hơn) tách ra nút riêng.

## 11. Những gì KHÔNG thay đổi
- **Đề bài LaTeX & lời giải** — không đụng.
- **Bóc tách LaTeX khi nhập** + nội dung mỗi bài (`\begin{bt}`, `\choice`, `\loigiai`, công thức) — giữ nguyên.
- **Xuất `.tex`**: khung tài liệu mặc định giữ nguyên; chỉ **tách helper dựng khối mỗi-bài ra dùng chung**, đầu ra byte-identical.
- **Schema + nghiệp vụ** (`useProblems`, `useTaxonomy`, `useCart`) — giữ nguyên. **Không thêm trường dữ liệu mới.**
- **Loại câu**, **tag tự do** — giữ.

## 12. Kiểm thử (verification) — bắt buộc trước khi xong
- **Biên dịch**: `$env:CI="false"; npm run build` → "Compiled successfully", **0 warning**.
- **An toàn xuất `.tex`** (quan trọng nhất): sau khi tách `buildProblemTex`, **xuất một đề mẫu và `git diff`/so byte với file xuất trước GĐ2** → phải **giống hệt**. Nút Mã LaTeX chép một bài cũng phải khớp đúng khối tương ứng trong file xuất. Thầy nghiệm thu mẫu thực tế.
- **Trực quan** (Thầy chạy `npx tauri dev`): feed thẻ render công thức; bấm thẻ chọn + thanh hàng loạt sáng; đề dài cuộn trong thẻ; Xem đầy đủ mở/đóng; Giỏ là trang riêng + badge; Thêm giỏ chỉ toast + tăng badge.

## 13. Phần kỹ thuật (cho bước lập plan)
- **`DataGrid.jsx`**: `TableVirtuoso` → `Virtuoso`; `itemContent={(i, p) => <ProblemCard .../>}`. Tách `ProblemCard.jsx` (một thẻ) để gọn. Giữ nguyên logic lọc/sắp xếp + `getDescendantIds`.
- **Đường cây**: dựng helper leo `parent_id` từ một nhánh lá về hệ gốc để in `Hệ › … › nhánh` (dùng `getRootHeId` + `parentMap` đã có). Nhóm `categoryIds` theo hệ gốc; ghép `difficultyByHe[heId]`.
- **Tokens**: thêm khối ở mục 6 vào `:root`; thay các hex rời tương ứng trong component bằng `var(--…)`.
- **Helper xuất**: `src/utils/buildProblemTex.js` (rút từ `handleFinalExport`); `handleFinalExport` gọi lại helper (không đổi output).
- **State**: thêm `currentView` (`feed|cart`) vào `useUIState` (thay vai trò `isCartOpen`); công tắc + badge ở Header/Toolbar.
- **Xem đầy đủ**: bọc `PreviewPanel` trong khung modal dùng chung (giống `AddProblemModal`); thêm nút Chép Mã LaTeX + toggle lời giải.
- **Giỏ**: render `CartPanel` ở chế độ trang (bỏ `height:40%`/panel), thêm nút quay lại `Danh sách bài`.
- **Trạng thái rỗng**: feed ("Chưa có bài nào" / "Không khớp bộ lọc" — đã có ở GĐ1, chuyển sang `Virtuoso`); Giỏ trống ("Giỏ trống — chọn bài rồi Thêm giỏ").
- **Bàn phím**: `Esc` đóng Xem đầy đủ/Giỏ (đã có `onEscape`); cân nhắc `Delete` xoá loạt khi có chọn (đã có `onDelete`).

## 14. Để sau (không chặn GĐ2)
- Nav rail đầy đủ (GĐ3), lọc hệ-first sidebar cây (GĐ3), Template xuất Mức 2 + golden-file (GĐ3), Thùng rác (GĐ3).
- Dark mode (token đã sẵn), tách Giỏ/Xem-đầy-đủ thành cửa sổ Tauri rời, nút đổi mật độ, kéo-thả sắp thứ tự giỏ.

---
*Liên quan: [.docs/specs/2026-06-21-ux-overhaul-design.md](2026-06-21-ux-overhaul-design.md) (spec 3 giai đoạn), [.docs/09_2026_06_22.md](../09_2026_06_22.md) (nhật ký GĐ1).*
