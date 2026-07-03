# Bảng Thống Kê + Theo Dõi "Đã Dùng" — Build Plan

**What we're building:** Một màn "Thống kê" mới (mặc định khi mở app) hiện tổng số bài theo Hệ và theo nhánh chủ đề; đồng thời mỗi bài hiện "đã dùng mấy lần" (tính từ lịch sử xuất đề) trên thẻ + khi Xem đầy đủ, kèm bộ lọc "chỉ hiện bài chưa dùng".

**Why:** Nhìn được tổng quan kho đề ngay khi mở app, và tránh soạn trùng câu đã dùng khi ra đề mới.

**Approach:** Chia 2 phần độc lập, làm phần Thống kê trước (không phụ thuộc lịch sử xuất đề) rồi tới phần "đã dùng" (dựa trên `export_history` có sẵn, KHÔNG dùng cột `timesUsed` vì cột này chết). Mỗi phần đi qua vài task nhỏ, mỗi task giữ app biên dịch được, kết thúc bằng 1 buổi kiểm bằng mắt trong `npx tauri dev` cho từng phần.

**Spec:** [.docs/specs/2026-07-03-bang-thong-ke-design.md](../specs/2026-07-03-bang-thong-ke-design.md) (đọc trước khi build).

**Files we'll create or change:**
- `src/components/DashboardPage.jsx` — [MỚI] màn Thống kê tổng quan
- `src/utils/usageStats.js` — [MỚI] đếm số lần mỗi bài xuất hiện trong lịch sử xuất đề
- `src/utils/usageStats.test.js` — [MỚI] unit test
- `src/hooks/useUIState.js` — đổi màn mặc định thành `'dashboard'`; thêm state lọc `onlyUnused`
- `src/components/NavRail.jsx` — thêm nút "Thống kê" (trên cùng cụm Bài/Giỏ)
- `src/App.jsx` — gắn `DashboardPage` vào điều hướng; tải `export_history` dùng chung; truyền số liệu "đã dùng" xuống các nơi cần; bỏ field `used` (chết) khỏi Header
- `src/components/DataGrid.jsx` — áp dụng lọc "chỉ hiện chưa dùng"; truyền `usageCount` cho từng thẻ
- `src/components/FilterSidebar.jsx` — thêm ô "Chỉ hiện bài chưa dùng"
- `src/components/ProblemCard.jsx` — badge "Đã dùng N lần" (giống cách badge "📐 Có hình" đang hoạt động)
- `src/components/PreviewModal.jsx` — chuyển tiếp `usageCount` cho `PreviewPanel`
- `src/components/PreviewPanel.jsx` — badge "Đã dùng N lần" trong "Xem đầy đủ"
- `src/components/Header.jsx` — bỏ thẻ "Lượt sử dụng" (đọc cột `timesUsed` chết, luôn hiện 0)

**Giải nghĩa vài từ:** *hàm thuần* = hàm chỉ tính toán từ dữ liệu đưa vào, không đọc/ghi CSDL hay React — vì vậy viết bài kiểm (test) cho nó dễ và nhanh; *memo hoá* (`useMemo`) = React chỉ tính lại một phép tính khi dữ liệu đầu vào của nó thật sự đổi, tránh tính lại mỗi lần vẽ màn hình; *prop* = một mẩu dữ liệu hoặc hàm mà component cha truyền xuống cho component con.

> ✅ **An toàn:** Tính năng này **không đổi cấu trúc CSDL** (không bảng/cột mới) và **không đụng** `buildProblemTex.js`/`buildContentFile.js`/`ExportModal.jsx`/`ExportHistoryModal.jsx`/Rust — chỉ ĐỌC dữ liệu có sẵn (`problems`, cây phân loại, `export_history`). Golden export phải giữ nguyên 3/3 suốt toàn bộ plan.

> ⚠️ **Thứ tự bắt buộc:** Làm đúng thứ tự Task 1→9. Task 1–3 (màn Thống kê) độc lập hoàn toàn với Task 4–8 (theo dõi "đã dùng") — nếu muốn nghỉ giữa chừng, đây là điểm dừng tự nhiên (sau Task 3, đã có 1 tính năng trọn vẹn chạy được).

---

### Task 1: Tạo màn `DashboardPage.jsx`

**What you'll have when this is done:** Một file component mới, đầy đủ logic đếm bài theo Hệ/nhánh — CHƯA hiện trong app (nối vào ở Task 2).

- [ ] Bước 1: Tạo file mới `src/components/DashboardPage.jsx` với nội dung:
      ```jsx
      import React, { useMemo } from 'react';
      import { useTaxonomy, getDescendantIds } from '../hooks/useTaxonomy';

      // ==========================================
      // MÀN THỐNG KÊ TỔNG QUAN — mặc định khi mở app.
      // Đếm bài theo Hệ + theo nhánh chủ đề cấp 1 (gộp cả nhánh con bên trong).
      // Bấm vào một số = nhảy sang "Bài" đã lọc đúng hệ/nhánh đó.
      // ==========================================
      const DashboardPage = ({ problems, onNavigateToHe, onNavigateToBranch, onNavigateToUnclassified }) => {
        const { categories } = useTaxonomy();

        const heList = useMemo(
          () => categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position),
          [categories]
        );
        // childrenMap: parent_id -> [id con], để getDescendantIds gộp cả nhánh con khi đếm.
        const childrenMap = useMemo(() => {
          const m = {};
          for (const c of categories) {
            if (!c.parent_id) continue;
            (m[c.parent_id] = m[c.parent_id] || []).push(c.id);
          }
          return m;
        }, [categories]);

        const countInSet = (ids) => {
          const set = new Set(ids);
          return problems.filter((p) => (p.categoryIds || []).some((cid) => set.has(cid))).length;
        };
        const unclassifiedCount = problems.filter((p) => (p.categoryIds || []).length === 0).length;

        const cardStyle = { padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' };
        const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };

        return (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: 'var(--color-text)' }}>Thống kê tổng quan</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 720 }}>
              <div style={cardStyle}>
                <div style={rowStyle} onClick={onNavigateToUnclassified} title="Bấm để xem bài chưa phân loại">
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Chưa phân loại</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-amber)' }}>{unclassifiedCount}</span>
                </div>
              </div>

              {heList.map((he) => {
                const heIds = getDescendantIds(he.id, childrenMap);
                const branches = (childrenMap[he.id] || [])
                  .map((id) => categories.find((c) => c.id === id))
                  .filter(Boolean)
                  .sort((a, b) => a.position - b.position);

                return (
                  <div key={he.id} style={cardStyle}>
                    <div
                      style={{ ...rowStyle, marginBottom: branches.length ? '0.9rem' : 0, paddingBottom: branches.length ? '0.9rem' : 0, borderBottom: branches.length ? '1px solid var(--color-border-subtle)' : 'none' }}
                      onClick={() => onNavigateToHe(he.id)}
                      title={`Bấm để xem bài thuộc ${he.name}`}
                    >
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)' }}>{he.name}</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-cobalt)' }}>{countInSet(heIds)}</span>
                    </div>

                    {branches.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Hệ này chưa có nhánh chủ đề nào.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {branches.map((b) => (
                          <div
                            key={b.id}
                            style={{ ...rowStyle, fontSize: '0.9rem', padding: '0.15rem 0' }}
                            onClick={() => onNavigateToBranch(he.id, b.id)}
                            title={`Bấm để xem bài thuộc nhánh ${b.name}`}
                          >
                            <span style={{ color: 'var(--color-text-muted)' }}>{b.name}</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{countInSet(getDescendantIds(b.id, childrenMap))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      export default DashboardPage;
      ```

- [ ] Bước 2: Check it works
      File mới chưa được import ở đâu nên chưa chạy/kiểm được ngay — bình thường, sẽ nối vào ở Task 2. Chỉ cần lưu file không lỗi cú pháp (trình soạn thảo không gạch đỏ).

---

### Task 2: Gắn màn Thống kê vào điều hướng

**What you'll have when this is done:** Mở app là thấy màn Thống kê ngay; nav rail có mục "Thống kê" trên cùng "Bài"/"Giỏ".

- [ ] Bước 1: Mở `src/hooks/useUIState.js`. Tìm dòng:
      ```js
      const [currentView, setCurrentView] = useState('feed'); // 'feed' | 'cart' | 'settings'
      ```
      Thay bằng:
      ```js
      const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'feed' | 'cart' | 'settings' | 'trash'
      ```

- [ ] Bước 2: Mở `src/components/NavRail.jsx`. Tìm dòng import đầu file:
      ```jsx
      import { PlusSquare, Upload, List, ShoppingCart, Settings, Trash2, ChevronsLeft, ChevronsRight } from 'lucide-react';
      ```
      Thay bằng (thêm `BarChart3`):
      ```jsx
      import { PlusSquare, Upload, List, ShoppingCart, Settings, Trash2, ChevronsLeft, ChevronsRight, BarChart3 } from 'lucide-react';
      ```
      Rồi tìm khối:
      ```jsx
      <button className={`rail-item ${currentView === 'feed' ? 'on' : ''}`} onClick={() => onNavigate('feed')}
        style={{ justifyContent: align }}>
        <List size={18} /> {lbl('Bài')}
      </button>
      ```
      Thay bằng (thêm nút "Thống kê" NGAY TRƯỚC nút "Bài"):
      ```jsx
      <button className={`rail-item ${currentView === 'dashboard' ? 'on' : ''}`} onClick={() => onNavigate('dashboard')}
        style={{ justifyContent: align }}>
        <BarChart3 size={18} /> {lbl('Thống kê')}
      </button>
      <button className={`rail-item ${currentView === 'feed' ? 'on' : ''}`} onClick={() => onNavigate('feed')}
        style={{ justifyContent: align }}>
        <List size={18} /> {lbl('Bài')}
      </button>
      ```

- [ ] Bước 3: Mở `src/App.jsx`. Tìm dòng:
      ```jsx
      import TrashPage from './components/TrashPage';
      ```
      Ngay SAU dòng đó, thêm:
      ```jsx
      import DashboardPage from './components/DashboardPage';
      ```

- [ ] Bước 4: Vẫn trong `App.jsx`, tìm dòng:
      ```jsx
      // 3. CÁC HÀM XỬ LÝ SỰ KIỆN LIÊN KẾT (Business Logic)

      const handleBulkDelete = async () => {
      ```
      Thay bằng (thêm hàm `goToUnclassified` dùng chung cho Header VÀ màn Thống kê):
      ```jsx
      // 3. CÁC HÀM XỬ LÝ SỰ KIỆN LIÊN KẾT (Business Logic)

      // Dùng chung cho Header và màn Thống kê: chuyển sang "Bài", bật chế độ xem bài chưa phân loại.
      const goToUnclassified = () => {
        if (ui.currentView !== 'feed') ui.setCurrentView('feed');
        ui.showUnclassified();
      };

      const handleBulkDelete = async () => {
      ```

- [ ] Bước 5: Tìm khối `<Header ... />`:
      ```jsx
      <Header
        stats={{
          total: problems.length,
          unclassified: problems.filter(p => (p.categoryIds?.length || 0) === 0).length,
          cartCount: cartCount,
          used: problems.reduce((sum, p) => sum + (p.timesUsed || 0), 0)
        }}
        unclassifiedActive={ui.unclassifiedMode}
        onUnclassifiedClick={() => {
          if (ui.currentView !== 'feed') ui.setCurrentView('feed');
          ui.showUnclassified();
        }}
      />
      ```
      Thay riêng dòng `onUnclassifiedClick`, GIỮ NGUYÊN `stats` (bỏ `used` để dành Task 7):
      ```jsx
      <Header
        stats={{
          total: problems.length,
          unclassified: problems.filter(p => (p.categoryIds?.length || 0) === 0).length,
          cartCount: cartCount,
          used: problems.reduce((sum, p) => sum + (p.timesUsed || 0), 0)
        }}
        unclassifiedActive={ui.unclassifiedMode}
        onUnclassifiedClick={goToUnclassified}
      />
      ```

- [ ] Bước 6: Tìm dòng mở khối feed:
      ```jsx
          {ui.currentView === 'feed' && (
      ```
      Ngay TRƯỚC dòng đó, thêm khối màn Thống kê:
      ```jsx
          {ui.currentView === 'dashboard' && (
            <DashboardPage
              problems={problems}
              onNavigateToHe={(heId) => { ui.selectHe(heId); ui.setCurrentView('feed'); }}
              onNavigateToBranch={(heId, branchId) => { ui.selectHe(heId); ui.setFilterTopic(branchId); ui.setCurrentView('feed'); }}
              onNavigateToUnclassified={goToUnclassified}
            />
          )}

          {ui.currentView === 'feed' && (
      ```

- [ ] Bước 7: Check it works
      Run: `npm run build`
      You should see: `Compiled successfully`, **0 warning**. Nếu báo lỗi, so lại đúng từng dấu ngoặc với Bước 3–6.

- [ ] Bước 8: Lưu tiến độ
      Run: `git add src/hooks/useUIState.js src/components/NavRail.jsx src/App.jsx src/components/DashboardPage.jsx && git commit -m "feat(dashboard): man thong ke tong quan theo he va nhanh chu de"`

---

### Task 3: Kiểm bằng mắt — màn Thống kê

**What you'll have when this is done:** Bằng chứng tận mắt: mở app vào thẳng Thống kê, số liệu đúng, bấm số nhảy đúng màn.

- [ ] Bước 1: Chạy app
      Run: `npx tauri dev`
      You should see: app mở ra là vào thẳng màn **"Thống kê"** (không phải "Bài" như trước) — nav rail có mục "Thống kê" đang sáng, nằm trên "Bài"/"Giỏ".

- [ ] Bước 2: Kiểm tổng số khớp Header
      Cộng nhẩm: số ở khối "Chưa phân loại" + số ở TỪNG khối Hệ (THCS/THPT/Chuyên/Olympic).
      You should see: tổng cộng lại **đúng bằng** số "Tổng bài tập" trên Header (thẻ đầu tiên).

- [ ] Bước 3: Kiểm nhánh chủ đề
      Nhìn vào 1 khối Hệ đang có bài (ví dụ "Toán Chuyên") — bên dưới số tổng là danh sách nhánh chủ đề cấp 1 kèm số bài mỗi nhánh.
      You should see: tên nhánh khớp với cây phân loại Thầy đã tạo trong "Cài đặt → Quản lý phân loại"; nhánh nào chưa có bài thì hiện số 0 (không bị ẩn).

- [ ] Bước 4: Kiểm bấm số nhảy màn — cấp Hệ
      Bấm vào số của một khối Hệ bất kỳ.
      You should see: chuyển sang màn **"Bài"**, dải tab hệ ở cột lọc tự chuyển sang đúng hệ vừa bấm, danh sách chỉ còn bài của hệ đó.

- [ ] Bước 5: Kiểm bấm số nhảy màn — cấp nhánh
      Quay lại "Thống kê" (bấm nút trên nav rail), bấm vào số của một nhánh chủ đề cụ thể.
      You should see: chuyển sang "Bài", đúng hệ chứa nhánh đó được chọn, cây chuyên đề bên trái tự bấm đúng nhánh, danh sách chỉ còn bài thuộc nhánh đó (kể cả nhánh con bên trong nếu có).

- [ ] Bước 6: Kiểm bấm "Chưa phân loại"
      Quay lại "Thống kê", bấm vào số của khối "Chưa phân loại".
      You should see: chuyển sang "Bài", đúng hành vi như bấm "Chưa phân loại" trên Header từ trước tới giờ (dải băng amber "Đang xem: Bài chưa phân loại").

> Nếu tới đây mọi thứ đúng, Task 1–3 đã là một tính năng trọn vẹn — có thể dừng nghỉ ở đây nếu cần, phần dưới (Task 4–8) độc lập hoàn toàn.

---

### Task 4: Tạo `usageStats.js` + viết test (làm & kiểm trước, độc lập giao diện)

**What you'll have when this is done:** Một hàm thuần `countUsageByProblemId`, có test khoá hành vi, sẵn sàng để các phần khác dùng.

- [ ] Bước 1: Tạo file mới `src/utils/usageStats.js`:
      ```javascript
      // Đếm số lần mỗi bài xuất hiện trong lịch sử xuất đề (export_history) — đây là nguồn
      // "đã dùng" THẬT. KHÔNG dùng cột problems.timesUsed: cột đó không được cập nhật ở bất
      // kỳ đâu trong code (kể cả lúc xuất đề), luôn = 0. Hàm THUẦN (không đụng DB/React) để test được.
      export const countUsageByProblemId = (historyItems) => {
        const counts = {};
        for (const item of historyItems || []) {
          for (const id of item.problem_ids || []) {
            counts[id] = (counts[id] || 0) + 1;
          }
        }
        return counts;
      };
      ```

- [ ] Bước 2: Tạo file mới `src/utils/usageStats.test.js`:
      ```javascript
      import { countUsageByProblemId } from './usageStats';

      test('bài xuất hiện ở 2 lần xuất khác nhau -> đếm 2', () => {
        const history = [
          { problem_ids: ['a', 'b'] },
          { problem_ids: ['a', 'c'] },
        ];
        expect(countUsageByProblemId(history)).toEqual({ a: 2, b: 1, c: 1 });
      });

      test('bài chưa từng nằm trong đề nào -> không có trong map', () => {
        const history = [{ problem_ids: ['a'] }];
        expect(countUsageByProblemId(history)['chua-tung-dung']).toBeUndefined();
      });

      test('chưa xuất đề nào -> map rỗng', () => {
        expect(countUsageByProblemId([])).toEqual({});
      });

      test('lịch sử rỗng/thiếu problem_ids -> không lỗi, vẫn ra map hợp lệ', () => {
        expect(countUsageByProblemId(undefined)).toEqual({});
        expect(countUsageByProblemId([{ problem_ids: undefined }])).toEqual({});
      });
      ```

- [ ] Bước 3: Check it works
      Run: `npm test -- --watchAll=false`
      You should see: dòng tổng kết `Tests: <tổng số cũ + 4> passed` — không có bài đỏ.

- [ ] Bước 4: Lưu tiến độ
      Run: `git add src/utils/usageStats.js src/utils/usageStats.test.js && git commit -m "feat(usage): ham thuan dem so lan da dung tu export_history"`

---

### Task 5: Nguồn "đã dùng" dùng chung trong `App.jsx`

**What you'll have when this is done:** `App.jsx` tự tải lịch sử xuất đề và tính sẵn số lần dùng của mỗi bài, truyền xuống các nơi cần (chưa hiện gì mới trên giao diện — nối hiển thị ở Task 6–7).

- [ ] Bước 1: Mở `src/hooks/useUIState.js`. Tìm dòng:
      ```js
      const [filterDifficulty, setFilterDifficulty] = useState('all'); // Task 16: lọc theo Độ khó (difficulty id)
      ```
      Ngay SAU dòng đó, thêm:
      ```js
      const [onlyUnused, setOnlyUnused] = useState(false); // chỉ hiện bài CHƯA dùng trong đề đã xuất
      ```
      Rồi tìm khối `clearFilters`:
      ```js
      const clearFilters = () => {
        setSearchTerm('');
        setFilterTopic('all');
        setFilterGrade('all');
        setFilterDifficulty('all');
      };
      ```
      Thay bằng:
      ```js
      const clearFilters = () => {
        setSearchTerm('');
        setFilterTopic('all');
        setFilterGrade('all');
        setFilterDifficulty('all');
        setOnlyUnused(false);
      };
      ```
      Cuối cùng tìm dòng return có `filterDifficulty, setFilterDifficulty,`:
      ```js
      filterDifficulty, setFilterDifficulty,
      sortBy, setSortBy,
      ```
      Thay bằng:
      ```js
      filterDifficulty, setFilterDifficulty,
      onlyUnused, setOnlyUnused,
      sortBy, setSortBy,
      ```

- [ ] Bước 2: Mở `src/App.jsx`. Tìm dòng đầu file:
      ```jsx
      import React, { useEffect, useState } from 'react';
      ```
      Thay bằng (thêm `useMemo`):
      ```jsx
      import React, { useEffect, useState, useMemo } from 'react';
      ```
      Tìm dòng:
      ```jsx
      import { useAutoBackup } from './hooks/useAutoBackup';
      ```
      Ngay SAU dòng đó, thêm:
      ```jsx
      import { useExportHistory } from './hooks/useExportHistory';
      import { countUsageByProblemId } from './utils/usageStats';
      ```

- [ ] Bước 3: Vẫn trong `App.jsx`, tìm khối (ngay sau effect đặt hệ mặc định):
      ```jsx
      useEffect(() => {
        if (selectedHe) return;
        const firstHe = categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position)[0];
        if (firstHe) setSelectedHe(firstHe.id);
      }, [categories, selectedHe, setSelectedHe]);

      // 2. ĐĂNG KÝ PHÍM TẮT
      ```
      Thay bằng (thêm khối tải lịch sử xuất đề + tính số lần dùng):
      ```jsx
      useEffect(() => {
        if (selectedHe) return;
        const firstHe = categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position)[0];
        if (firstHe) setSelectedHe(firstHe.id);
      }, [categories, selectedHe, setSelectedHe]);

      // Nguồn "đã dùng" — đếm từ export_history (KHÔNG dùng cột problems.timesUsed, cột này chết).
      // Tải lại mỗi khi vào "Bài" hoặc "Thống kê" (gồm cả lúc mở app, vì màn mặc định là "Thống kê")
      // để số liệu luôn mới ngay cả khi vừa xuất xong một đề rồi quay lại 1 trong 2 màn này.
      const { historyItems, loadHistory } = useExportHistory();
      useEffect(() => {
        if (ui.currentView === 'feed' || ui.currentView === 'dashboard') loadHistory();
      }, [ui.currentView, loadHistory]);
      const usageByProblemId = useMemo(() => countUsageByProblemId(historyItems), [historyItems]);

      // 2. ĐĂNG KÝ PHÍM TẮT
      ```

- [ ] Bước 4: Tìm khối `<DataGrid ... />`:
      ```jsx
                <DataGrid
                  problems={problems}
                  sortBy={ui.sortBy} filterTopic={ui.filterTopic} filterGrade={ui.filterGrade} filterDifficulty={ui.filterDifficulty} searchTerm={ui.searchTerm}
                  selectedHe={ui.selectedHe} unclassifiedMode={ui.unclassifiedMode}
      ```
      Thay bằng (thêm 2 dòng prop mới):
      ```jsx
                <DataGrid
                  problems={problems}
                  sortBy={ui.sortBy} filterTopic={ui.filterTopic} filterGrade={ui.filterGrade} filterDifficulty={ui.filterDifficulty} searchTerm={ui.searchTerm}
                  usageByProblemId={usageByProblemId} onlyUnused={ui.onlyUnused}
                  selectedHe={ui.selectedHe} unclassifiedMode={ui.unclassifiedMode}
      ```

- [ ] Bước 5: Tìm khối `<FilterSidebar ... />`:
      ```jsx
                <FilterSidebar
                  selectedHe={ui.selectedHe} onSelectHe={ui.selectHe}
                  filterTopic={ui.filterTopic} onSelectBranch={ui.setFilterTopic}
                  filterDifficulty={ui.filterDifficulty} onDifficulty={ui.setFilterDifficulty}
                  filterGrade={ui.filterGrade} onGrade={ui.setFilterGrade}
                  onClear={ui.clearFilters}
                  onCollapse={() => ui.setSidebarCollapsed(true)}
                />
      ```
      Thay bằng (thêm 1 dòng prop mới):
      ```jsx
                <FilterSidebar
                  selectedHe={ui.selectedHe} onSelectHe={ui.selectHe}
                  filterTopic={ui.filterTopic} onSelectBranch={ui.setFilterTopic}
                  filterDifficulty={ui.filterDifficulty} onDifficulty={ui.setFilterDifficulty}
                  filterGrade={ui.filterGrade} onGrade={ui.setFilterGrade}
                  onlyUnused={ui.onlyUnused} onToggleOnlyUnused={() => ui.setOnlyUnused((v) => !v)}
                  onClear={ui.clearFilters}
                  onCollapse={() => ui.setSidebarCollapsed(true)}
                />
      ```

- [ ] Bước 6: Tìm khối `<PreviewModal ... />`:
      ```jsx
      {ui.selectedPreview && (
        <PreviewModal
          problem={ui.selectedPreview}
          onClose={() => ui.setSelectedPreview(null)}
          onCopied={() => success('Đã chép mã LaTeX')}
        />
      )}
      ```
      Thay bằng (thêm 1 dòng prop mới):
      ```jsx
      {ui.selectedPreview && (
        <PreviewModal
          problem={ui.selectedPreview}
          usageCount={usageByProblemId[ui.selectedPreview.id] || 0}
          onClose={() => ui.setSelectedPreview(null)}
          onCopied={() => success('Đã chép mã LaTeX')}
        />
      )}
      ```

- [ ] Bước 7: Check it works
      Run: `npm run build`
      You should see: `Compiled successfully`, **0 warning**. (`DataGrid`/`FilterSidebar`/`PreviewModal` sẽ tạm thời "phớt lờ" các prop mới này — bình thường, chưa lỗi gì, sẽ dùng tới ở Task 6–7.)

- [ ] Bước 8: Lưu tiến độ
      Run: `git add src/hooks/useUIState.js src/App.jsx && git commit -m "feat(usage): tai lich su xuat de dung chung + tinh so lan da dung"`

---

### Task 6: Áp dụng trong `DataGrid` + `FilterSidebar`

**What you'll have when this is done:** Bộ lọc "Chỉ hiện bài chưa dùng" hoạt động thật; mỗi thẻ bài đã có sẵn số lần dùng (chưa hiện ra giao diện — nối ở Task 7).

- [ ] Bước 1: Mở `src/components/DataGrid.jsx`. Tìm khối khai báo component:
      ```jsx
      const DataGrid = ({
        problems, sortBy, filterTopic, filterGrade, filterDifficulty, searchTerm, selectedHe, unclassifiedMode, selectedIds,
        onSelectChange, onPreviewClick, onAddToCart, onDelete, onEdit,
        onBulkAddToCart, onBulkDelete, onClearSelection, onExitUnclassified,
      }) => {
      ```
      Thay bằng (thêm 2 prop mới):
      ```jsx
      const DataGrid = ({
        problems, sortBy, filterTopic, filterGrade, filterDifficulty, searchTerm, selectedHe, unclassifiedMode, selectedIds,
        usageByProblemId, onlyUnused,
        onSelectChange, onPreviewClick, onAddToCart, onDelete, onEdit,
        onBulkAddToCart, onBulkDelete, onClearSelection, onExitUnclassified,
      }) => {
      ```

- [ ] Bước 2: Tìm khối lọc:
      ```js
          if (filterDifficulty !== 'all' && !Object.values(p.difficultyByHe || {}).includes(filterDifficulty)) return false;
          return true;
        });

        return filtered.sort((a, b) => {
      ```
      Thay bằng (thêm điều kiện lọc "chỉ hiện chưa dùng"):
      ```js
          if (filterDifficulty !== 'all' && !Object.values(p.difficultyByHe || {}).includes(filterDifficulty)) return false;
          if (onlyUnused && usageByProblemId[p.id]) return false;
          return true;
        });

        return filtered.sort((a, b) => {
      ```
      Rồi tìm dòng cuối của cùng `useMemo` đó (mảng phụ thuộc):
      ```js
      }, [problems, sortBy, validBranchIds, filterGrade, filterDifficulty, searchTerm, selectedHe, unclassifiedMode, parentMap, searchIndex]);
      ```
      Thay bằng (thêm 2 phụ thuộc mới):
      ```js
      }, [problems, sortBy, validBranchIds, filterGrade, filterDifficulty, searchTerm, selectedHe, unclassifiedMode, parentMap, searchIndex, onlyUnused, usageByProblemId]);
      ```

- [ ] Bước 3: Tìm khối `<ProblemCard ... />` bên trong `itemContent`:
      ```jsx
              <ProblemCard
                problem={{ ...problem, gradeNames }}
                classification={classification}
                selected={selectedIds.includes(problem.id)}
                matchFields={matchFieldsById[problem.id]}
      ```
      Thay bằng (thêm prop `usageCount`):
      ```jsx
              <ProblemCard
                problem={{ ...problem, gradeNames }}
                classification={classification}
                selected={selectedIds.includes(problem.id)}
                matchFields={matchFieldsById[problem.id]}
                usageCount={usageByProblemId[problem.id] || 0}
      ```

- [ ] Bước 4: Mở `src/components/FilterSidebar.jsx`. Tìm khối khai báo component:
      ```jsx
      const FilterSidebar = ({
        selectedHe, onSelectHe,
        filterTopic, onSelectBranch,
        filterDifficulty, onDifficulty,
        filterGrade, onGrade,
        onClear, onCollapse,
      }) => {
      ```
      Thay bằng (thêm 2 prop mới):
      ```jsx
      const FilterSidebar = ({
        selectedHe, onSelectHe,
        filterTopic, onSelectBranch,
        filterDifficulty, onDifficulty,
        filterGrade, onGrade,
        onlyUnused, onToggleOnlyUnused,
        onClear, onCollapse,
      }) => {
      ```

- [ ] Bước 5: Tìm khối nút "Xoá lọc":
      ```jsx
      <button className="card-btn" style={{ alignSelf: 'flex-start' }} onClick={onClear}>
        <X size={14} /> Xoá lọc
      </button>
      ```
      Thay bằng (thêm ô tick NGAY TRƯỚC nút):
      ```jsx
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--color-text)', cursor: 'pointer' }}>
        <input type="checkbox" checked={onlyUnused} onChange={onToggleOnlyUnused} />
        Chỉ hiện bài chưa dùng
      </label>

      <button className="card-btn" style={{ alignSelf: 'flex-start' }} onClick={onClear}>
        <X size={14} /> Xoá lọc
      </button>
      ```

- [ ] Bước 6: Check it works
      Run: `npm run build`
      You should see: `Compiled successfully`, **0 warning**.

- [ ] Bước 7: Lưu tiến độ
      Run: `git add src/components/DataGrid.jsx src/components/FilterSidebar.jsx && git commit -m "feat(usage): loc chi hien bai chua dung + truyen so lan dung cho the bai"`

---

### Task 7: Badge "Đã dùng" trên thẻ + Xem đầy đủ, dọn thẻ Header cũ

**What you'll have when this is done:** Thẻ bài và "Xem đầy đủ" hiện "🔁 Đã dùng N lần" khi có; Header không còn thẻ "Lượt sử dụng" (số liệu chết).

- [ ] Bước 1: Mở `src/components/ProblemCard.jsx`. Tìm dòng:
      ```jsx
      const ProblemCard = ({
        problem, classification, selected, matchFields,
        onToggleSelect, onPreview, onAddToCart, onEdit, onDelete, onCopied,
      }) => {
      ```
      Thay bằng (thêm prop `usageCount`):
      ```jsx
      const ProblemCard = ({
        problem, classification, selected, matchFields, usageCount,
        onToggleSelect, onPreview, onAddToCart, onEdit, onDelete, onCopied,
      }) => {
      ```
      Rồi tìm khối badge:
      ```jsx
          {(problem.figStatement || problem.figSolution)
            ? <span style={{ color: 'var(--color-cobalt)', fontWeight: 500 }}> · 📐 Có hình</span>
            : ''}
          {matchFields && matchFields.length > 0 && (
      ```
      Thay bằng (thêm badge "đã dùng" ở giữa):
      ```jsx
          {(problem.figStatement || problem.figSolution)
            ? <span style={{ color: 'var(--color-cobalt)', fontWeight: 500 }}> · 📐 Có hình</span>
            : ''}
          {usageCount > 0
            ? <span style={{ color: 'var(--color-cobalt)', fontWeight: 500 }}> · 🔁 Đã dùng {usageCount} lần</span>
            : ''}
          {matchFields && matchFields.length > 0 && (
      ```

- [ ] Bước 2: Mở `src/components/PreviewModal.jsx`. Tìm dòng:
      ```jsx
      const PreviewModal = ({ problem, onClose, onCopied }) => {
      ```
      Thay bằng:
      ```jsx
      const PreviewModal = ({ problem, onClose, onCopied, usageCount }) => {
      ```
      Rồi tìm dòng:
      ```jsx
        <PreviewPanel problem={problem} onClose={onClose} onCopied={onCopied} />
      ```
      Thay bằng:
      ```jsx
        <PreviewPanel problem={problem} onClose={onClose} onCopied={onCopied} usageCount={usageCount} />
      ```

- [ ] Bước 3: Mở `src/components/PreviewPanel.jsx`. Tìm dòng:
      ```jsx
      const PreviewPanel = ({ problem, onClose, onCopied }) => {
      ```
      Thay bằng:
      ```jsx
      const PreviewPanel = ({ problem, onClose, onCopied, usageCount }) => {
      ```
      Rồi tìm khối:
      ```jsx
            {(problem.figStatement || problem.figSolution) ? ' • 📐 Có hình' : ''}
          </span>
      ```
      Thay bằng (thêm dòng badge "đã dùng"):
      ```jsx
            {(problem.figStatement || problem.figSolution) ? ' • 📐 Có hình' : ''}
            {usageCount > 0 ? ` • 🔁 Đã dùng ${usageCount} lần` : ''}
          </span>
      ```

- [ ] Bước 4: Mở `src/components/Header.jsx`. Thay TOÀN BỘ nội dung file bằng:
      ```jsx
      import React from 'react';
      import { BookOpen, AlertCircle, ShoppingCart } from 'lucide-react';

      const Header = ({ stats, onUnclassifiedClick, unclassifiedActive }) => {
        const statCards = [
          { label: 'Tổng bài tập', value: stats.total, icon: <BookOpen size={22} color="var(--color-cobalt)" /> },
          { label: 'Chưa phân loại', value: stats.unclassified, icon: <AlertCircle size={22} color="var(--color-amber)" /> },
          { label: 'Giỏ đề thi', value: stats.cartCount, icon: <ShoppingCart size={22} color="var(--color-success)" /> },
        ];

        return (
          <div style={{ backgroundColor: 'var(--color-chrome)', borderBottom: '1px solid var(--color-border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px var(--shadow)' }}>

            {/* Tên App + người dùng */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
                Problem Bank <span style={{ color: 'var(--color-cobalt)' }}>Pro</span>
              </h1>
              <div style={{ padding: '0.35rem 0.85rem', backgroundColor: 'var(--color-surface-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-pill)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Thầy Sơn
              </div>
            </div>

            {/* Cụm thẻ thống kê */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              {statCards.map((stat, idx) => {
                const clickable = stat.label === 'Chưa phân loại';
                const active = clickable && unclassifiedActive;
                return (
                  <div
                    key={idx}
                    onClick={clickable ? onUnclassifiedClick : undefined}
                    title={clickable ? 'Bấm để xem bài chưa phân loại' : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      backgroundColor: active ? 'var(--color-amber-bg)' : 'var(--color-surface)',
                      padding: '0.5rem 1.25rem', borderRadius: '10px', minWidth: '140px',
                      cursor: clickable ? 'pointer' : 'default',
                      outline: active ? '2px solid var(--color-amber)' : 'none',
                    }}
                  >
                    <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-surface-muted)', borderRadius: '8px', display: 'flex' }}>
                      {stat.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>{stat.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        );
      };

      export default Header;
      ```

- [ ] Bước 5: Mở `src/App.jsx`. Tìm khối `<Header ... />`:
      ```jsx
      <Header
        stats={{
          total: problems.length,
          unclassified: problems.filter(p => (p.categoryIds?.length || 0) === 0).length,
          cartCount: cartCount,
          used: problems.reduce((sum, p) => sum + (p.timesUsed || 0), 0)
        }}
        unclassifiedActive={ui.unclassifiedMode}
        onUnclassifiedClick={goToUnclassified}
      />
      ```
      Thay bằng (bỏ dòng `used`):
      ```jsx
      <Header
        stats={{
          total: problems.length,
          unclassified: problems.filter(p => (p.categoryIds?.length || 0) === 0).length,
          cartCount: cartCount,
        }}
        unclassifiedActive={ui.unclassifiedMode}
        onUnclassifiedClick={goToUnclassified}
      />
      ```

- [ ] Bước 6: Check it works
      Run: `npm run build`
      You should see: `Compiled successfully`, **0 warning**.

- [ ] Bước 7: Lưu tiến độ
      Run: `git add src/components/ProblemCard.jsx src/components/PreviewModal.jsx src/components/PreviewPanel.jsx src/components/Header.jsx src/App.jsx && git commit -m "feat(usage): badge da dung tren the va xem day du, bo the luot su dung chet"`

---

### Task 8: Kiểm bằng mắt — theo dõi "đã dùng"

**What you'll have when this is done:** Bằng chứng tận mắt: xuất đề xong, badge cập nhật đúng; lọc "chưa dùng" hoạt động; Header gọn lại còn 3 thẻ.

- [ ] Bước 1: Chạy app (nếu chưa chạy)
      Run: `npx tauri dev`
      You should see: Header giờ chỉ còn **3 thẻ** (Tổng bài tập / Chưa phân loại / Giỏ đề thi) — không còn "Lượt sử dụng".

- [ ] Bước 2: Chuẩn bị 1 bài để kiểm. Vào "Bài", chọn một bài bất kỳ đang **chưa có** badge "🔁 Đã dùng" (tức là chưa từng xuất). Nếu mọi bài đều đã từng xuất, tạo tạm 1 bài mới bất kỳ để kiểm rồi xoá sau.

- [ ] Bước 3: Thêm bài đó vào **Giỏ**, vào "Giỏ đề thi" → **"Xuất file nội dung"** → chọn 1 template → Xuất (lưu file `.tex` ra đâu cũng được, ví dụ Desktop).
      (Nếu màn hiện "Chưa cấu hình thư mục template" — vào Cài đặt chọn thư mục template trước, rồi quay lại làm tiếp bước này.)

- [ ] Bước 4: Quay lại "Bài" (hoặc "Thống kê" xem tổng, rồi bấm vào Hệ/nhánh của bài đó để về "Bài").
      You should see: thẻ của bài vừa xuất giờ hiện thêm **"· 🔁 Đã dùng 1 lần"** trong dòng phân loại/tag.

- [ ] Bước 5: Lặp lại Bước 3 (xuất thêm 1 lần nữa với CÙNG bài đó trong giỏ).
      You should see: badge đổi thành **"Đã dùng 2 lần"**.

- [ ] Bước 6: Bấm **"Xem đầy đủ"** trên thẻ bài đó.
      You should see: dòng thông tin đầu modal cũng có **"• 🔁 Đã dùng 2 lần"**.

- [ ] Bước 7: Kiểm bộ lọc "Chỉ hiện bài chưa dùng". Ở cột lọc bên trái, tick ô **"Chỉ hiện bài chưa dùng"**.
      You should see: bài vừa xuất (đã dùng 2 lần) **biến mất** khỏi danh sách; các bài chưa từng xuất vẫn hiện đủ. Bỏ tick → bài đó hiện lại.

- [ ] Bước 8: Dọn dẹp. Nếu Bước 2 có tạo bài mới để kiểm, xoá bài đó (chuyển vào Thùng rác là đủ). Xoá file `.tex` kiểm thử nếu không cần giữ.

---

### Task 9: Kiểm tự động toàn kho + xác nhận phạm vi + lưu

**What you'll have when this is done:** Bằng chứng cả kho vẫn xanh, đường xuất LaTeX hoàn toàn không đổi, và phạm vi sửa đúng như plan.

- [ ] Bước 1: Chạy toàn bộ bài kiểm
      Run: `npm test -- --watchAll=false`
      You should see: dòng tổng kết `Tests: <tất cả> passed` — không có bài đỏ, gồm cả **golden export KHÔNG đổi** và 4 test mới của `usageStats`.

- [ ] Bước 2: Kiểm an toàn LaTeX (dù tính năng này không đụng đường xuất): tạo 1 bài có công thức `$x^2 + y^2 = z^2$`, thêm vào giỏ, **Xuất file nội dung** ra `D:\check-thong-ke.tex`. Mở file: công thức còn nguyên vẹn — chứng tỏ badge/lọc/màn Thống kê không làm hỏng nội dung lưu/xuất. Xoá bài kiểm thử này sau khi xong.

- [ ] Bước 3: Xác nhận phạm vi sửa đúng như plan
      Run: `git log --oneline -6`
      You should see: đúng các commit của Task 2/4/5/6/7 (không đếm docs) — KHÔNG có commit nào đụng `buildProblemTex.js`, `buildContentFile.js`, `db.js`, `ExportModal.jsx`, `ExportHistoryModal.jsx`, hay file Rust nào.
      Run: `git status --short`
      You should see: không còn gì chưa commit ngoài các file đã biết (`src-tauri/Cargo.toml` do CRLF).

- [ ] Bước 4: Kiểm app build bản phát hành sạch
      Run: `npm run build`
      You should see: `Compiled successfully`, **0 warning**.

> **Lưu ý bàn giao:** Sau khi build xong 9 Task, **Claude sẽ check lại** (đối chiếu plan từng dòng, chạy test, soi golden export, xác nhận đúng phạm vi file) — **Thầy đã nghiệm thu GUI ở Task 3 và Task 8 rồi nên không cần lặp lại**. **Chỉ `git push` sau khi Claude check xong** — đúng nhịp các phiên trước.

---

## Ready to Build

The plan is saved. Here's what to do next:

1. Read through the whole plan once before starting
2. Work through tasks in order — don't skip ahead
3. Complete the "Check it works" step before moving to the next task
4. If something doesn't work as expected, stop and describe what you see — don't try random fixes

Say "let's start building" when you're ready to begin Task 1.

---

## Ghi chú cho bước Claude check lại
- `git status`/`git log`: đúng 5 commit code (Task 2, 4, 5, 6, 7) + docs spec/plan. KHÔNG đụng `buildProblemTex.js`, `buildContentFile.js`, `db.js` (schema), `ExportModal.jsx`, `ExportHistoryModal.jsx`, Rust, `package.json` (không thêm thư viện).
- Test: tổng cũ (35) + 4 mới của `usageStats.test.js` = **39 passed**, golden export trong đó **không đổi**.
- `usageByProblemId` tính từ `historyItems` của MỘT instance `useExportHistory()` riêng ở `App.jsx` — KHÔNG đụng 2 instance cũ trong `ExportModal.jsx`/`ExportHistoryModal.jsx`. Refresh qua `useEffect` khoá theo `ui.currentView` (chạy khi mount vì màn mặc định là `'dashboard'`, và mỗi lần vào lại `'feed'`/`'dashboard'`).
- `DashboardPage` chỉ nhận `problems` + 3 callback điều hướng, **không nhận `usageByProblemId`** (đúng thiết kế đã chốt — phần "đã dùng" chỉ hiện ở badge/lọc, không phải nội dung màn Thống kê).
- `currentView` mặc định đổi `'feed'` → `'dashboard'`; xác nhận `useUIState.js` comment liệt kê đủ 5 giá trị.
- Nhánh chủ đề trong Dashboard = **chỉ cấp 1**, đếm gộp cả nhánh con qua `getDescendantIds` (tái dùng từ `useTaxonomy.js`, không viết lại logic cây).
- Badge "đã dùng" chỉ hiện khi `usageCount > 0`, đúng khuôn badge "📐 Có hình" đã có (không tạo ồn thị giác cho bài chưa dùng).
- Header còn đúng 3 thẻ (`Tổng bài tập`/`Chưa phân loại`/`Giỏ đề thi`); import `Activity` đã gỡ khỏi `Header.jsx`; `used` đã gỡ khỏi object `stats` trong `App.jsx`.
- `onlyUnused` reset đúng trong `clearFilters()`.
