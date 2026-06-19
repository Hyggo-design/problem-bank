# Thiết Kế: Hệ Thống Phân Loại (Taxonomy) — Problem Bank

## 1. Thông tin chung
- **Ngày**: 19/06/2026
- **Trạng thái**: Đã duyệt thiết kế (qua phiên brainstorm) — chờ Thầy review tài liệu này lần cuối trước khi lập kế hoạch xây dựng.
- **Phạm vi**: Thay thế hệ thống phân loại cũ (chuyên đề hardcode trong code) bằng một hệ thống điều khiển bằng dữ liệu, giáo viên tự sửa qua giao diện.

## 2. Mục tiêu
Cho phép Thầy tự tổ chức, sắp xếp và phân loại bài tập một cách linh hoạt, đủ sức phục vụ việc dạy **nhiều hệ** (THCS, THPT, Chuyên, Olympic) mà không phải sửa code mỗi khi muốn thay đổi cách sắp xếp. Quy mô mục tiêu ~2.000 câu trong 5 năm.

## 3. Bối cảnh & vấn đề hiện tại
- Danh sách chuyên đề đang bị **hardcode ở 3 nơi và lệch nhau**: `src/utils/constants.js`, `src/components/Modals/SmartImportModal.jsx`, `src/components/ControlsRow.jsx` (nơi này còn thiếu mục "Chưa phân loại" → không lọc được bài chưa phân loại).
- Mỗi bài chỉ gắn được **một** chuyên đề (chuỗi cố định) và **một** độ khó (Level 1–3) → không phản ánh được thực tế dạy nhiều hệ.
- **Dữ liệu hiện có chỉ là dữ liệu test** → sẵn sàng xóa sạch. **Không cần migration**; khi triển khai sẽ reset sang cấu trúc mới. Dữ liệu thật chỉ được nhập sau khi app hoàn chỉnh/đóng gói.

## 4. Các quyết định đã chốt
1. **Cây phân loại nhiều tầng tùy ý** (không giới hạn độ sâu). Tầng trên cùng = **hệ** (THCS / THPT / Chuyên / Olympic…). Ví dụ: *Toán Chuyên ▸ Hình học ▸ Tam giác đồng dạng*.
2. **Một bài gắn được NHIỀU nhánh** (kể cả thuộc nhiều hệ khác nhau) — quan hệ nhiều–nhiều.
3. **Độ khó theo từng hệ**: mỗi hệ có **thang độ khó riêng** do Thầy tự định nghĩa. Một bài thuộc 2 hệ → ghi 2 độ khó (mỗi hệ một độ khó).
4. **Lớp** là nhãn phẳng, **gắn được nhiều giá trị** (6–12), dùng chung cho mọi hệ.
5. **Tag tự do** (ô gõ comma) được **giữ lại** để ghi nguồn đề/năm/kỳ thi/từ khóa riêng.
6. **Khởi tạo mặc định**: app dựng sẵn **4 hệ trống** (Toán THCS, Toán THPT, Toán Chuyên, Olympic), mỗi hệ có sẵn thang độ khó mặc định để Thầy sửa.
7. Mọi phân loại đều **không bắt buộc** — lưu nhanh một bài chưa gắn nhánh vẫn được (nằm ở "Chưa phân loại").

## 5. Mô hình 4 chiều (tóm tắt)
Một bài tập được mô tả bởi:
- **Vị trí trong cây** (1 hoặc nhiều nhánh).
- **Độ khó** — một giá trị cho mỗi hệ mà bài thuộc về.
- **Lớp** — nhiều giá trị.
- **Tag tự do** — văn bản.

> Ví dụ một bài: gắn vào *Toán Chuyên ▸ Hình học ▸ Tam giác đồng dạng* (độ khó hệ Chuyên: Trung bình) **và** *Toán THPT ▸ Hình học phẳng* (độ khó hệ THPT: Khó); Lớp: 9, 10; Tag: "HSG Tỉnh 2023, ôn đội tuyển".

## 6. Các luồng sử dụng

### 6.1. Form Thêm/Sửa bài tập
- Phần nhập **đề bài LaTeX, lời giải, loại câu (Tự luận/Trắc nghiệm…) giữ nguyên như hiện tại**.
- Phần phân loại thay mới:
  1. **Cây có ô tick** để chọn một/nhiều nhánh, kèm **ô gõ lọc nhanh** node (gõ "đồng dạng" → nhảy tới nhánh).
  2. Sau khi tick, **hiện ô chọn độ khó cho từng hệ** mà các nhánh đã chọn chạm tới.
  3. **Lớp**: chọn nhiều (chip 6–12).
  4. **Tag tự do**: như cũ.
- Bộ điều khiển phân loại này dùng **nhất quán ở 3 nơi**: form Thêm, form Sửa, và bước rà soát của Smart Import.

### 6.2. Màn hình "Quản lý phân loại"
- **Khu cây**: liệt kê các hệ, xổ ra nhánh con. Mỗi nút: ➕ thêm nhánh con · ✏️ đổi tên · 🗑️ xóa · ⬆⬇ đổi vị trí / chuyển nhánh (dùng nút/menu, **chưa làm kéo-thả** ở v1).
- **Khu độ khó** (khi chọn một hệ): thêm/sửa/xóa/sắp thứ tự các mức độ khó của riêng hệ đó.
- **Khu Lớp**: quản lý danh sách lớp dùng chung.
- **Xóa an toàn**: xóa nhánh đang có bài → cảnh báo trước; bài **không mất**, chỉ bị gỡ nhãn.

### 6.3. Tìm & Lọc
- Lọc theo một nhánh → ra mọi bài thuộc nhánh đó **và mọi nhánh con bên dưới**.
- Lọc kết hợp: nhánh + độ khó (theo hệ) + lớp + tag + tìm kiếm văn bản (quét `statement` + `tags` như hiện tại).
- Khi không có bài khớp → hiển thị trạng thái rỗng rõ ràng.

## 7. Những gì KHÔNG thay đổi
- **Nội dung đề bài LaTeX và lời giải** — không đụng tới.
- **Tính năng xuất `.tex`** (đóng gói đề thi) — giữ nguyên hoàn toàn. *(Việc cho phép nhóm/đánh nhãn theo phân loại trong bản xuất là tính năng riêng, để sau.)*
- **Loại câu hỏi** (Tự luận/Trắc nghiệm/…) và **Tag tự do** — giữ nguyên.

## 8. Phạm vi v1 & để sau
- **Trong v1**: cây phân loại data-driven, đa nhánh; độ khó theo hệ; lớp; tag; màn hình quản lý (di chuyển bằng nút/menu); form nhập/sửa/Smart Import dùng bộ điều khiển mới; khởi tạo 4 hệ mặc định.
- **Để sau (không chặn deadline Tháng 8)**: kéo-thả sắp xếp cây; nhóm theo phân loại khi xuất đề; Backup/Restore (vẫn nằm trong roadmap tổng, nhưng không còn phải làm trước phần này vì chưa có dữ liệu thật).

---

## 9. PHẦN KỸ THUẬT (Thầy có thể bỏ qua — dành cho bước xây dựng)

### 9.1. Lược đồ cơ sở dữ liệu (SQLite)

**`categories`** — cây phân loại (adjacency list, độ sâu tùy ý):
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT PK | uuid |
| `name` | TEXT | tên nhánh |
| `parent_id` | TEXT NULL | FK → categories.id; `NULL` = nút gốc (= một hệ) |
| `position` | INTEGER | thứ tự giữa các nút cùng cấp |
| `created_at` | TEXT | ISO |

**`difficulty_levels`** — thang độ khó theo từng hệ:
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT PK | |
| `he_id` | TEXT | FK → categories.id (nút gốc/hệ) |
| `name` | TEXT | VD "Trung bình" |
| `position` | INTEGER | thứ tự |

**`grades`** — danh sách Lớp (seed 6–12, Thầy sửa được):
| `id` TEXT PK · `name` TEXT · `position` INTEGER |

**`problem_categories`** — vị trí của bài trong cây (nhiều–nhiều):
| `problem_id` TEXT · `category_id` TEXT · PK(problem_id, category_id) |

**`problem_difficulties`** — độ khó của bài theo từng hệ:
| `problem_id` TEXT · `he_id` TEXT (FK categories) · `difficulty_id` TEXT (FK difficulty_levels) · **PK(problem_id, he_id)** |
> PK (problem_id, he_id) đảm bảo "mỗi hệ một độ khó".

**`problem_grades`** — lớp của bài (nhiều–nhiều):
| `problem_id` TEXT · `grade_id` TEXT · PK(problem_id, grade_id) |

**`problems`** (bảng hiện có): giữ các cột nội dung `statement, solution, type, shortAnswer, options, tags, dateAdded, timesUsed, metadata`. Cột `topic`/`level` cũ trở thành **legacy** (vì reset dữ liệu test, có thể bỏ hẳn — quyết định ở bước lập kế hoạch).

### 9.2. Chỉ mục đề xuất
- `categories(parent_id)`; `difficulty_levels(he_id)`; và index trên các cột khóa của 3 bảng nối để lọc nhanh.

### 9.3. Ghi chú logic
- **Xác định hệ của một placement**: `he_id` = nút gốc (tổ tiên trên cùng) của `category_id`. UI suy ra khi lưu để biết cần hỏi độ khó cho hệ nào.
- **Lọc theo nhánh gồm con**: có thể dùng truy vấn đệ quy (recursive CTE) của SQLite, hoặc mở rộng danh sách nút con trong JS (đủ nhanh ở quy mô ~2.000). Đề xuất: JS cho đơn giản, tối ưu sau nếu cần.

### 9.4. Câu hỏi mở cho bước lập kế hoạch
1. Bỏ hẳn hay giữ legacy 2 cột `topic`/`level` trên bảng `problems`?
2. Lọc-gồm-nhánh-con: chọn recursive CTE hay mở rộng trong JS cho v1?
3. Thứ tự thực thi: dựng schema + seed 4 hệ → màn hình quản lý → bộ điều khiển phân loại trong form nhập/sửa → cập nhật lọc/tìm → cập nhật Smart Import.
