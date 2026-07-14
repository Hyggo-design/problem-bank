# Thiết Kế: Ma Trận v2 — Thêm Chiều "Loại Câu" — Problem Bank

## 1. Thông tin chung
- **Ngày**: 14/07/2026
- **Trạng thái**: Đã brainstorm chi tiết + Thầy DUYỆT thiết kế (có bản phác thảo lưới trực quan). Sẵn sàng chuyển sang Plan.
- **Đợt**: Roadmap **Đợt B** (`.docs/ROADMAP.md`) — mục "🧩 Ma trận v2". Đây là **đợt con đầu tiên** của Ma trận v2 (chỉ phần *cấu trúc lưới + bốc câu*).
- **Phạm vi**: Nâng cấp **tại chỗ** trang "Tạo đề theo ma trận" hiện có. Lưới đổi từ **Chủ đề × Mức độ** → **Chủ đề × Loại câu × Mức độ**, khớp khuôn ma trận đặc tả chính thức (ảnh Thầy gửi). Vẫn *chỉ rót câu vào Giỏ* rồi Xuất như thường.
- **KHÔNG trong phạm vi đợt này**: xuất bảng ma trận ra file (bản đặc tả), lưu mẫu ma trận đã đặt tên, điểm số mỗi ô/tổng — để **đợt con sau** của Ma trận v2.

### Bối cảnh (vì sao làm việc này)
- Món "Xuất đề + đáp án riêng" (5/5 nợ cuối của "5 đề xuất") **đã BỎ**: gói LaTeX `ex-test` của Thầy làm sẵn việc tách đề/đáp án, app không cần đụng.
- Thầy chuyển trọng tâm sang **hoàn thiện ma trận đề thi** theo đúng khuôn chính thức: hàng = chủ đề/nội dung (nhánh cây); cột = **4 loại câu** (Nhiều lựa chọn · Đúng-Sai · Trả lời ngắn · Tự luận), mỗi loại chia theo **mức độ của hệ**; luôn làm việc trên **đúng 1 hệ**.

## 2. Mục tiêu
Cho phép Thầy đặt số câu theo **cả loại câu lẫn mức độ** cho từng chủ đề trong 1 hệ, rồi app tự bốc đúng câu vào Giỏ — thay vì chỉ đặt theo mức độ như hiện nay. Hướng tới việc soạn **đề THCS/THPT theo mẫu mới** (có trắc nghiệm), đồng thời vẫn phục vụ tốt đề Tự luận.

## 3. Bối cảnh dữ liệu thật (kiểm CSDL read-only 14/07)
Quan trọng để hiểu vì sao có "mặc định thông minh":
- **73 bài còn sống, 100% `type = 'Tự luận'`** — chưa có câu Trắc nghiệm/Đúng-Sai/Trả lời ngắn nào.
- **Thang độ khó theo hệ**: THCS/THPT/Olympic = `Cơ bản | Trung bình | Nâng cao`; **Toán Chuyên = 4 mức** (`Cơ bản | Trung bình | Nâng cao | Đề thi`). Tên mức là *độ khó*, KHÔNG phải Biết/Hiểu/Vận dụng như ảnh (muốn giống ảnh, Thầy tự đổi tên trong Quản lý phân loại — ngoài phạm vi).
- **Tập trung**: 72/73 bài ở hệ **Toán Chuyên**; THCS 1; THPT & Olympic 0.
- **Hệ quả**: tính năng **hướng tới tương lai** — hiện chỉ cột *Tự luận* có bài; 3 cột TN trống tới khi Thầy nhập câu TN. Thầy xác nhận **sẽ nhập câu TN** (đề THCS/THPT mẫu mới) ⇒ vẫn dựng đủ 4 loại.

## 4. Hiện trạng (điểm xuất phát)
- **`src/utils/examMatrix.js`** (hàm THUẦN, có test): engine bốc câu theo ô `(chủ đề × mức độ)` trong 1 hệ + lọc lớp tuỳ chọn; ưu tiên câu lâu chưa dùng (không trong `recentUsageIds`); không lặp câu trong 1 đề.
  - `rows: [{ rowId, categoryId, counts: { [difficultyId]: number } }]`
  - `candidatesForCell(problems, childrenMap, heId, gradeId, categoryId, difficultyId, excludeIds)` — **chưa** lọc theo loại câu.
  - `cells: [{ rowId, categoryId, difficultyId, requested, picked, shortfall }]`
  - `countAvailableForCell(...)`, `pickReplacementProblem(...)` — theo `(categoryId, difficultyId)`.
- **`src/components/MatrixPage.jsx`**: dải tab hệ + lọc lớp; thêm/bớt dòng chủ đề + "Thêm tất cả nhánh cấp 1"; bảng `Chủ đề × Mức độ` với ô số + "còn X"; nút Tạo đề → chế độ *xem lại* (Đổi câu/Bỏ/Bốc lại) → **Đưa vào Giỏ** (`onAddManyToCart`). KHÔNG dùng trường `type`.
- **Trường `type` đã có sẵn**: cột `problems.type` (db.js), 4 giá trị trong `PROBLEM_TYPES` (`src/utils/constants.js`); `useProblems.loadProblems` dùng `SELECT *` + trải `...p` nên **mỗi object bài đã mang `type`**. Không cần đổi phần nạp/schema.

## 5. Thiết kế chi tiết

### 5.1 Hai trục & ánh xạ
**Loại câu** = trường `type` (cố định 4 giá trị lưu trong DB). Nhãn hiển thị theo ảnh:

| Giá trị lưu trong DB (`type`) | Nhãn cột hiển thị |
|---|---|
| `Trắc nghiệm 4 lựa chọn` | Nhiều lựa chọn |
| `Đúng/Sai` | Đúng – Sai |
| `Trả lời ngắn` | Trả lời ngắn |
| `Tự luận` | Tự luận |

Thứ tự cột: **Nhiều lựa chọn → Đúng-Sai → Trả lời ngắn → Tự luận** (3 loại TNKQ trước, Tự luận cuối — như ảnh).

**Mức độ** = `difficulty_levels` của **hệ đang chọn** (động; Toán Chuyên ra 4 cột). Hiện đúng tên hệ đặt.

Một ô lưới = giao **(chủ đề × loại câu × mức độ)**. Câu "khớp ô" khi: thuộc nhánh chủ đề (gồm nhánh con) · `p.type === <loại câu>` · `p.difficultyByHe[heId] === <difficultyId>` · (nếu chọn lớp) có lớp đó.

### 5.2 Giao diện lưới (đã duyệt qua bản phác thảo)
- **Giữ nguyên**: dải tab chọn hệ + ô lọc Lớp; nút "Thêm chủ đề"/"Thêm tất cả nhánh cấp 1"/bỏ dòng.
- **MỚI — hàng ô tick "Loại câu dùng cho đề"**: 4 checkbox theo thứ tự trên.
  - **Mặc định thông minh**: khi vào trang / đổi hệ, chỉ **bật sẵn loại câu ĐANG CÓ bài trong hệ** đó (hiện tại: chỉ *Tự luận*). Loại chưa có bài để **tắt** + ghi chú "(chưa có bài)".
  - Loại **tắt** ⇒ **ẩn cụm cột** của loại đó **và không bốc** cho loại đó.
  - Bỏ tick rồi tick lại: **giữ nguyên số đã gõ** (lưu trong state, chỉ ẩn/hiện — không xoá).
- **Bảng rộng, tiêu đề gộp** (như ảnh): hàng tiêu đề 1 = tên loại câu (span các cột mức độ của loại); hàng tiêu đề 2 = tên mức độ. **Bỏ dòng tiêu đề gộp "TNKQ"** cho gọn (chốt; thêm lại sau nếu Thầy muốn).
- **Mỗi ô**: ô nhập số (như cũ) + dòng nhỏ "**còn X**" = số câu khả dụng cho đúng ô `(chủ đề · loại câu · mức độ)` (nay lọc thêm theo loại câu).
- **Tổng** (mới, giống ảnh): cột **"Tổng"** cuối mỗi hàng (tổng theo chủ đề) · hàng **"Tổng số câu"** cuối bảng (tổng theo từng cột) · **tổng chung** "Tổng: N câu" (đã có).
- Nếu hệ chưa có mức độ / chưa có chủ đề nào: giữ các thông báo hướng dẫn như hiện tại.

### 5.3 Luồng (phần sau GIỮ NGUYÊN)
Build (điền lưới) → **Tạo đề** → *xem lại* từng ô (Đổi câu / Bỏ / Bốc lại toàn bộ / Sửa ma trận) → **Đưa vào Giỏ đề** (`onAddManyToCart`). Khác biệt duy nhất: engine lọc thêm theo loại câu; **nhãn mỗi ô xem lại** đổi thành `Chủ đề — Loại câu — Mức độ`.

### 5.4 Engine `examMatrix.js` (hàm thuần — dễ test)
Cấu trúc dữ liệu đổi để mang thêm chiều loại câu:
- **rows**: `[{ rowId, categoryId, counts: { [type]: { [difficultyId]: number } } }]` (lồng thêm 1 tầng theo `type`).
- **generateExamMatrix({ problems, childrenMap, heId, gradeId, rows, types, recentUsageIds, rng })**:
  - Thêm tham số **`types`** = mảng loại câu ĐANG bật (đúng thứ tự cột).
  - Duyệt `rows × types × (mức độ của hệ)`, đọc `row.counts[type]?.[difficultyId]`; bỏ qua ô ≤ 0.
  - Không lặp câu toàn đề (giữ `usedIds`); ưu tiên câu lâu chưa dùng (giữ `rankAndPick`).
- **candidatesForCell(problems, childrenMap, heId, gradeId, categoryId, `type`, difficultyId, excludeIds)**: thêm điều kiện `(p.type === type)`.
- **cells**: mỗi phần tử thêm khoá **`type`**: `{ rowId, categoryId, type, difficultyId, requested, picked, shortfall }`.
- **countAvailableForCell({ ..., `type`, difficultyId })** và **pickReplacementProblem({ ..., `type`, difficultyId, ... })**: thêm tham số `type`, truyền xuống `candidatesForCell`.
- Giữ nguyên: `collectDescendantIds`, `shuffle`, `rankAndPick` (né câu đã dùng), tính `shortfall`.

### 5.5 Chống bốc trùng khi 1 bài ở nhiều nhánh (Thầy nêu 14/07)
Một bài có thể gắn **nhiều nhánh chủ đề** (vd cùng lúc *Số học → PT nghiệm nguyên* và *Số học → Đồng dư thức*). Vì mỗi bài chỉ có **1 loại câu** và **1 mức độ trong một hệ**, con đường bốc trùng **duy nhất** là qua nhiều nhánh — và đã được chặn sẵn, v2 giữ nguyên:
- `generateExamMatrix` giữ **một `usedIds` chung cho cả lần bốc** (mọi ô: nhánh × loại × mức). Bài đã bốc bị loại khỏi mọi ô còn lại (`candidatesForCell` lọc `!excludeIds.has(p.id)`).
- **Hành vi = "bốc đủ bằng bài khác", KHÔNG phải "gặp trùng thì bỏ trống"**: mỗi ô vẫn lấy đủ số yêu cầu từ các bài **còn lại (chưa dùng)**. Chỉ khi cạn bài phân biệt thì ô báo `shortfall` ("cần X, chỉ có Y") — *thà thiếu còn hơn trùng*.
- **KHÔNG thêm cảnh báo chồng nhánh** (Thầy chốt giữ đơn giản, 14/07).
- Không đụng: nhãn "còn X" (`countAvailableForCell`) vẫn đếm **độc lập từng ô** ⇒ với nhánh chồng bài có thể lạc quan hơn số thực bốc được. Chấp nhận.

## 6. Guardrail (an toàn)
- ❌ **KHÔNG đổi schema DB** — trường `type` đã tồn tại; không thêm bảng/cột.
- ❌ **KHÔNG đụng đường xuất `.tex`**: `buildProblemTex.js` / `buildContentFile.js` giữ nguyên byte-for-byte ⇒ **golden-file 3/3 phải KHÔNG đổi**.
- ❌ **KHÔNG đụng Rust**, không thêm thư viện, không thêm mục nav (vẫn `currentView: 'matrix'`).
- ✅ **Chỉ sửa đúng 3 file**: `src/utils/examMatrix.js`, `src/utils/examMatrix.test.js`, `src/components/MatrixPage.jsx`. `App.jsx` giữ nguyên (props của `MatrixPage` không đổi).

## 7. Kiểm thử
- **`examMatrix.test.js`** — mở rộng (rng tất định như hiện có):
  - Ô lọc đúng theo `type`: câu sai loại KHÔNG lọt vào ô; câu đúng cả (nhánh · loại · mức) mới khớp.
  - Không lặp câu giữa các ô có cùng (chủ đề · mức độ) nhưng khác loại.
  - **Ca chồng nhánh (Thầy nêu 14/07)**: 1 bài gắn 2 nhánh, chọn cả 2 nhánh cùng (loại · mức) → bài chỉ ra **1 lần**; ô còn lại **lấp bằng bài khác** nếu còn, hoặc báo `shortfall` khi cạn bài phân biệt.
  - `countAvailableForCell` đếm đúng theo loại câu.
  - `pickReplacementProblem` chỉ trả câu cùng loại, loại các id đang hiển thị.
  - `types` rỗng / ô = 0 ⇒ không bốc.
- **Không lặp regression**: chạy full test, **`buildContentFile` golden 3/3 KHÔNG đổi**; `CI=true npm run build` 0 warning.
- **GUI**: `MatrixPage` cần `useTaxonomy` (SQL Tauri) ⇒ Claude không tự kiểm GUI được → **Thầy nghiệm thu trong `npx tauri dev`** theo checklist (điền lưới nhiều loại × mức, bốc, đổi/bỏ, đưa vào Giỏ; ẩn/hiện loại; mặc định chỉ bật Tự luận ở Toán Chuyên).

## 8. Những gì KHÔNG làm đợt này (chốt để tránh phình)
- Xuất **bảng ma trận đặc tả** ra file (LaTeX/Word) — đợt con sau (app đã nắm sẵn số liệu nên không phí công).
- **Lưu mẫu ma trận** đã đặt tên; **điểm số** mỗi ô/tổng; lọc/loại theo nhóm TNKQ vs Tự luận ở mức nhóm — đợt con sau của Ma trận v2.
- Dòng tiêu đề gộp "TNKQ"; đổi tên thang độ khó thành Biết/Hiểu/Vận dụng (việc của Thầy trong Quản lý phân loại).

## 9. Backlog / mở rộng sau
- Ma trận v2 (các đợt con còn lại): xuất bảng đặc tả · lưu mẫu · điểm số · loại câu TN/TL ở mức nhóm.
- (Đợt B khác) Quản lý tag + gợi ý · Quét trùng toàn kho · Cỡ chữ/zoom.

---
*Thầy đã duyệt định hướng + bản phác thảo lưới. Bước tiếp: lập Plan (writing-plans) chia task app-chạy-được-sau-mỗi-bước, rồi build.*
