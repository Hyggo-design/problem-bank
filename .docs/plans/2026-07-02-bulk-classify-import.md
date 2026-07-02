# Phân loại hàng loạt trong Rà soát Import — Build Plan

**What we're building:** Trong màn Rà soát của Smart Import, cho phép tick nhiều bài rồi gán phân loại (nhánh + độ khó + lớp + tag) cho tất cả cùng lúc bằng một bảng chọn duy nhất.

**Why:** Đỡ phải mở bảng phân loại và tick lặp lại cho từng bài khi cả mẻ import phần lớn cùng chủ đề/lớp/độ khó.

**Approach:** Thêm 3 mẩu trạng thái (đang tick những bài nào, có đang mở bảng chọn chung không, bảng chọn chung đang để gì) và các hàm xử lý vào `SmartImportModal.jsx`, rồi thêm giao diện: 1 ô tick trên mỗi thẻ bài + 1 thanh công cụ phía trên danh sách. Toàn bộ nằm trong **một file duy nhất**, không đụng cách lưu/xuất dữ liệu.

**Spec:** [.docs/specs/2026-07-02-bulk-classify-import-design.md](../specs/2026-07-02-bulk-classify-import-design.md)

**Files we'll create or change:**
- `src/components/Modals/SmartImportModal.jsx` — thêm ô tick từng bài, thanh công cụ, bảng phân loại dùng chung, hàm áp dụng

**Giải nghĩa vài từ:** *state* = một mẩu dữ liệu React "nhớ" giữa các lần vẽ lại màn hình; *JSX* = cú pháp viết giao diện ngay trong file JavaScript (trông giống HTML); *component điều khiển* = một khối giao diện nhận `value` (dữ liệu hiện tại) + `onChange` (hàm báo khi đổi) từ bên ngoài, tự nó không tự ý nhớ gì.

---

### Task 1: Thêm trạng thái, hàm xử lý, và giao diện — trọn gói trong 1 lần sửa

**What you'll have when this is done:** Màn Rà soát Import có ô tick trên mỗi thẻ bài + thanh công cụ "Phân loại hàng loạt" hoạt động đầy đủ.

- [ ] Bước 1: Mở `src/components/Modals/SmartImportModal.jsx`. Tìm dòng:

```js
  const [results, setResults] = useState([]);
```

Ngay SAU dòng đó, dán thêm 3 dòng trạng thái mới:

```js
  const [results, setResults] = useState([]);
  const [selectedForBulk, setSelectedForBulk] = useState([]); // id các bài đang tick để phân loại hàng loạt
  const [showBulkPicker, setShowBulkPicker] = useState(false); // có đang mở bảng phân loại dùng chung không
  const [bulkCls, setBulkCls] = useState(makeEmptyCls());       // giá trị đang chọn trong bảng dùng chung
```

- [ ] Bước 2: Vẫn trong file đó, tìm khối `removeResultItem` hiện có:

```js
  const removeResultItem = (id) => {
    setResults(results.filter(r => r.id !== id));
  };
```

Thay toàn bộ khối đó bằng đoạn sau (thêm dòng dọn `selectedForBulk` khi 1 bài bị xoá khỏi review, để không đếm nhầm số bài đã tick; và thêm 3 hàm mới cho phân loại hàng loạt ngay bên dưới):

```js
  const removeResultItem = (id) => {
    setResults(results.filter(r => r.id !== id));
    setSelectedForBulk(prev => prev.filter(x => x !== id)); // bài bị xoá thì cũng bỏ khỏi danh sách đang tick
  };

  // --- PHÂN LOẠI HÀNG LOẠT: chỉ áp dụng cho các bài đang được tick ở màn review ---
  const toggleSelectForBulk = (id) => {
    setSelectedForBulk(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAllForBulk = () => {
    setSelectedForBulk(prev => prev.length === results.length ? [] : results.map(r => r.id));
  };
  const applyBulkCls = () => {
    setResults(prev => prev.map(r => selectedForBulk.includes(r.id) ? { ...r, cls: bulkCls } : r));
    setSelectedForBulk([]);
    setShowBulkPicker(false);
    setBulkCls(makeEmptyCls());
  };
```

- [ ] Bước 3: Tìm khối giao diện của banner "Hoàn tất phân tích!" — đúng đoạn sau (kể cả dòng trống và dòng mở khối danh sách ngay sau nó):

```jsx
            <div style={{ backgroundColor: 'var(--color-surface)', padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--color-solution-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20}/> Hoàn tất phân tích!</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Tìm thấy <b>{results.length}</b> câu hỏi. Thầy có thể rà soát và chỉnh sửa ngay bên dưới.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
```

Thay bằng đoạn sau — giữ nguyên banner cũ, chèn thêm **thanh công cụ hàng loạt** ở giữa (ngay trước dòng mở khối danh sách):

```jsx
            <div style={{ backgroundColor: 'var(--color-surface)', padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--color-solution-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20}/> Hoàn tất phân tích!</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Tìm thấy <b>{results.length}</b> câu hỏi. Thầy có thể rà soát và chỉnh sửa ngay bên dưới.</p>
              </div>
            </div>

            {/* Thanh công cụ: tick nhiều bài rồi gán phân loại chung 1 lần */}
            <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', border: showBulkPicker ? '1px solid var(--color-cobalt)' : '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  {selectedForBulk.length > 0 ? `Đã chọn ${selectedForBulk.length} bài` : 'Tick các bài giống nhau để phân loại hàng loạt'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="card-btn" onClick={toggleSelectAllForBulk} disabled={results.length === 0}>
                    {selectedForBulk.length === results.length && results.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                  <button type="button" className="card-btn card-btn-primary" disabled={selectedForBulk.length === 0} onClick={() => setShowBulkPicker(s => !s)}>
                    Phân loại hàng loạt
                  </button>
                </div>
              </div>

              {showBulkPicker && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                  <ClassificationPicker value={bulkCls} onChange={setBulkCls} />
                  <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                    <button type="button" className="card-btn card-btn-primary" disabled={selectedForBulk.length === 0} onClick={applyBulkCls}>
                      Áp dụng cho {selectedForBulk.length} bài
                    </button>
                    <button type="button" className="card-btn" onClick={() => setShowBulkPicker(false)}>Đóng</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
```

- [ ] Bước 4: Tìm khối tiêu đề của MỖI thẻ bài (bên trong `results.map`) — đúng đoạn sau:

```jsx
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <select value={res.type} onChange={(e) => updateResultItem(res.id, 'type', e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
                      <option value="Tự luận">Tự luận</option>
                      <option value="Trắc nghiệm">Trắc nghiệm</option>
                      <option value="Đúng/Sai">Đúng/Sai</option>
                      <option value="Trả lời ngắn">Trả lời ngắn</option>
                    </select>
                    <button onClick={() => removeResultItem(res.id)} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }} title="Xóa câu này nếu nhận diện sai"><Trash2 size={20}/></button>
                  </div>
```

Thay bằng đoạn sau — thêm ô tick bên trái select, gói cả hai trong một nhóm nhỏ:

```jsx
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedForBulk.includes(res.id)}
                        onChange={() => toggleSelectForBulk(res.id)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                        title="Chọn bài này để phân loại hàng loạt"
                      />
                      <select value={res.type} onChange={(e) => updateResultItem(res.id, 'type', e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
                        <option value="Tự luận">Tự luận</option>
                        <option value="Trắc nghiệm">Trắc nghiệm</option>
                        <option value="Đúng/Sai">Đúng/Sai</option>
                        <option value="Trả lời ngắn">Trả lời ngắn</option>
                      </select>
                    </div>
                    <button onClick={() => removeResultItem(res.id)} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }} title="Xóa câu này nếu nhận diện sai"><Trash2 size={20}/></button>
                  </div>
```

- [ ] Bước 5: Kiểm app biên dịch sạch
      Run: `CI=true npm run build`
      You should see: `Compiled successfully`, **0 warning**. Nếu báo lỗi thiếu dấu ngoặc/dấu phẩy, so lại đúng từng ký tự với 2 đoạn dán ở Bước 3–4.

- [ ] Bước 6: Lưu tiến độ
      Run: `git add src/components/Modals/SmartImportModal.jsx && git commit -m "feat(import): phan loai hang loat trong man ra soat"`

---

### Task 2: Kiểm bằng mắt — đúng như thiết kế đã duyệt

**What you'll have when this is done:** Bằng chứng tận mắt: tick-chọn đúng, áp dụng đúng bài đã tick, sửa tay sau đó không ảnh hưởng bài khác, và lưu vào kho đúng như đã thấy trên màn rà soát.

Bài kiểm này dùng đường **file `.txt` chứa mã LaTeX** — KHÔNG cần API key Gemini, không tốn phí, kết quả luôn giống nhau mỗi lần chạy.

- [ ] Bước 1: Tạo file kiểm thử. Tạo một file text mới tên `test-import.txt` (ở Desktop hay bất kỳ đâu tiện, sẽ xoá sau khi xong), dán đúng nội dung sau:

```
\begin{bt}
Tìm tất cả số nguyên $n$ sao cho $n^2 + 1$ chia hết cho $n + 1$.
\loigiai{
Ta có $n^2+1=(n+1)(n-1)+2$ nên $n+1$ là ước của 2.
}
\end{bt}

\begin{bt}
Chứng minh rằng $\sqrt{2}$ là số vô tỉ.
\loigiai{
Giả sử phản chứng $\sqrt{2}=p/q$ tối giản...
}
\end{bt}

\begin{bt}
Cho tam giác $ABC$ vuông tại $A$. Chứng minh $AB^2+AC^2=BC^2$.
\end{bt}
```

- [ ] Bước 2: Chạy app, mở Smart Import, kéo thả `test-import.txt` vào, bấm **"Bắt đầu chuyển hóa"**.
      Run: `npx tauri dev` (nếu app chưa chạy)
      You should see: chuyển sang màn Rà soát với đúng **3 thẻ bài**, mỗi thẻ có 1 ô tick bên cạnh select loại câu; phía trên có thanh **"Tick các bài giống nhau để phân loại hàng loạt"** với 2 nút "Chọn tất cả" và "Phân loại hàng loạt" (nút sau đang mờ vì chưa tick gì).

- [ ] Bước 3: Kiểm áp dụng cho MỘT PHẦN đã tick
      Tick 2 trong 3 thẻ (bất kỳ). Bấm **"Phân loại hàng loạt"** → bảng phân loại hiện ra, viền cả khối chuyển sang màu cobalt. Chọn 1 nhánh bất kỳ trong cây + 1 độ khó + 1 lớp + gõ tag "thu-nghiem" → bấm **"Áp dụng cho 2 bài"**.
      You should see: bảng đóng lại, ô tick của cả 2 bài tự bỏ (thanh công cụ trở lại "Tick các bài giống nhau..."); **đúng 2 thẻ đã tick** giờ có nhánh/độ khó/lớp/tag vừa chọn hiện trong `ClassificationPicker` riêng của chúng; **thẻ thứ 3 vẫn trống trơn** (chưa tick nên không đổi).

- [ ] Bước 4: Kiểm "Chọn tất cả"
      Bấm **"Chọn tất cả"** (giờ cả 3 bài được tick, nút đổi thành "Bỏ chọn tất cả"). Bấm **"Phân loại hàng loạt"** → chọn một nhánh/độ khó/lớp KHÁC lần trước → **"Áp dụng cho 3 bài"**.
      You should see: **cả 3 thẻ** đều nhận đúng phân loại mới vừa chọn (kể cả 2 thẻ đã có phân loại từ Bước 3 — bị thay thế bằng lựa chọn mới, đúng thiết kế "thay thế toàn bộ").

- [ ] Bước 5: Kiểm sửa tay sau khi áp dụng hàng loạt KHÔNG ảnh hưởng bài khác + lưu vào kho đúng
      Trên thẻ đầu tiên, tự tay đổi độ khó (chỉ thẻ này) sang một mức khác trong `ClassificationPicker` riêng của nó.
      You should see: chỉ thẻ đầu tiên đổi, 2 thẻ còn lại giữ nguyên phân loại từ Bước 4.
      Bấm **"Lưu 3 bài vào Ngân hàng"** ở cuối màn hình.
      You should see: 3 bài mới xuất hiện trong danh sách chính, mỗi bài mang đúng phân loại đã thấy lần cuối trên màn rà soát (mở "Xem đầy đủ" 1-2 bài để soi lại nhánh/độ khó/lớp/tag). Xoá 3 bài kiểm thử này khỏi kho sau khi xong (chuyển vào Thùng rác là đủ, không cần xoá hẳn).

---

### Task 3: Kiểm tự động toàn kho + xác nhận đường xuất không đổi

**What you'll have when this is done:** Bằng chứng cả kho vẫn xanh và đường xuất LaTeX hoàn toàn không bị ảnh hưởng.

- [ ] Bước 1: Chạy toàn bộ bài kiểm
      Run: `npm test -- --watchAll=false`
      You should see: dòng tổng kết `Tests: <tất cả> passed` — không có bài đỏ (tính năng này không có test mới vì không có util thuần nào để test riêng, nhưng golden export vẫn phải xanh).

- [ ] Bước 2: Xác nhận phạm vi sửa đúng như plan (chỉ 1 file)
      Run: `git status --short`
      You should see: KHÔNG còn thay đổi nào chưa commit ngoài các file đã biết (Cargo.toml do CRLF). Nếu Task 1 đã commit ở Bước 6, lệnh `git log --oneline -3` phải cho thấy chỉ đúng 1 commit đổi `SmartImportModal.jsx`, KHÔNG đụng `useProblems.js`, `buildProblemTex.js`, `buildContentFile.js`, `db.js`, hay bất kỳ file Rust nào.

- [ ] Bước 3: Kiểm app build bản phát hành sạch
      Run: `npm run build`
      You should see: `Compiled successfully` (hoặc tương đương), **0 warning**.

- [ ] Bước 4: Lưu chốt (nếu còn gì chưa commit)
      Run: `git add -A && git status` → xem kỹ chỉ có đúng các file trong kế hoạch → nếu có gì mới thì `git commit -m "chore: chot tinh nang phan loai hang loat import"` (nếu không còn gì để commit thì bỏ qua bước này).

> **Lưu ý bàn giao:** Sau khi build xong 3 Task, **Claude sẽ check lại** (đối chiếu plan từng dòng, chạy test, soi golden export) rồi Thầy nghiệm thu GUI lần cuối. **Chỉ `git push` sau khi Thầy nghiệm thu** — đúng nhịp các phiên trước.

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order — don't skip ahead
3. Complete the "Check it works" step before moving to the next task
4. If something doesn't work as expected, stop and describe what you see — don't try random fixes

Say "let's start building" when you're ready to begin Task 1.
