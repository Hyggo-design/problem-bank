# Problem Bank — Ngân hàng câu hỏi

Ứng dụng **desktop** (Tauri v2 + React + SQLite) giúp giáo viên Toán **lưu trữ, phân loại và xuất** bài tập LaTeX. Dùng cá nhân, chạy offline (chỉ Smart Import cần mạng).

## Tính năng chính
- **Ngân hàng bài**: thêm/sửa/xoá bài LaTeX (đề + lời giải + đáp án trắc nghiệm); render công thức ngay trong danh sách (KaTeX); danh sách kiểu thẻ, cuộn vô tận (react-virtuoso).
- **Phân loại đa hệ**: cây chuyên đề theo từng hệ (THCS / THPT / Chuyên / Olympic) + độ khó theo hệ + lớp + tag. Lọc **hệ-first** (nav rail + cột lọc 3 cột).
- **Smart Import (AI)**: bóc tách bài từ ảnh/PDF/.tex bằng Gemini (nhập API key trong Cài đặt).
- **Xuất `.tex` theo template**: chọn file template nội dung của bạn → app điền header + chèn các bài trong giỏ → lưu file để `\input` vào `main.tex` của bạn.
- **Thùng rác** (xoá mềm, khôi phục/xoá hẳn) · **Dark mode** · **Sao lưu DB**.
- **Dữ liệu** mặc định ở `D:\0. Problems Bank\app-data\problem_bank.db` (tự về ổ C nếu không có ổ D).

## Chạy & đóng gói
```bash
npm install
npx tauri dev       # chạy app (dev) — có DB + cửa sổ thật
npm run build       # build frontend (kiểm biên dịch)
npx tauri build     # đóng gói installer (.exe/.msi) -> src-tauri/target/release/bundle/
CI=true npm test    # chạy test (golden-file cho xuất .tex)
```
> ⚠️ App **chỉ chạy đúng với `npx tauri dev`** (KHÔNG phải `npm start`) vì dùng `@tauri-apps/plugin-sql`.

## Công nghệ
React 18 · Tauri v2 (Rust) · SQLite (`@tauri-apps/plugin-sql`) · KaTeX · react-virtuoso · lucide-react · react-hot-toast.

## Tài liệu
Nhật ký phát triển + spec + build plan ở thư mục [`.docs/`](.docs/) (đánh số theo phiên).

---
*Dự án cá nhân cho giáo viên Toán.*
