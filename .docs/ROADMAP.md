# Roadmap cải thiện Problem Bank

- **Chốt:** 2026-07-11 (qua phiên brainstorm đọc lại toàn bộ codebase)
- **Người duyệt:** Thầy Sơn
- **Lựa chọn định hướng:** *Cân bằng cả 3 mặt* — tính năng + UX/UI + hiệu năng/độ tin cậy, chia đợt để chọn lọc.
- **Tính chất:** tài liệu SỐNG — mỗi mục khi làm sẽ đi qua brainstorm → spec → plan → build riêng (đúng nếp dự án).

---

## Bối cảnh (để đọc roadmap cho đúng)

App đã **trưởng thành**: đóng gói **v1.1.0**, đang có **~73 bài thật**, nền tảng đầy đủ (taxonomy, lọc hệ-first, thùng rác, auto-backup, khôi phục, dark mode, nhập AI, tìm kiếm sâu, cảnh báo trùng, tách hình, editor LaTeX, thống kê, tạo đề theo ma trận). Đường xuất `.tex` được khoá bằng golden-file test.

**Nói thẳng về "hiệu năng":** ở quy mô ~2000 bài, hiệu năng **gần như không phải vấn đề** (đã virtualize + memo hoá tốt). "Tối ưu hiệu năng" ở đây thực chất là **độ tin cậy** + tốc độ khởi động/đóng gói + công cụ build, KHÔNG phải tối ưu thuật toán cho 100k (chỉ cần khi kho thật sự phình to).

**Ký hiệu trục:** 🧩 Tính năng · 🎨 UX/UI · ⚙️ Hiệu năng & Tin cậy.

---

## Đợt A — Nền tảng tin cậy *(rủi ro thấp · giá trị ngay · ~1–2 tuần)*

- ⚙️ **[Ưu tiên #1] Chống mất dữ liệu âm thầm — báo lỗi khi lưu/xuất.**
  Phát hiện từ code: `addProblem`/`updateProblem`/`saveImportedProblems` khi lưu **thất bại chỉ `console.error`** (`useProblems.js`), trong khi App vẫn hiện toast *"Đã thêm bài tập!"*. Nếu ổ D trục trặc / DB khoá / đĩa đầy → Thầy thấy "thành công" nhưng bài **không được lưu**. Sửa: chỉ báo thành công khi ghi DB thật sự xong; thất bại thì báo lỗi rõ.
- ⚙️ **Đóng gói lại v1.2** — nhiều tính năng mới (auto-backup, bulk-classify, ma trận, editor, gập cây…) hiện chỉ chạy qua `npx tauri dev`, chưa có trong bản cài `.msi/.exe` v1.1.0.
- 🎨 **Điều hướng bàn phím + chọn dải trong feed** — hiện `onSelectAll` là hàm rỗng; chưa có mũi tên duyệt / shift-click chọn dải. Giúp nhập liệu nhanh.
- 🎨 **Hoàn thiện dark mode** — `PreviewPanel` (Xem đầy đủ) còn màu hex cứng → lệch màu ở chế độ tối; rà soát nốt các hex còn sót.
- ⚙️ **Dọn cột "đã dùng" chết (`timesUsed`)** — cột luôn = 0, không ai cập nhật; gây hiểu nhầm. Dọn cho sạch.

## Đợt B — Lấp khoảng trống tính năng *(~2–4 tuần)*

- 🧩 ~~**Xuất đề + đáp án riêng**~~ — **ĐÃ BỎ (14/07/2026, NK31)**: Thầy dùng gói LaTeX `ex-test` đã tách sẵn đề/đáp án, app không cần đụng. Món "5/5 nợ cuối" coi như đóng.
- 🧩 **Quản lý tag + gợi ý khi gõ** — *(XONG 15/07/2026, NK32; spec+plan `2026-07-14-quan-ly-tag-goi-y*`)*. Ô nhập tag kiểu **viên/chip + gợi ý** (khớp không dấu), **lọc bài theo nhiều tag (VÀ/HOẶC)**, màn **quản lý tag** (danh sách + số bài, đổi tên/gộp/xoá toàn kho). Không đổi schema; xuất `.tex` không đổi. *(Bỏ: gộp-nhiều-tag một lượt — đổi-tên-thành-tên-đã-có là đủ.)*
- 🧩 **Ma trận v2** — *(đợt con 1 — thêm chiều **Loại câu** vào lưới bốc câu: **XONG 14/07/2026, NK31**, spec+plan `2026-07-14-ma-tran-v2-loai-cau*`)*. Còn: lưu mẫu ma trận đã đặt tên, điểm số mỗi ô/tổng đề. ~~(tuỳ) xuất kèm **bảng đặc tả**~~ — **ĐÃ BỎ (14/07/2026): Thầy chốt không cần.**
- 🧩 **Quét trùng toàn kho** — *(XONG 15/07/2026, NK33; spec+plan `2026-07-15-quet-trung-toan-kho*`)*. Màn mở từ **Cài đặt**, rà cả kho (đề HOẶC lời giải ≥ ngưỡng Cài đặt), gom **nhóm liên thông**, **Xem đầy đủ + Xoá mềm (Hoàn tác)** tại chỗ. Util thuần `scanDuplicates.js` (+7 test); KHÔNG đụng `findDuplicates.js`/xuất `.tex`/schema/Rust. Kho thật có sẵn 1 cặp trùng 100% (bắt được ngay).
- 🎨 ~~**Chỉnh cỡ chữ / phóng to nội dung**~~ — **ĐÃ BỎ (14/07/2026): Thầy chốt không cần.**

## Đợt C — Đầu tư dài hạn *(tùy chọn · thay đổi lớn · vài tuần+)*

- ⚙️ **Đổi công cụ build CRA → Vite** — `react-scripts` đã cũ; Vite là mặc định của Tauri, dev/HMR nhanh hơn, bundle nhẹ, khởi động nhanh hơn.
- 🧩 **In / xem PDF ngay trong app** — hiện xuất `.tex` rồi tự biên dịch ngoài; xem/in PDF trong app đổi hẳn workflow nhưng nặng (cần engine LaTeX).
- ⚙️ **Tối ưu lọc khi kho lên chục nghìn bài** — `getRootHeId` chạy cho mỗi bài × mỗi lần lọc; ở 2000 bài tức thời, chỉ cần tối ưu khi thật sự lớn.
- 🧩 **Đồng bộ nhiều máy / kho dùng chung** — nếu thật sự cần dùng trên nhiều máy.
- ⚙️ **Ghi "trọn gói" (transaction) cho thao tác lưu** — *(bổ sung từ Đợt A #1, 13/07)*. Fix Đợt A #1 đã **phát hiện & báo lỗi** khi lưu, nhưng chưa đảm bảo *all-or-nothing*: `addProblem`/`updateProblem` ghi bảng `problems` xong mới ghi 3 bảng phân loại (nhiều bước tách rời); `saveImportedProblems` ghi theo từng chunk 50 bài. Hỏng giữa chừng → ghi dở dang (bù lại: bấm lưu lại **tự sửa** nhờ `INSERT OR REPLACE` + xoá-rồi-ghi). Vướng kỹ thuật: plugin SQL của Tauri dùng **pool kết nối** nên `BEGIN/COMMIT` thủ công không chắc ăn (2 lệnh có thể rơi vào 2 kết nối khác nhau) → cần gói transaction đúng cách (ghim 1 kết nối, hoặc đưa lệnh transaction xuống Rust). Là bước làm chắc 100% *sau khi* Đợt A #1 đã báo lỗi tin cậy.

---

## Ghi chú

- **Việc ngoài roadmap đã làm (11/07/2026):** *Gập/mở cây trong Quản lý phân loại* — Thầy yêu cầu trực tiếp, không nằm trong 3 đợt; đã build + merge. Xem NK27.
- **Gợi ý bắt đầu:** Đợt A, mục #1 (chống mất dữ liệu âm thầm) trước — rủi ro thật nhất khi đang nhập data.
- Roadmap này chỉ là **thực đơn ưu tiên**; mỗi mục là một mini-project riêng, chốt thiết kế trước khi code.
