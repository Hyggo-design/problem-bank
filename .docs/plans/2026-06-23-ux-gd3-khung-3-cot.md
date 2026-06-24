# GĐ3 (đợt 1) — Khung điều hướng + Lọc hệ-first — Build Plan

**What we're building:** Khung 3 cột cho app — thanh điều hướng dọc (nav rail) bên trái, cột lọc "khoá 1 hệ" ở giữa, danh sách thẻ bài bên phải.

**Why:** Giúp Thầy soạn nhanh đúng trong hệ đang dạy (THCS/THPT/Chuyên/Olympic) — cây lọc ngắn–sạch theo hệ, điều hướng rõ ràng, feed rộng.

**Approach:** Tách state khung vào `useUIState` trước (không đụng giao diện), rồi dựng từng cột (NavRail → SettingsPage → FilterSidebar → cây lọc) sao cho **sau mỗi task app vẫn chạy được**. Tuyệt đối **không đụng** logic xuất `.tex`/schema; chỉ *đọc thêm* taxonomy để lọc. Kết thúc bằng nghiệm thu byte-identical.

**Files we'll create or change:**
- `src/hooks/useUIState.js` — sửa: thêm state khung (`selectedHe`, `unclassifiedMode`, gập rail/sidebar, `currentView='settings'`) + luật reset
- `src/index.css` — sửa: thêm class cho rail/sidebar/tab hệ/cây lọc (theo quy ước GĐ2)
- `src/components/NavRail.jsx` — **mới**: cột 1 (điều hướng dọc)
- `src/components/SettingsPage.jsx` — **mới**: cột 3 khi ở "Cài đặt" (chứa nút Quản lý phân loại)
- `src/components/FilterSidebar.jsx` — **mới**: cột 2 (tab hệ + cây lọc + độ khó + lớp)
- `src/components/Header.jsx` — sửa: cho bấm số "Chưa phân loại"
- `src/components/DataGrid.jsx` — sửa: lọc theo hệ + chế độ "chưa phân loại"
- `src/components/ControlsRow.jsx` — sửa: rút còn ô tìm + sắp xếp
- `src/App.jsx` — sửa: ráp 3 cột; bỏ Toolbar + công tắc 2 tab
- `src/components/Toolbar.jsx` — bỏ dùng (gỡ import; giữ file lại phòng khi cần)

> **Quy ước chung khi làm:**
> - **Kiểm biên dịch:** trong PowerShell chạy `$env:CI="false"; npm run build` → mong đợi dòng `Compiled successfully.` và **0 warning**.
> - **Chạy thật để nhìn:** `npx tauri dev` (app chỉ chạy với DB qua lệnh này, KHÔNG phải `npm start`).
> - **Lưu tiến độ:** mỗi task xong chạy lệnh commit ở cuối task. Thông điệp có kèm dòng đồng tác giả theo quy ước.
> - **Không đổi cấu trúc CSDL trong cả đợt này** → không cần backup DB. Dữ liệu hiện là dữ liệu test.

---

### Task 1: Thêm "bộ nhớ trạng thái" cho khung (chưa đụng giao diện)

**What you'll have when this is done:** `useUIState` có sẵn các trạng thái mới cho rail/cột lọc; app vẫn chạy y như cũ (chưa ai dùng các trạng thái đó).

- [ ] Bước 1: Mở `src/hooks/useUIState.js`. Trong phần khai báo state, thêm:
      ```js
      const [selectedHe, setSelectedHe] = useState(null);          // id hệ đang khoá (null = chưa đặt)
      const [unclassifiedMode, setUnclassifiedMode] = useState(false); // đang xem bài chưa phân loại?
      const [railCollapsed, setRailCollapsed] = useState(false);   // nav rail thu còn icon?
      const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // cột lọc gập?
      ```
      Và đổi chú thích dòng `currentView` thành `'feed' | 'cart' | 'settings'`.

- [ ] Bước 2: Ngay dưới hàm `clearFilters`, thêm 2 hàm tiện ích (đặt giúp việc reset đúng chỗ một lần):
      ```js
      // Đổi hệ: xoá lựa chọn nhánh + độ khó cũ (thuộc hệ cũ); thoát chế độ chưa-phân-loại.
      const selectHe = (heId) => {
        setSelectedHe(heId);
        setFilterTopic('all');
        setFilterDifficulty('all');
        setUnclassifiedMode(false);
      };
      // Xem bài chưa phân loại (bật từ Header).
      const showUnclassified = () => setUnclassifiedMode(true);
      ```

- [ ] Bước 3: Thêm tất cả vào khối `return { ... }`:
      ```js
      selectedHe, setSelectedHe, selectHe,
      unclassifiedMode, setUnclassifiedMode, showUnclassified,
      railCollapsed, setRailCollapsed,
      sidebarCollapsed, setSidebarCollapsed,
      ```

- [ ] Bước 4: Kiểm biên dịch.
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully.` — **0 warning**. (App chạy `npx tauri dev` vẫn y hệt cũ.)
      *Nếu lỗi:* thường là quên dấu phẩy trong `return` hoặc trùng tên biến — đọc dòng lỗi, sửa đúng dòng đó.

- [ ] Bước 5: Lưu tiến độ.
      Run: `git add . ; git commit -m "feat(ux): them state khung GD3 vao useUIState" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 2: Thêm CSS cho rail / cột lọc / tab hệ (chưa ai dùng)

**What you'll have when this is done:** Có sẵn các "kiểu dáng" (class CSS) để các cột mới gọi tới ở task sau; giao diện hiện tại chưa đổi.

- [ ] Bước 1: Mở `src/index.css`, xuống **cuối file**, thêm khối sau (đặt theo đúng token Ocean Tint sẵn có):
      ```css
      /* === GĐ3: khung 3 cột (rail · cột lọc · feed) === */
      .nav-rail { display: flex; flex-direction: column; gap: 4px; padding: 10px 8px;
        background: var(--color-surface); border-right: 1px solid var(--color-border); }
      .rail-cta { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: none;
        border-radius: var(--radius-md); background: var(--color-cobalt); color: #fff; font-weight: 600; font-size: 0.9rem; }
      .rail-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: none; background: transparent;
        color: var(--color-text-muted); border-radius: var(--radius-md); font-size: 0.9rem; text-align: left; }
      .rail-item:hover { background: var(--color-surface-muted); }
      .rail-item.on { background: var(--color-cobalt-bg); color: var(--color-cobalt-text); font-weight: 600; }
      .rail-ghost { border: 1px solid var(--color-border); background: var(--color-surface); }

      .filter-sidebar { width: 248px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px;
        padding: 14px; background: var(--color-surface); border-right: 1px solid var(--color-border); overflow-y: auto; }
      .he-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .he-tab { padding: 7px 0; text-align: center; font-size: 0.82rem; border: 1px solid var(--color-border);
        background: var(--color-surface-muted); color: var(--color-text-muted); border-radius: 7px; }
      .he-tab.on { background: var(--color-cobalt); color: #fff; border-color: var(--color-cobalt); font-weight: 600; }
      .sidebar-label { font-size: 0.72rem; color: var(--color-text-subtle); font-weight: 600;
        text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
      .tree-row { display: flex; align-items: center; gap: 6px; padding: 3px 7px; font-size: 0.85rem;
        color: var(--color-text); border-radius: 6px; }
      .tree-row:hover { background: var(--color-surface-muted); }
      .tree-row.on { background: var(--color-cobalt-bg); color: var(--color-cobalt-text); font-weight: 600; }
      .chip { font-size: 0.8rem; padding: 4px 10px; border-radius: var(--radius-pill);
        background: var(--color-surface-muted); color: var(--color-text-muted); border: 1px solid var(--color-border); }
      .chip.on { background: var(--color-cobalt); color: #fff; border-color: var(--color-cobalt); }
      ```

- [ ] Bước 2: Kiểm biên dịch.
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully.` — 0 warning. Giao diện app **chưa đổi gì** (CSS mới chưa được dùng).

- [ ] Bước 3: Lưu tiến độ.
      Run: `git add . ; git commit -m "feat(ux): them CSS rail/sidebar/tab he cho GD3" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 3: Dựng nav rail (cột 1) và thay công tắc 2 tab

**What you'll have when this is done:** Mép trái app là thanh điều hướng dọc thật (Thêm bài · Import · Bài · Giỏ · Cài đặt), gập được; feed/Giỏ vẫn chạy. (Cài đặt tạm hiện ô trống — Task 4 làm tiếp.)

- [ ] Bước 1: Tạo file `src/components/NavRail.jsx`:
      ```jsx
      import React from 'react';
      import { PlusSquare, Upload, List, ShoppingCart, Settings, ChevronsLeft, ChevronsRight } from 'lucide-react';

      const NavRail = ({ currentView, onNavigate, onAdd, onImport, cartCount, collapsed, onToggleCollapse }) => {
        const lbl = (text) => (collapsed ? null : <span>{text}</span>);
        return (
          <nav className="nav-rail" style={{ width: collapsed ? 56 : 168 }}>
            <button className="rail-item" onClick={onToggleCollapse} aria-label="Gập/mở thanh điều hướng"
              style={{ justifyContent: collapsed ? 'center' : 'flex-end' }}>
              {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>

            <button className="rail-cta" onClick={onAdd} style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <PlusSquare size={18} /> {lbl('Thêm bài')}
            </button>
            <button className="rail-item rail-ghost" onClick={onImport} style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <Upload size={18} /> {lbl('Import')}
            </button>

            <div style={{ height: 1, background: 'var(--color-border-subtle)', margin: '8px 2px' }} />

            <button className={`rail-item ${currentView === 'feed' ? 'on' : ''}`} onClick={() => onNavigate('feed')}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <List size={18} /> {lbl('Bài')}
            </button>
            <button className={`rail-item ${currentView === 'cart' ? 'on' : ''}`} onClick={() => onNavigate('cart')}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <ShoppingCart size={18} /> {lbl('Giỏ')}
              {cartCount > 0 && <span className="view-badge" style={{ marginLeft: 'auto' }}>{cartCount}</span>}
            </button>

            <div style={{ flex: 1 }} />

            <button className={`rail-item ${currentView === 'settings' ? 'on' : ''}`} onClick={() => onNavigate('settings')}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <Settings size={18} /> {lbl('Cài đặt')}
            </button>
          </nav>
        );
      };

      export default NavRail;
      ```

- [ ] Bước 2: Trong `src/App.jsx`: thêm `import NavRail from './components/NavRail';`. **Xoá** khối "Công tắc trang (mầm nav rail GĐ3)" (cụm 2 nút `view-tab`). Bọc khu vực chính thành hàng ngang có rail:
      ```jsx
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <NavRail
          currentView={ui.currentView}
          onNavigate={ui.setCurrentView}
          onAdd={() => ui.setShowAddModal(true)}
          onImport={() => ui.setShowImportModal(true)}
          cartCount={cartCount}
          collapsed={ui.railCollapsed}
          onToggleCollapse={() => ui.setRailCollapsed(v => !v)}
        />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)' }}>
          {/* phần currentView === 'feed' (Toolbar + ControlsRow + DataGrid) GIỮ NGUYÊN ở đây cho task này */}
          {/* thêm nhánh settings tạm: */}
        </div>
      </div>
      ```
      Trong cột phải, đổi điều kiện hiển thị thành 3 nhánh: `feed` (như cũ), `cart` (như cũ), và `settings` tạm thời:
      ```jsx
      {ui.currentView === 'settings' && (
        <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Trang Cài đặt đang được dựng (Task 4).</div>
      )}
      ```

- [ ] Bước 3: Bỏ nút "Quản lý phân loại" khỏi `Toolbar` (sẽ chuyển vào Cài đặt ở Task 4). Trong `App.jsx`, ở chỗ render `<Toolbar .../>`, **bỏ** prop `onManageCategories` (để Task 4 đưa vào SettingsPage). Toolbar vẫn còn nút Thêm/Import — không sao, rail cũng có; sẽ dọn ở Task 8.

- [ ] Bước 4: Check it works.
      Run: `$env:CI="false"; npm run build` → `Compiled successfully.` 0 warning. Rồi `npx tauri dev`:
      - Mép trái có rail dọc; bấm **Bài**/**Giỏ** đổi đúng; badge giỏ hiện khi có bài.
      - Nút **Thêm bài**/**Import** ở rail mở đúng modal.
      - Nút gập ‹‹/›› thu/mở nhãn chữ.
      - Bấm **Cài đặt** thấy ô chữ "đang được dựng".
      *Nếu rail không thấy:* kiểm tra đã bọc trong `<div style="display:flex">` và NavRail đặt TRƯỚC cột phải.

- [ ] Bước 5: Lưu tiến độ.
      Run: `git add . ; git commit -m "feat(ux): nav rail doc thay cong tac 2 tab" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 4: Trang Cài đặt + đưa "Quản lý phân loại" vào trong

**What you'll have when this is done:** Bấm **Cài đặt** ở rail mở một trang gọn; trong đó nút **Quản lý phân loại** mở đúng cửa sổ quản lý cũ (CRUD vẫn chạy). Các mục cài đặt khác để "sắp có".

- [ ] Bước 1: Tạo `src/components/SettingsPage.jsx`:
      ```jsx
      import React from 'react';
      import { FolderTree, Moon, Type, FileDown, KeyRound, Database } from 'lucide-react';

      const Row = ({ icon, title, desc, action, soon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', opacity: soon ? .55 : 1 }}>
          <div style={{ color: 'var(--color-cobalt)' }}>{icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{desc}</div>
          </div>
          {soon ? <span className="chip">Sắp có</span> : action}
        </div>
      );

      const SettingsPage = ({ onManageCategories }) => (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', background: 'var(--color-bg)' }}>
          <h2 style={{ marginTop: 0, color: 'var(--color-text)' }}>Cài đặt</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
            <Row icon={<FolderTree size={20} />} title="Quản lý phân loại"
              desc="Thiết lập hệ, cây chuyên đề, độ khó, lớp."
              action={<button className="card-btn card-btn-primary" onClick={onManageCategories}>Mở</button>} />
            <Row icon={<Moon size={20} />} title="Giao diện tối" desc="Bật/tắt dark mode." soon />
            <Row icon={<Type size={20} />} title="Cỡ chữ" desc="Phóng to/thu nhỏ chữ toàn app." soon />
            <Row icon={<FileDown size={20} />} title="Mặc định xuất đề" desc="Khung, cỡ chữ, kèm lời giải mặc định." soon />
            <Row icon={<KeyRound size={20} />} title="Khoá API Gemini" desc="Dùng cho Smart Import." soon />
            <Row icon={<Database size={20} />} title="Vị trí dữ liệu & sao lưu" desc="Đường dẫn CSDL, backup." soon />
          </div>
        </div>
      );

      export default SettingsPage;
      ```

- [ ] Bước 2: Trong `App.jsx`: `import SettingsPage from './components/SettingsPage';`. Thay ô chữ tạm thời (Task 3) bằng:
      ```jsx
      {ui.currentView === 'settings' && (
        <SettingsPage onManageCategories={() => ui.setShowCategoryManager(true)} />
      )}
      ```
      (Cửa sổ `CategoryManagerModal` đã được render sẵn ở cuối `App` dựa trên `ui.showCategoryManager` — không cần đụng.)

- [ ] Bước 3: Check it works.
      Run: `npx tauri dev` → bấm **Cài đặt** → thấy danh sách; bấm **Mở** ở dòng "Quản lý phân loại" → đúng cửa sổ quản lý hiện ra; thêm/sửa/xoá một nhánh thử → vẫn chạy; đóng lại về trang Cài đặt.

- [ ] Bước 4: Kiểm biên dịch + lưu.
      Run: `$env:CI="false"; npm run build` → 0 warning.
      Run: `git add . ; git commit -m "feat(ux): trang Cai dat chua Quan ly phan loai" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 5: Cột lọc hệ-first — tab hệ + độ khó + lớp, và lọc feed theo hệ

**What you'll have when this is done:** Giữa rail và feed có cột lọc; bấm tab hệ → feed chỉ còn bài của hệ đó, ô độ khó đổi theo hệ; ô tìm + sắp xếp dời lên đỉnh feed. (Cây chuyên đề thêm ở Task 6.)

- [ ] Bước 1: Tạo `src/components/FilterSidebar.jsx` (bản này có tab hệ + độ khó + lớp + xoá lọc + nút gập; cây để Task 6 chèn vào chỗ đánh dấu):
      ```jsx
      import React, { useMemo } from 'react';
      import { ChevronLeft, X } from 'lucide-react';
      import { useTaxonomy } from '../hooks/useTaxonomy';

      const FilterSidebar = ({
        selectedHe, onSelectHe,
        filterTopic, onSelectBranch,
        filterDifficulty, onDifficulty,
        filterGrade, onGrade,
        onClear, onCollapse,
      }) => {
        const { categories, difficulties, grades } = useTaxonomy();
        const roots = useMemo(() => categories.filter(c => !c.parent_id).sort((a, b) => a.position - b.position), [categories]);
        const heLevels = useMemo(() => difficulties.filter(d => d.he_id === selectedHe), [difficulties, selectedHe]);

        return (
          <aside className="filter-sidebar">
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="rail-item" onClick={onCollapse} aria-label="Gập cột lọc" style={{ padding: 4 }}><ChevronLeft size={16} /></button>
            </div>

            <div className="he-tabs">
              {roots.map(he => (
                <button key={he.id} className={`he-tab ${selectedHe === he.id ? 'on' : ''}`} onClick={() => onSelectHe(he.id)}>{he.name}</button>
              ))}
            </div>

            {/* === CHÈN CÂY CHUYÊN ĐỀ Ở TASK 6 (ngay dưới dòng này) === */}

            <div>
              <div className="sidebar-label">Độ khó (của hệ)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button className={`chip ${filterDifficulty === 'all' ? 'on' : ''}`} onClick={() => onDifficulty('all')}>Tất cả</button>
                {heLevels.map(lv => (
                  <button key={lv.id} className={`chip ${filterDifficulty === lv.id ? 'on' : ''}`} onClick={() => onDifficulty(lv.id)}>{lv.name}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="sidebar-label">Lớp</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button className={`chip ${filterGrade === 'all' ? 'on' : ''}`} onClick={() => onGrade('all')}>Tất cả</button>
                {grades.map(g => (
                  <button key={g.id} className={`chip ${filterGrade === g.id ? 'on' : ''}`} onClick={() => onGrade(g.id)}>{g.name}</button>
                ))}
              </div>
            </div>

            <button className="card-btn" style={{ alignSelf: 'flex-start' }} onClick={onClear}><X size={14} /> Xoá lọc</button>
          </aside>
        );
      };

      export default FilterSidebar;
      ```

- [ ] Bước 2: Trong `App.jsx`, đặt **hệ mặc định** sau khi taxonomy tải xong. Thêm import `useTaxonomy` và một `useEffect`:
      ```jsx
      import { useTaxonomy } from './hooks/useTaxonomy';
      // ...trong App, sau các hook:
      const { categories } = useTaxonomy();
      useEffect(() => {
        if (ui.selectedHe) return;
        const firstHe = categories.filter(c => !c.parent_id).sort((a, b) => a.position - b.position)[0];
        if (firstHe) ui.setSelectedHe(firstHe.id);
      }, [categories, ui.selectedHe]);
      ```

- [ ] Bước 3: Trong `App.jsx`, ở nhánh `currentView === 'feed'`, đặt `FilterSidebar` **bên trái** feed (chỉ hiện khi không gập). Bọc Toolbar/ControlsRow/DataGrid và sidebar trong một hàng ngang:
      ```jsx
      <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {!ui.sidebarCollapsed && (
          <FilterSidebar
            selectedHe={ui.selectedHe} onSelectHe={ui.selectHe}
            filterTopic={ui.filterTopic} onSelectBranch={ui.setFilterTopic}
            filterDifficulty={ui.filterDifficulty} onDifficulty={ui.setFilterDifficulty}
            filterGrade={ui.filterGrade} onGrade={ui.setFilterGrade}
            onClear={ui.clearFilters} onCollapse={() => ui.setSidebarCollapsed(true)}
          />
        )}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {ui.sidebarCollapsed && (
            <button className="card-btn" style={{ margin: 8, alignSelf: 'flex-start' }} onClick={() => ui.setSidebarCollapsed(false)}>Hiện bộ lọc</button>
          )}
          <ControlsRow searchTerm={ui.searchTerm} onSearchChange={ui.setSearchTerm}
            sortBy={ui.sortBy} onSortChange={ui.setSortBy} searchInputRef={ui.searchInputRef} />
          <DataGrid /* ...props cũ... */ selectedHe={ui.selectedHe} unclassifiedMode={ui.unclassifiedMode} />
        </div>
      </div>
      ```
      **Bỏ** `<Toolbar .../>` khỏi nhánh feed (Thêm/Import đã ở rail).

- [ ] Bước 4: Rút gọn `src/components/ControlsRow.jsx` còn **ô tìm + sắp xếp** (xoá 3 `<select>` chuyên đề/lớp/độ khó và phần `useTaxonomy`/`flatTopics`/`roots` không còn dùng). Cập nhật `DataGrid.jsx` lọc theo hệ: thêm `getRootHeId` vào import và chèn dòng lọc trong `filteredAndSorted` (ngay sau kiểm tra `validBranchIds`):
      ```js
      // (import) import { useTaxonomy, getDescendantIds, getRootHeId } from '../hooks/useTaxonomy';
      // (trong .filter, dùng parentMap đã có sẵn trong DataGrid)
      if (!unclassifiedMode && selectedHe &&
          !(p.categoryIds || []).some(cid => getRootHeId(cid, parentMap) === selectedHe)) return false;
      ```
      Nhớ thêm `selectedHe, unclassifiedMode` vào danh sách props của `DataGrid` và vào mảng phụ thuộc của `useMemo`.

- [ ] Bước 5: Check + lưu.
      Run: `$env:CI="false"; npm run build` → 0 warning. `npx tauri dev`:
      - Có 3 cột; bấm tab hệ → feed đổi theo hệ; ô **Độ khó** đổi danh sách theo hệ; chọn độ khó/lớp lọc đúng.
      - Đổi hệ → độ khó tự về "Tất cả" nhưng **lớp giữ nguyên**.
      - Nút "Gập cột lọc" ẩn cột, nút "Hiện bộ lọc" mở lại.
      Run: `git add . ; git commit -m "feat(ux): cot loc he-first (tab he + do kho + lop) + loc feed theo he" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 6: Cây chuyên đề lọc (chỉ của hệ đang chọn)

**What you'll have when this is done:** Trong cột lọc hiện cây chuyên đề của riêng hệ đang chọn; bấm một nhánh → feed lọc bài của nhánh đó gồm mọi nhánh con; gập/mở từng nhánh được.

- [ ] Bước 1: Trong `FilterSidebar.jsx`, thêm state mở/gập nhánh và dựng "con của mỗi nút":
      ```jsx
      import React, { useMemo, useState } from 'react';
      import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
      // ...trong component:
      const [expanded, setExpanded] = useState({});
      const childrenMap = useMemo(() => {
        const m = {};
        for (const c of categories) { (m[c.parent_id || 'ROOT'] = m[c.parent_id || 'ROOT'] || []).push(c); }
        for (const k in m) m[k].sort((a, b) => a.position - b.position);
        return m;
      }, [categories]);
      ```

- [ ] Bước 2: Thêm một hàm đệ quy vẽ cây (đặt trong component, trước `return`):
      ```jsx
      const renderNodes = (parentId, depth) => (childrenMap[parentId] || []).map(node => {
        const kids = childrenMap[node.id] || [];
        const open = expanded[node.id];
        return (
          <div key={node.id}>
            <div className={`tree-row ${filterTopic === node.id ? 'on' : ''}`} style={{ paddingLeft: 7 + depth * 14 }}>
              {kids.length > 0 ? (
                <button className="rail-item" style={{ padding: 0 }} onClick={() => setExpanded(e => ({ ...e, [node.id]: !e[node.id] }))} aria-label="Mở/gập nhánh">
                  {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : <span style={{ width: 14 }} />}
              <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => onSelectBranch(node.id)}>{node.name}</span>
            </div>
            {open && renderNodes(node.id, depth + 1)}
          </div>
        );
      });
      ```

- [ ] Bước 3: Tại chỗ đánh dấu `=== CHÈN CÂY CHUYÊN ĐỀ Ở TASK 6 ===`, thêm khối cây (chỉ vẽ cây con của hệ đang chọn = `renderNodes(selectedHe, 0)`):
      ```jsx
      <div>
        <div className="sidebar-label">Cây chuyên đề</div>
        <div className={`tree-row ${filterTopic === 'all' ? 'on' : ''}`} onClick={() => onSelectBranch('all')} style={{ cursor: 'pointer' }}>
          Tất cả chuyên đề của hệ
        </div>
        {selectedHe && renderNodes(selectedHe, 0)}
      </div>
      ```

- [ ] Bước 4: Check it works.
      Run: `npx tauri dev` → trong một hệ có nhiều tầng: bấm mũi tên mở/gập nhánh; bấm tên một nhánh cha → feed hiện bài của nhánh đó **và các nhánh con**; bấm "Tất cả chuyên đề của hệ" → bỏ lọc nhánh. Đổi hệ → cây đổi sang cây của hệ mới.
      *Nếu bấm nhánh không lọc:* kiểm tra `onSelectBranch` đang nối tới `ui.setFilterTopic` (ở Task 5, Bước 3) và `DataGrid` vẫn dùng `validBranchIds`/`getDescendantIds` như cũ.

- [ ] Bước 5: Kiểm biên dịch + lưu.
      Run: `$env:CI="false"; npm run build` → 0 warning.
      Run: `git add . ; git commit -m "feat(ux): cay chuyen de loc theo nhanh (1 he)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 7: Bấm "Chưa phân loại" trên Header để xem bài chưa gắn hệ

**What you'll have when this is done:** Bấm số "Chưa phân loại" ở Header → feed chỉ hiện bài chưa có phân loại; có dải báo "Đang xem: Chưa phân loại ✕" để thoát; bấm tab hệ cũng thoát.

- [ ] Bước 1: Sửa `src/components/Header.jsx` cho thẻ "Chưa phân loại" bấm được. Cho `Header` nhận thêm 2 prop và gắn vào đúng thẻ:
      ```jsx
      const Header = ({ stats, onUnclassifiedClick, unclassifiedActive }) => {
      // ...trong .map, thẻ có label 'Chưa phân loại' thêm:
      //   onClick: chỉ thẻ đó mới gắn
      const clickable = stat.label === 'Chưa phân loại';
      // ...trên <div ...> của thẻ:
      onClick={clickable ? onUnclassifiedClick : undefined}
      style={{ /* ...style cũ..., */ cursor: clickable ? 'pointer' : 'default',
        outline: clickable && unclassifiedActive ? '2px solid var(--color-amber)' : 'none' }}
      ```

- [ ] Bước 2: Trong `App.jsx`, truyền handler cho Header:
      ```jsx
      <Header stats={{ ... }} unclassifiedActive={ui.unclassifiedMode}
        onUnclassifiedClick={() => ui.currentView === 'feed' ? ui.showUnclassified() : (ui.setCurrentView('feed'), ui.showUnclassified())} />
      ```

- [ ] Bước 3: Trong `DataGrid.jsx`, cho chế độ chưa-phân-loại **đè** mọi lọc khác. Ở đầu hàm `.filter`, thêm:
      ```js
      if (unclassifiedMode) return (p.categoryIds || []).length === 0;
      ```
      (đặt TRƯỚC các kiểm tra hệ/nhánh/độ khó; vẫn để dòng `searchTerm` phía trên nếu Thầy muốn tìm trong nhóm chưa phân loại — tùy, mặc định cứ để dòng này ngay sau `searchTerm`).
      Thêm dải báo phía trên feed (trong `DataGrid`, ngay trước `<Virtuoso>`):
      ```jsx
      {unclassifiedMode && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 16px 8px',
          padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-amber-bg)', color: 'var(--color-amber-text)' }}>
          <span>Đang xem: Bài chưa phân loại</span>
          <button className="card-btn" onClick={onExitUnclassified}>✕ Thoát</button>
        </div>
      )}
      ```
      Thêm prop `unclassifiedMode` và `onExitUnclassified` cho `DataGrid`; ở `App.jsx` truyền `onExitUnclassified={() => ui.setUnclassifiedMode(false)}`.

- [ ] Bước 4: Check it works.
      Run: `npx tauri dev` → bấm số "Chưa phân loại" ở Header (giả sử >0) → feed chỉ còn bài chưa gắn phân loại + dải amber; bấm ✕ Thoát hoặc bấm một tab hệ → trở lại bình thường.
      *Nếu không có bài nào hiện:* đúng nếu mọi bài đã phân loại — thêm tạm một bài không tick phân loại để thử, rồi xoá.

- [ ] Bước 5: Kiểm biên dịch + lưu.
      Run: `$env:CI="false"; npm run build` → 0 warning.
      Run: `git add . ; git commit -m "feat(ux): bam so Chua phan loai tren Header de loc" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 8: Dọn dẹp + nghiệm thu cuối + an toàn xuất .tex

**What you'll have when this is done:** Không còn code thừa; build sạch; và **chứng minh xuất `.tex` vẫn y nguyên** (byte-identical) như trước đợt GĐ3.

- [ ] Bước 1: Dọn dẹp. Gỡ `import Toolbar` và mọi chỗ render `<Toolbar />` trong `App.jsx` (đã thay bằng rail). Kiểm tra không còn import thừa (`List`, `ShoppingCart` ở App nếu không dùng nữa thì xoá). Giữ file `Toolbar.jsx` lại (không xoá vội).
      Run: `$env:CI="false"; npm run build`
      You should see: `Compiled successfully.` — **0 warning** (cảnh báo "is defined but never used" nghĩa là còn import thừa → xoá đúng dòng đó).

- [ ] Bước 2: **An toàn xuất `.tex` (BẮT BUỘC).** Mở `npx tauri dev`:
      1. Bấm **Thêm bài**, dán đề có công thức, ví dụ statement `Chứng minh $x^2 + y^2 = z^2$ có vô số nghiệm nguyên.`, lưu.
      2. Bấm vào thẻ để chọn → **Thêm vào giỏ**; mở **Giỏ** → **Xuất đề** → lưu file `.tex`.
      3. Mở file `.tex` vừa tải: xác nhận có khối `\begin{bt} ... \end{bt}`, công thức `$x^2 + y^2 = z^2$` **nguyên vẹn**, và (nếu chọn kèm) `\loigiai{...}`.

- [ ] Bước 3: **Đối chiếu byte-identical.** Lý do an tâm: đợt này KHÔNG sửa `src/utils/buildProblemTex.js` lẫn `handleFinalExport`. Kiểm chứng bằng lệnh (PowerShell):
      Run: `git log --oneline -- src/utils/buildProblemTex.js`
      You should see: commit mới nhất của file này vẫn là `388006cb` (tạo từ GĐ2) — **không có commit GĐ3 nào đụng nó**. Tương tự xem `git diff 2bc9b366 -- src/utils/buildProblemTex.js src/App.jsx` phần `handleFinalExport` không đổi.

- [ ] Bước 4: **Nghiệm thu trực quan** (đối chiếu mục 9 của spec) — bấm thử lần lượt:
      rail gập/mở · 3 cột đúng · đổi tab hệ (cây + độ khó đổi, feed lọc, lớp giữ) · bấm nhánh lọc gồm con · Cài đặt → Quản lý phân loại mở & CRUD chạy · bấm "Chưa phân loại" lọc & thoát được · Giỏ/Xem đầy đủ/Mã LaTeX/chọn-bằng-bấm-thẻ của GĐ2 vẫn nguyên.

- [ ] Bước 5: Lưu tiến độ cuối.
      Run: `git add . ; git commit -m "chore(ux): don dep + nghiem thu khung GD3 (export byte-identical)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

## Ready to Build

Kế hoạch đã lưu tại `.docs/plans/2026-06-23-ux-gd3-khung-3-cot.md`. Việc cần làm:

1. Đọc lướt cả kế hoạch một lượt trước khi bắt đầu.
2. Làm theo thứ tự task — đừng nhảy cóc (mỗi task được thiết kế để app vẫn chạy sau khi xong).
3. Hoàn thành bước "Check it works" trước khi sang task kế.
4. Nếu có gì không như mong đợi, **dừng lại và mô tả đúng những gì thấy** — đừng thử sửa lung tung.

Nói **"bắt đầu build"** (hoặc "làm Task 1") khi Thầy sẵn sàng.
