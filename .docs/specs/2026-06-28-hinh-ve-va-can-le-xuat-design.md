# Hình vẽ + Căn lề khi xuất (.tex) — Design Spec

**Ngày:** 28/06/2026
**Trạng thái:** Thiết kế đã chốt (Thầy duyệt 28/06/2026). Antigravity build → Claude check.
**Gộp 2 cải tiến** vì cùng sửa `buildProblemTex` (sacred) + cùng cập nhật golden test.

## Mục tiêu
1. **Hình vẽ:** gắn mã hình (TikZ hoặc `\includegraphics`) cho **đề bài** và/hoặc **lời giải**; app tự gộp vào khối `.tex`, bọc trong `\begin{center}`. **KHÔNG vẽ hình trong app** (KaTeX không dựng được TikZ; hình hiện khi biên dịch file `.tex` thật — đúng 100%).
2. **Căn lề tự động:** khối `.tex` xuất ra được **thụt lề nhất quán, đẹp mắt**. LaTeX bỏ qua khoảng trắng đầu dòng → **PDF không đổi**.

## Bối cảnh kỹ thuật
- `buildProblemTex(item)` dựng khối `\begin{bt}…\end{bt}` mỗi bài; dùng chung cho **Xuất đề** (`buildContentFile`), nút **"Mã LaTeX"**, **"Xem đầy đủ"**. `buildContentFile` gọi `buildProblemTex` cho từng bài rồi nối.
- `loadProblems` dùng `SELECT * FROM problems` rồi `...p` → **mọi cột tự có trên `item`**. Thêm cột là `buildProblemTex` đọc được ngay (`item.figStatement`), không cần JSON.
- ⚠️ Cả 2 cải tiến **đổi định dạng** khối `.tex` ⇒ **KHÔNG còn byte-identical**. Golden test sẽ **cập nhật sang khuôn mới** (đây là thay đổi Thầy MONG MUỐN, không phải regression).

---

## A. Hình vẽ

### Lưu trữ
- Thêm **2 cột TEXT** vào bảng `problems`: **`figStatement`**, **`figSolution`** — bằng migration **idempotent `ALTER TABLE … ADD COLUMN`** (y như cột `metadata`/`deletedAt` đã có). Bài cũ tự nhận `NULL`/`''` → **không mất dữ liệu**.
- (Dùng cột riêng thay vì nhét vào `metadata` JSON: gọn, đọc thẳng, ít lỗi cho đường xuất sacred.)

### Form Thêm/Sửa
- Thêm **2 ô `textarea` tuỳ chọn** (monospace), **để trống cũng được**:
  - **"Hình đề bài (mã LaTeX)"** → `figStatement`
  - **"Hình lời giải (mã LaTeX)"** → `figSolution`
- Dán **mã thuần** (vd `\begin{tikzpicture}…\end{tikzpicture}` hoặc `\includegraphics{ten-file}`); app tự lo `\begin{center}`.
- `EditProblemModal` phải **nạp sẵn** `figStatement`/`figSolution` của bài để sửa không bị mất. (Chi tiết tích hợp form ở plan.)

### Vị trí khi xuất
- **`figStatement`**: chèn **sau đề bài**, trước `\choice`/`\loigiai`, bọc `\begin{center}…\end{center}`.
- **`figSolution`**: chèn **đầu `\loigiai`**, **trước lời giải**, bọc `\begin{center}…\end{center}`.
- Ô **trống** → **không sinh dòng nào** (kể cả `\begin{center}`) → bài không hình giữ khuôn gọn.

---

## B. Căn lề tự động (canonical pretty-print)
Dùng **TAB (`\t`)** làm đơn vị thụt (đồng bộ header — golden test header đang dùng `\t`). Thụt theo cấp:

| Cấp | Thành phần |
|-----|-----------|
| 0 | `\begin{bt}`, `\end{bt}` |
| 1 (`\t`) | đề bài · `\choice` · `\loigiai{` và `}` · wrapper `\begin{center}`/`\end{center}` của **hình đề** |
| 2 (`\t\t`) | options · lời giải · nội dung **hình đề** · wrapper `center` của **hình lời giải** |
| 3 (`\t\t\t`) | nội dung **hình lời giải** |

**Quy tắc thụt nhiều dòng:** mỗi PHẦN (đề/lời giải/mã hình) → `.trim()` phần ngoài, rồi **prefix mỗi dòng KHÔNG rỗng** bằng `\t × cấp`; **dòng trống để rỗng** (không thêm tab thừa). Cách prefix này **giữ nguyên thụt lề tương đối bên trong** — quan trọng cho mã TikZ nhiều tầng.

### Khuôn xuất cuối — bài đủ các phần
```latex
\begin{bt}
	<đề bài>
	\begin{center}
		<hình đề bài>
	\end{center}
	\choice
		{<đáp án 1>}
		{\True <đáp án 2>}
	\loigiai{
		\begin{center}
			<hình lời giải>
		\end{center}
		<lời giải>
	}
\end{bt}
```

### Khuôn bài thường (đề + lời giải, không hình, không trắc nghiệm)
```latex
\begin{bt}
	<đề bài>
	\loigiai{
		<lời giải>
	}
\end{bt}
```

---

## Mức can thiệp Code
- `src/utils/buildProblemTex.js` — thụt lề theo cấp + chèn 2 hình (có điều kiện).
- `src/utils/db.js` — 2 cột mới + migration idempotent + thêm vào CREATE TABLE.
- `src/hooks/useProblems.js` — thêm `figStatement`/`figSolution` vào **3 câu INSERT** (addProblem, updateProblem, bulk import); load tự có qua `SELECT *`.
- `src/components/Modals/AddProblemModal.jsx` + `EditProblemModal.jsx` — 2 ô nhập.
- `src/utils/buildContentFile.test.js` — **cập nhật golden** sang khuôn mới + **thêm case bài-có-hình**.
- **KHÔNG** thêm thư viện, **KHÔNG** vẽ hình trong app, **KHÔNG** sửa Rust, **KHÔNG** đụng `buildContentFile` (chỉ phần khối bài đổi qua `buildProblemTex`).

## Rủi ro & lưu ý
- **Đổi định dạng `.tex`** (mất byte-identical) — **chủ đích**. PDF không đổi → kiểm bằng **biên dịch 1 đề trước/sau, so PDF**.
- **`verbatim`/`lstlisting`** (hiếm trong Toán): khoảng trắng đầu dòng ở đó sẽ đổi → chấp nhận, báo Thầy.
- Hình lời giải nằm trong `\loigiai` nên **cần có lời giải** kèm theo.

## Nghiệm thu
- **Claude check (cấp mã):** `npm run build` 0 warning; golden cập nhật **pass**; bài-không-hình ra đúng khuôn thụt lề mới; bài-có-hình ra đúng khuôn đầy đủ; `git diff` xác nhận chỉ các file trên đổi.
- **Thầy (GUI):** biên dịch 1 đề **trước/sau** đổi → **PDF y hệt**; thêm 1 bài có hình TikZ + 1 bài có `\includegraphics` → xuất → `\input` vào main.tex → **PDF ra hình đúng**.
