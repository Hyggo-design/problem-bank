# Đổi vị trí (sắp xếp thứ tự) trong Quản lý phân loại — Thiết kế

- **Ngày duyệt:** 19/06/2026
- **Trạng thái:** ✅ Đã duyệt
- **Liên quan:**
  - Thiết kế taxonomy gốc: [2026-06-19-he-thong-phan-loai-design.md](2026-06-19-he-thong-phan-loai-design.md)
  - Build plan taxonomy: [.docs/plans/2026-06-19-he-thong-phan-loai.md](../plans/2026-06-19-he-thong-phan-loai.md)

---

## 1. Mục tiêu

Cho phép Thầy tự sắp xếp **thứ tự hiển thị** của danh mục phân loại ngay trên màn hình "Quản lý phân loại", không cần đụng code:
- Nhánh trong **cây chuyên đề** (đổi thứ tự giữa các nhánh cùng cha).
- **Mức độ khó** của từng hệ.
- **Danh sách Lớp** (vd: kéo Lớp 5 về đầu).

Cột `position` đã có sẵn trong cả 3 bảng (`categories`, `difficulty_levels`, `grades`) và đã được dùng để `ORDER BY` khi đọc. Việc cần làm chỉ là **ghi lại `position` theo thứ tự mới** + nút bấm trên giao diện.

## 2. Tương tác (UX)

### 2.1. Gọn lại: nút hiện khi rê chuột (hover-reveal)
Hiện tại mỗi dòng luôn hiện sẵn mọi nút thao tác → rối. Đổi thành: **mọi nút thao tác của một dòng chỉ hiện khi rê chuột vào dòng đó** (gồm cả các nút sẵn có ➕ ✏️ 🔀 🗑️). Bình thường danh sách chỉ còn tên → sạch. Dòng đang rê đã có sẵn nền sáng (giữ nguyên).

### 2.2. Nút đổi vị trí
- **Cây chuyên đề** và **thang độ khó** (danh sách dọc) → thêm **⬆ / ⬇**.
- **Danh sách Lớp** (chip nằm ngang) → dùng **◀ / ▶** (dời sớm hơn / muộn hơn) cho đúng chiều layout.

### 2.3. Quy tắc
- Mục **đầu** dãy → nút lùi (⬆ / ◀) **mờ + bấm không được**; mục **cuối** dãy → nút tiến (⬇ / ▶) mờ + bấm không được.
- Bấm là **lưu ngay** vào DB; danh sách nhảy đúng chỗ tức thì (qua `reload` của `useTaxonomy`).

## 3. Phạm vi sắp xếp (nhóm "anh em")
- **Nhánh:** chỉ đổi thứ tự trong cùng `parent_id`. Chuyển sang cha khác vẫn dùng nút 🔀 "di chuyển" sẵn có.
- **Độ khó:** trong cùng `he_id`.
- **Lớp:** toàn bộ danh sách (1 nhóm phẳng).

## 4. Cách lưu dữ liệu (an toàn)
Khi đổi chỗ một mục: lấy cả nhóm anh em đang sắp theo `position`, hoán đổi mục đó với hàng xóm liền kề, rồi **đánh số lại cả nhóm `position = 0,1,2,…`** theo thứ tự mới (thay vì chỉ swap 2 con số).

- **Lợi:** tự dọn luôn mọi lệch/trùng `position` có thể tồn tại từ trước (vì `addCategory`/`addGrade` đặt position = số đếm anh em, có thể trùng sau khi xóa-rồi-thêm).
- Nhóm chỉ vài mục nên số câu UPDATE rất nhỏ.

## 5. KHÔNG đụng tới
- Bảng `problems`, 3 bảng nối (`problem_categories` / `problem_difficulties` / `problem_grades`).
- Nội dung đề bài LaTeX, lời giải, và **logic xuất `.tex`**. Đây chỉ là thứ tự hiển thị trong danh mục.

## 6. KHÔNG làm (YAGNI)
- Không kéo-thả (đã cân nhắc; với cây nhiều tầng dễ nhập nhằng "đổi thứ tự" vs "chuyển vào nhánh", rủi ro cao hơn — không hợp ưu tiên độ-tin-cậy).
- Không sắp xếp tự động (theo bảng chữ cái, theo ngày…).

## 7. Rủi ro & điểm cần kiểm tra
- **Logic đánh số lại nhóm** chạy đúng trên SQLite → verify bằng script ngoài repo (như các task taxonomy trước).
- **Hover-reveal**: nút ẩn khi không rê, nhưng phải bấm được khi đang rê (vì rê dòng → nút hiện, con trỏ vẫn trong dòng khi với tới nút).
- **Xuất LaTeX**: không liên quan, nhưng vẫn build sạch (`CI=false npm run build`) sau khi xong để chắc chắn.

## 8. Lệch so với plan taxonomy gốc
Plan gốc liệt nút ⬆⬇ vào "câu hỏi mở / hoãn ở v1". Nay Thầy quyết **đưa vào**, kèm nâng cấp **hover-reveal** để khỏi rối. Làm xen vào **trước Task 10** của plan taxonomy.
