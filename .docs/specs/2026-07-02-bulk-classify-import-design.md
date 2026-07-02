# Phân loại hàng loạt trong Rà soát Import — Design Spec

**Ngày:** 02/07/2026
**Trạng thái:** Thiết kế đã chốt (Thầy duyệt 02/07/2026). Chờ lập plan → build.
**Quy trình:** Claude brainstorm + spec + plan → build → Claude check lại.
**Bối cảnh:** 1 trong 3 đề xuất cải thiện còn lại (NK21→NK23 §"3/5 đề xuất").

## Mục tiêu
Trong màn **Rà soát** của Smart Import, cho phép Thầy chọn nhiều bài vừa bóc tách rồi gán phân loại (nhánh + độ khó + lớp + tag) cho tất cả cùng lúc, thay vì phải mở bảng phân loại và tick lặp lại cho từng bài — hữu ích khi một mẻ import phần lớn cùng chủ đề/lớp/độ khó.

## Quyết định đã chốt (qua brainstorm)
1. **Phạm vi**: CHỈ trong màn rà soát Import (`SmartImportModal`, `step === 'review'`) — dữ liệu **CHƯA lưu** vào kho. KHÔNG phải sửa hàng loạt trên dữ liệu **đã có** trong app (Thầy đã xác nhận giữ 73 bài thật hiện có — không đụng tới).
2. **Cách chọn**: checkbox từng thẻ bài + nút "Chọn tất cả" (tinh thần giống thanh hàng loạt ở trang chính `DataGrid`).
3. **Ngữ nghĩa áp dụng**: **THAY THẾ toàn bộ** 4 trường phân loại (`categoryIds`/`difficultyByHe`/`gradeIds`/`tags`) của **mỗi bài đã tick** bằng giá trị chọn trong bảng dùng chung. Bài **chưa tick không đổi**.
4. **Không cần hộp xác nhận** trước khi áp dụng — dữ liệu chưa lưu, Thầy thấy và sửa lại ngay trên màn hình.
5. Sau khi áp dụng, **tự bỏ tick** (tránh áp nhầm lần 2 nếu bấm lại).

## Bối cảnh kỹ thuật (đã xác minh)
- `SmartImportModal.jsx` bước `review`: `results` = mảng `{id, rawLatex, type, cls, dup?}`; `cls = {categoryIds, difficultyByHe, gradeIds, tags}` khởi tạo **rỗng** qua `makeEmptyCls()`.
- Mỗi item hiện đang render: select loại câu, nút xoá, badge trùng (nếu có), textarea `rawLatex`, và **một `ClassificationPicker` riêng** (`value={res.cls}` / `onChange={(v) => updateResultItem(res.id, 'cls', v)}`) — đang lặp lại thao tác cho từng bài.
- `updateResultItem(id, field, value)` đã có sẵn — cách cập nhật 1 field của 1 item trong `results`.
- `handleFinalSave` đọc `item.cls` của từng item để build object lưu qua `onSave(finalProblems)` → App → `saveImportedProblems` (**không đổi gì ở bước này**).
- Mẫu thanh hàng loạt đã có ở `DataGrid.jsx` (dòng ~89–106): "Đã chọn N bài" + nút hành động + "Bỏ chọn" — tái dùng **tinh thần UI** (không tái dùng code, vì khác context/component).
- `ClassificationPicker` là component điều khiển thuần (`value`/`onChange`), không phụ thuộc vào chỗ đặt — dùng lại y nguyên cho bảng "dùng chung".

## Thiết kế

### Luồng thao tác
1. Mỗi thẻ bài trong review có thêm **1 checkbox** (góc trên thẻ, cạnh select loại câu).
2. **Thanh công cụ mới** ngay dưới banner "Hoàn tất phân tích!", TRÊN danh sách thẻ: hiện "Đã chọn N bài" (hoặc gợi ý khi N=0), nút **"Chọn tất cả"**/**"Bỏ chọn tất cả"** (đổi nhãn theo trạng thái hiện tại), nút **"Phân loại hàng loạt"** (mờ/disabled khi N=0).
3. Bấm "Phân loại hàng loạt" → mở (toggle) một khối chứa **MỘT `ClassificationPicker`** dùng chung (state `bulkCls`, khởi tạo rỗng) + nút **"Áp dụng cho N bài"** + nút đóng khối.
4. Bấm "Áp dụng cho N bài" → với mỗi id đang tick, `results[i].cls = bulkCls` (thay thế toàn bộ). Đóng khối bulk picker, bỏ tick toàn bộ (`selectedForBulk = []`).
5. Thầy thấy ngay từng thẻ đã được điền `ClassificationPicker` riêng theo đúng lựa chọn — vẫn sửa tay từng bài như bình thường nếu có bài lệch (vd 1 bài khó hơn hẳn phần còn lại).

### State mới (cục bộ trong `SmartImportModal`, KHÔNG đụng `ui.selectedIds` của trang chính)
- `selectedForBulk` — mảng id đang tick trong review.
- `bulkCls` — object phân loại tạm cho bảng dùng chung (dùng chung shape với `cls`: `{categoryIds, difficultyByHe, gradeIds, tags}`).
- `showBulkPicker` — cờ đang mở/đóng khối bảng dùng chung.

### Giao diện
- Checkbox mỗi thẻ: góc trên thẻ, cạnh select "Tự luận/Trắc nghiệm...".
- Thanh công cụ: style nhất quán các khối sẵn có trong `SmartImportModal` (bo góc, viền, nền `--color-surface`); nút dùng class `card-btn`/`card-btn-primary` sẵn có toàn app.
- Khối bulk picker: hộp mở/thu ngay dưới thanh công cụ, viền `--color-cobalt` nhẹ để phân biệt với các thẻ bài phía dưới.

### Phạm vi code
**CHỈ sửa `src/components/Modals/SmartImportModal.jsx`.** KHÔNG đụng `useProblems.js`, KHÔNG Rust, KHÔNG schema, KHÔNG `buildProblemTex`/`buildContentFile` → **golden export giữ nguyên tuyệt đối**. Không cần util mới (logic áp dụng chỉ là 1 phép `map` đơn giản trên `results`, không đủ phức tạp để tách util test riêng).

### Ngoài phạm vi (YAGNI)
- Không áp dụng cho dữ liệu **đã lưu** trong kho (đó là phạm vi/tính năng khác — không làm ở đây, đã bị Thầy loại khỏi phạm vi lúc brainstorm).
- Không cho chọn áp dụng **từng trường riêng lẻ** (vd chỉ áp lớp, giữ nguyên nhánh) — áp cả 4 trường cùng lúc, thay thế toàn bộ.
- Không có hộp xác nhận (`useConfirm`) trước khi áp dụng.
- Không giữ lịch sử/undo cho thao tác này (dữ liệu chưa lưu — Thầy tự sửa lại bằng tay nếu áp nhầm, trước khi bấm "Lưu N bài vào Ngân hàng").

## Rủi ro & cách xử lý
- **Tick nhầm bài đã chỉnh tay riêng trước đó** → bị ghi đè khi áp dụng hàng loạt. Giảm thiểu: tự bỏ tick sau mỗi lần áp dụng (không tick sẵn cho lần sau); Thầy luôn thấy ngay kết quả trên từng thẻ, sửa lại được trước khi Lưu.
- **Không ảnh hưởng dữ liệu đã lưu** (73 bài thật hiện có) vì toàn bộ thao tác chỉ trong state `results` cục bộ của modal, trước khi bấm "Lưu N bài vào Ngân hàng" — đúng luồng `handleFinalSave`/`saveImportedProblems` hiện có, không đổi.

## Tiêu chí nghiệm thu (cho bước Claude check lại)
- Import 1 file có ≥3 bài → ở review, tick 2/3 bài → mở "Phân loại hàng loạt" → chọn 1 nhánh + độ khó + lớp + tag → Áp dụng → **đúng 2 bài đã tick** có phân loại đó; bài thứ 3 **vẫn rỗng như cũ**.
- "Chọn tất cả" → tick hết → Áp dụng → **cả 3 bài** nhận cùng phân loại.
- Sau khi Áp dụng, sửa tay riêng 1 bài (mở `ClassificationPicker` của bài đó, đổi khác) → **không ảnh hưởng** các bài khác.
- Lưu vào Ngân hàng như bình thường → phân loại đúng như đã thấy trên màn rà soát (không có gì khác biệt ở bước lưu, không đụng `saveImportedProblems`).
- `npm run build` 0 warning; **golden export `.tex` giữ nguyên** (không đụng `buildProblemTex`/`buildContentFile`).
