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

- 🧩 **Xuất đề + đáp án riêng** — món **5/5 còn nợ** trong "5 đề xuất cải thiện" cũ. Thêm chế độ xuất tách đề và đáp án (không đụng khung xuất mặc định; canh bằng golden-file).
- 🧩 **Quản lý tag + gợi ý khi gõ** — tag hiện là chữ gõ tay ngăn bằng dấu phẩy → dễ lệch ("so hoc" vs "số học") làm phân mảnh kho. Thêm danh sách tag + gợi ý + đổi tên toàn kho.
- 🧩 **Ma trận v2** — lưu mẫu ma trận đã đặt tên, điểm số mỗi ô/tổng đề, lọc theo loại câu (TN/TL), (tuỳ) xuất kèm bảng đặc tả.
- 🧩 **Quét trùng toàn kho** — hiện chỉ kiểm trùng lúc thêm; thêm công cụ rà trùng cả kho.
- 🎨 **Chỉnh cỡ chữ / phóng to nội dung** — nội dung LaTeX nhiều, cần zoom WebView.

## Đợt C — Đầu tư dài hạn *(tùy chọn · thay đổi lớn · vài tuần+)*

- ⚙️ **Đổi công cụ build CRA → Vite** — `react-scripts` đã cũ; Vite là mặc định của Tauri, dev/HMR nhanh hơn, bundle nhẹ, khởi động nhanh hơn.
- 🧩 **In / xem PDF ngay trong app** — hiện xuất `.tex` rồi tự biên dịch ngoài; xem/in PDF trong app đổi hẳn workflow nhưng nặng (cần engine LaTeX).
- ⚙️ **Tối ưu lọc khi kho lên chục nghìn bài** — `getRootHeId` chạy cho mỗi bài × mỗi lần lọc; ở 2000 bài tức thời, chỉ cần tối ưu khi thật sự lớn.
- 🧩 **Đồng bộ nhiều máy / kho dùng chung** — nếu thật sự cần dùng trên nhiều máy.

---

## Ghi chú

- **Việc ngoài roadmap đã làm (11/07/2026):** *Gập/mở cây trong Quản lý phân loại* — Thầy yêu cầu trực tiếp, không nằm trong 3 đợt; đã build + merge. Xem NK27.
- **Gợi ý bắt đầu:** Đợt A, mục #1 (chống mất dữ liệu âm thầm) trước — rủi ro thật nhất khi đang nhập data.
- Roadmap này chỉ là **thực đơn ưu tiên**; mỗi mục là một mini-project riêng, chốt thiết kế trước khi code.
