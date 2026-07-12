import React, { useEffect, useState, useMemo } from 'react';
import ControlsRow from './components/ControlsRow';
import FilterSidebar from './components/FilterSidebar';
import DataGrid from './components/DataGrid';
import PreviewModal from './components/PreviewModal';
import CartPanel from './components/CartPanel';
import AddProblemModal from './components/Modals/AddProblemModal';
import EditProblemModal from './components/Modals/EditProblemModal';
import SmartImportModal from './components/Modals/SmartImportModal';
import ExportModal from './components/Modals/ExportModal';
import DuplicateWarningModal from './components/Modals/DuplicateWarningModal';
import CategoryManagerModal from './components/Modals/CategoryManagerModal';
import NavRail from './components/NavRail';
import SettingsPage from './components/SettingsPage';
import TrashPage from './components/TrashPage';
import DashboardPage from './components/DashboardPage';
import MatrixPage from './components/MatrixPage';

import { Toaster } from 'react-hot-toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCart } from './hooks/useCart';
import { useToast } from './hooks/useToast';
import { useProblems } from './hooks/useProblems';
import { useUIState } from './hooks/useUIState';
import { useTaxonomy } from './hooks/useTaxonomy';
import { useAutoBackup } from './hooks/useAutoBackup';
import { useExportHistory } from './hooks/useExportHistory';
import { getRecentUsageByProblemId } from './utils/usageStats';
import { useConfirm } from './components/ConfirmProvider';
function App() {
  // 1. GỌI CÁC THƯ KÝ (Hooks) ĐỂ LẤY DỮ LIỆU
  const {
    problems,
    trashedProblems,
    trashCount,
    addProblem,
    updateProblem,
    deleteProblem,
    bulkDeleteProblems,
    restoreProblem,
    purgeProblem,
    emptyTrash,
    saveImportedProblems,
    checkDuplicate
  } = useProblems();
  const ui = useUIState();
  useAutoBackup(); // tự sao lưu khi đóng app
  const { cartItems, addToCart, removeFromCart, clearCart, cartCount } = useCart();
  const { success, error, info, undoToast } = useToast();
  const [pendingSave, setPendingSave] = useState(null); // { type: 'add' | 'edit', problem, duplicates }

  // GĐ3 — đặt hệ mặc định = hệ đầu (theo position) khi taxonomy tải xong.
  const { categories } = useTaxonomy();
  const { selectedHe, setSelectedHe } = ui;
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
    if (ui.currentView === 'feed' || ui.currentView === 'dashboard' || ui.currentView === 'matrix') loadHistory();
  }, [ui.currentView, loadHistory]);
  const recentUsageByProblemId = useMemo(() => getRecentUsageByProblemId(historyItems), [historyItems]);

  // 2. ĐĂNG KÝ PHÍM TẮT
  useKeyboardShortcuts({
    onNewProblem: () => ui.setShowAddModal(true),
    onSearch: () => ui.searchInputRef.current?.focus(),
    onEscape: () => ui.setSelectedPreview(null),
    onSelectAll: () => {}, 
    onDeselectAll: () => ui.setSelectedIds([]),
    onDelete: () => handleBulkDelete(),
    onExport: () => ui.setShowExportModal(true),
    onClearFilters: () => { ui.clearFilters(); info('Đã xóa bộ lọc'); },
    onSettings: () => info('Mở cài đặt...')
  });

  const confirm = useConfirm();

  // 3. CÁC HÀM XỬ LÝ SỰ KIỆN LIÊN KẾT (Business Logic)

  // Dùng chung cho Header và màn Thống kê: chuyển sang "Bài", bật chế độ xem bài chưa phân loại.
  const goToUnclassified = () => {
    if (ui.currentView !== 'feed') ui.setCurrentView('feed');
    ui.showUnclassified();
  };

  const handleBulkDelete = async () => {
    if (ui.selectedIds.length === 0) return;
    const ids = ui.selectedIds;
    if (await confirm({ title: 'Chuyển vào Thùng rác', message: `Thầy có chắc chắn muốn xóa ${ids.length} bài tập đã chọn? (Sẽ chuyển vào Thùng rác)`, danger: true, confirmLabel: 'Xoá' })) {
      if (await bulkDeleteProblems(ids)) {
        ids.forEach((id) => removeFromCart(id));
        ui.setSelectedIds([]);
        ui.setSelectedPreview(null);
        success(`Đã chuyển ${ids.length} bài vào Thùng rác`);
      } else {
        error('Chưa xoá được — thử lại nhé.');
      }
    }
  };

  const handleBulkAddToCart = () => {
    const problemsToAdd = problems.filter(p => ui.selectedIds.includes(p.id));
    let addedCount = 0;
    problemsToAdd.forEach(prob => {
      if (!cartItems.some(item => item.id === prob.id)) {
        addToCart(prob);
        addedCount++;
      }
    });
    if (addedCount > 0) success(`Đã thêm ${addedCount} bài vào giỏ đề thi!`);
    else info('Các bài Thầy chọn đều đã có sẵn trong giỏ rồi ạ.');
    ui.setSelectedIds([]); 
  };

  const handleConfirmDuplicateSave = async () => {
    if (!pendingSave) return;
    const { type, problem } = pendingSave;

    if (type === 'add') {
      if (await addProblem(problem)) {
        ui.setShowAddModal(false);
        success('Đã thêm bài tập!');
        ui.setSelectedPreview(problem);
      } else {
        error('Chưa lưu được — ổ đĩa hoặc CSDL đang trục trặc. Bài CHƯA được lưu, Thầy thử lại nhé.');
      }
    } else if (type === 'edit') {
      if (await updateProblem(problem)) {
        ui.setEditingProblem(null);
        success('Cập nhật thành công!');
        if (ui.selectedPreview?.id === problem.id) ui.setSelectedPreview(problem);
      } else {
        error('Chưa lưu được thay đổi — CSDL đang trục trặc. Thầy thử lại nhé.');
      }
    }
    // Lưu hỏng: đóng cảnh báo trùng nhưng GIỮ modal Thêm/Sửa để Thầy thử lại (không mất nội dung đã gõ).
    setPendingSave(null);
  };

  const handleCancelDuplicateSave = () => {
    setPendingSave(null);
  };

// 4. RÁP GIAO DIỆN (UI)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--color-bg)', fontFamily: 'Inter, sans-serif' }}>
      
      {/* KHU VỰC CHÍNH — 3 cột: nav rail | (cột lọc Task 5) | cột phải */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <NavRail
          currentView={ui.currentView}
          onNavigate={ui.setCurrentView}
          onAdd={() => ui.setShowAddModal(true)}
          onImport={() => ui.setShowImportModal(true)}
          cartCount={cartCount}
          trashCount={trashCount}
          collapsed={ui.railCollapsed}
          onToggleCollapse={() => ui.setRailCollapsed(v => !v)}
        />

        {/* CỘT PHẢI — feed / Giỏ / Cài đặt theo currentView */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', zIndex: 1 }}>

          {ui.currentView === 'dashboard' && (
            <DashboardPage
              problems={problems}
              onNavigateToHe={(heId) => { ui.selectHe(heId); ui.setCurrentView('feed'); }}
              onNavigateToBranch={(heId, branchId) => { ui.selectHe(heId); ui.setFilterTopic(branchId); ui.setCurrentView('feed'); }}
              onNavigateToUnclassified={goToUnclassified}
            />
          )}

          {ui.currentView === 'matrix' && (
            <MatrixPage
              problems={problems}
              recentUsageByProblemId={recentUsageByProblemId}
              defaultHeId={ui.selectedHe}
              onAddManyToCart={(picked) => {
                let added = 0;
                picked.forEach((p) => {
                  if (!cartItems.some((item) => item.id === p.id)) { addToCart(p); added++; }
                });
                if (added > 0) { success(`Đã thêm ${added} bài vào giỏ đề thi!`); ui.setCurrentView('cart'); }
                else info('Các bài này đều đã có sẵn trong giỏ rồi ạ.');
              }}
            />
          )}

          {ui.currentView === 'feed' && (
            <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden' }}>
              {!ui.sidebarCollapsed && (
                <FilterSidebar
                  selectedHe={ui.selectedHe} onSelectHe={ui.selectHe}
                  filterTopic={ui.filterTopic} onSelectBranch={ui.setFilterTopic}
                  filterDifficulty={ui.filterDifficulty} onDifficulty={ui.setFilterDifficulty}
                  filterGrade={ui.filterGrade} onGrade={ui.setFilterGrade}
                  onlyUnused={ui.onlyUnused} onToggleOnlyUnused={() => ui.setOnlyUnused((v) => !v)}
                  onClear={ui.clearFilters}
                  onCollapse={() => ui.setSidebarCollapsed(true)}
                />
              )}

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                {ui.sidebarCollapsed && (
                  <button className="card-btn" style={{ margin: 8, alignSelf: 'flex-start' }} onClick={() => ui.setSidebarCollapsed(false)}>
                    Hiện bộ lọc
                  </button>
                )}

                <ControlsRow
                  searchTerm={ui.searchTerm} onSearchChange={ui.setSearchTerm}
                  sortBy={ui.sortBy} onSortChange={ui.setSortBy}
                  searchInputRef={ui.searchInputRef}
                />

                <DataGrid
                  problems={problems}
                  sortBy={ui.sortBy} filterTopic={ui.filterTopic} filterGrade={ui.filterGrade} filterDifficulty={ui.filterDifficulty} searchTerm={ui.searchTerm}
                  recentUsageByProblemId={recentUsageByProblemId} onlyUnused={ui.onlyUnused}
                  selectedHe={ui.selectedHe} unclassifiedMode={ui.unclassifiedMode}
                  onExitUnclassified={() => ui.setUnclassifiedMode(false)}
                  selectedIds={ui.selectedIds}
                  onSelectChange={(id) => ui.setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  onSetSelection={ui.setSelectedIds}
                  onBulkAddToCart={handleBulkAddToCart}
                  onBulkDelete={handleBulkDelete}
                  onClearSelection={() => ui.setSelectedIds([])}
                  onPreviewClick={(prob) => ui.setSelectedPreview(prob)}
                  onAddToCart={(prob) => { addToCart(prob); success('Đã thêm vào giỏ!'); }}
                  onDelete={async (id) => {
                    if (await deleteProblem(id)) {
                      removeFromCart(id);
                      if (ui.selectedPreview?.id === id) ui.setSelectedPreview(null);
                      undoToast('Đã chuyển vào thùng rác', async () => {
                        if (!(await restoreProblem(id))) error('Chưa khôi phục được — thử lại nhé.');
                      });
                    } else {
                      error('Chưa xoá được — thử lại nhé.');
                    }
                  }}
                  onEdit={(prob) => ui.setEditingProblem(prob)}
                />
              </div>
            </div>
          )}

          {ui.currentView === 'cart' && (
            <CartPanel
              items={cartItems}
              onRemove={removeFromCart}
              onClear={clearCart}
              onExport={() => ui.setShowExportModal(true)}
              onClose={() => ui.setCurrentView('feed')}
              onLoadHistory={(historicalIds) => {
                const toAdd = problems.filter(p => historicalIds.includes(p.id));
                let count = 0;
                toAdd.forEach(p => {
                  if (!cartItems.some(item => item.id === p.id)) {
                    addToCart(p);
                    count++;
                  }
                });
                success(`Đã tải ${count} bài vào giỏ.`);
              }}
            />
          )}

          {ui.currentView === 'settings' && (
            <SettingsPage onManageCategories={() => ui.setShowCategoryManager(true)} />
          )}

          {ui.currentView === 'trash' && (
            <TrashPage
              items={trashedProblems}
              onRestore={async (id) => { if (await restoreProblem(id)) success('Đã khôi phục bài'); else error('Chưa khôi phục được — thử lại nhé.'); }}
              onPurge={async (id) => { if (await purgeProblem(id)) success('Đã xoá hẳn'); else error('Chưa xoá hẳn được — thử lại nhé.'); }}
              onEmptyAll={async () => { if (await emptyTrash()) success('Đã dọn sạch thùng rác'); else error('Chưa dọn được — thử lại nhé.'); }}
            />
          )}
        </div>

      </div>

      {/* CÁC CỬA SỔ MODAL */}
      {ui.showAddModal && (
        <AddProblemModal 
          onClose={() => ui.setShowAddModal(false)} 
          onSave={async (prob) => {
            const dups = checkDuplicate(prob.statement, prob.solution);
            if (dups.length) {
              setPendingSave({ type: 'add', problem: prob, duplicates: dups });
            } else if (await addProblem(prob)) {
              ui.setShowAddModal(false);
              success('Đã thêm bài tập!');
              ui.setSelectedPreview(prob);
            } else {
              error('Chưa lưu được — ổ đĩa hoặc CSDL đang trục trặc. Bài CHƯA được lưu, Thầy thử lại nhé.');
            }
          }}
        />
      )}

      {ui.editingProblem && (
        <EditProblemModal 
          problem={ui.editingProblem} 
          onClose={() => ui.setEditingProblem(null)} 
          onSave={async (prob) => {
            const dups = checkDuplicate(prob.statement, prob.solution, prob.id);
            if (dups.length) {
              setPendingSave({ type: 'edit', problem: prob, duplicates: dups });
            } else if (await updateProblem(prob)) {
              ui.setEditingProblem(null);
              success('Cập nhật thành công!');
              if (ui.selectedPreview?.id === prob.id) ui.setSelectedPreview(prob);
            } else {
              error('Chưa lưu được thay đổi — CSDL đang trục trặc. Thầy thử lại nhé.');
            }
          }}
        />
      )}

      {ui.showImportModal && (
        <SmartImportModal 
          onClose={() => ui.setShowImportModal(false)} 
          checkDuplicate={checkDuplicate}
          onSave={async (newProbs) => {
            if (await saveImportedProblems(newProbs)) {
              success(`Cập nhật ${newProbs.length} bài thành công!`);
              ui.setShowImportModal(false);
            } else {
              error('Chưa nhập được — CSDL đang trục trặc. Thầy thử lại nhé.');
            }
          }}
        />
      )}

      {ui.showExportModal && (
        <ExportModal
          cartItems={cartItems}
          onClose={() => ui.setShowExportModal(false)}
        />
      )}

      {pendingSave && (
        <DuplicateWarningModal
          pendingSave={pendingSave}
          onConfirm={handleConfirmDuplicateSave}
          onCancel={handleCancelDuplicateSave}
        />
      )}

      {ui.showCategoryManager && (
        <CategoryManagerModal onClose={() => ui.setShowCategoryManager(false)} />
      )}

      {ui.selectedPreview && (
        <PreviewModal
          problem={ui.selectedPreview}
          recentUsage={recentUsageByProblemId[ui.selectedPreview.id] || null}
          onClose={() => ui.setSelectedPreview(null)}
          onCopied={() => success('Đã chép mã LaTeX')}
        />
      )}

      <Toaster />
    </div>
  );
}

export default App;