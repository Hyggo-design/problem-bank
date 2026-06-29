import React, { useEffect, useState } from 'react';
import Header from './components/Header';
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

import { Toaster } from 'react-hot-toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCart } from './hooks/useCart';
import { useToast } from './hooks/useToast';
import { useProblems } from './hooks/useProblems';
import { useUIState } from './hooks/useUIState';
import { useTaxonomy } from './hooks/useTaxonomy';
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
  const { cartItems, addToCart, removeFromCart, clearCart, cartCount } = useCart();
  const { success, info, undoToast } = useToast();
  const [pendingSave, setPendingSave] = useState(null); // { type: 'add' | 'edit', problem, duplicates }

  // GĐ3 — đặt hệ mặc định = hệ đầu (theo position) khi taxonomy tải xong.
  const { categories } = useTaxonomy();
  const { selectedHe, setSelectedHe } = ui;
  useEffect(() => {
    if (selectedHe) return;
    const firstHe = categories.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position)[0];
    if (firstHe) setSelectedHe(firstHe.id);
  }, [categories, selectedHe, setSelectedHe]);

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

  const handleBulkDelete = async () => {
    if (ui.selectedIds.length === 0) return;
    const ids = ui.selectedIds;
    if (await confirm({ title: 'Chuyển vào Thùng rác', message: `Thầy có chắc chắn muốn xóa ${ids.length} bài tập đã chọn? (Sẽ chuyển vào Thùng rác)`, danger: true, confirmLabel: 'Xoá' })) {
      bulkDeleteProblems(ids);
      ids.forEach((id) => removeFromCart(id));
      ui.setSelectedIds([]);
      ui.setSelectedPreview(null);
      success(`Đã chuyển ${ids.length} bài vào Thùng rác`);
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

  const handleConfirmDuplicateSave = () => {
    if (!pendingSave) return;
    const { type, problem } = pendingSave;
    
    if (type === 'add') {
      addProblem(problem);
      ui.setShowAddModal(false);
      success('Đã thêm bài tập!');
      ui.setSelectedPreview(problem);
    } else if (type === 'edit') {
      updateProblem(problem);
      ui.setEditingProblem(null);
      success('Cập nhật thành công!');
      if (ui.selectedPreview?.id === problem.id) ui.setSelectedPreview(problem);
    }
    setPendingSave(null);
  };

  const handleCancelDuplicateSave = () => {
    setPendingSave(null);
  };

// 4. RÁP GIAO DIỆN (UI)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--color-bg)', fontFamily: 'Inter, sans-serif' }}>
      
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

          {ui.currentView === 'feed' && (
            <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden' }}>
              {!ui.sidebarCollapsed && (
                <FilterSidebar
                  selectedHe={ui.selectedHe} onSelectHe={ui.selectHe}
                  filterTopic={ui.filterTopic} onSelectBranch={ui.setFilterTopic}
                  filterDifficulty={ui.filterDifficulty} onDifficulty={ui.setFilterDifficulty}
                  filterGrade={ui.filterGrade} onGrade={ui.setFilterGrade}
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
                  selectedHe={ui.selectedHe} unclassifiedMode={ui.unclassifiedMode}
                  onExitUnclassified={() => ui.setUnclassifiedMode(false)}
                  selectedIds={ui.selectedIds}
                  onSelectChange={(id) => ui.setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  onBulkAddToCart={handleBulkAddToCart}
                  onBulkDelete={handleBulkDelete}
                  onClearSelection={() => ui.setSelectedIds([])}
                  onPreviewClick={(prob) => ui.setSelectedPreview(prob)}
                  onAddToCart={(prob) => { addToCart(prob); success('Đã thêm vào giỏ!'); }}
                  onDelete={(id) => {
                    deleteProblem(id);
                    removeFromCart(id);
                    if (ui.selectedPreview?.id === id) ui.setSelectedPreview(null);
                    undoToast('Đã chuyển vào thùng rác', () => restoreProblem(id));
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
              onRestore={(id) => { restoreProblem(id); success('Đã khôi phục bài'); }}
              onPurge={(id) => { purgeProblem(id); success('Đã xoá hẳn'); }}
              onEmptyAll={() => { emptyTrash(); success('Đã dọn sạch thùng rác'); }}
            />
          )}
        </div>

      </div>

      {/* CÁC CỬA SỔ MODAL */}
      {ui.showAddModal && (
        <AddProblemModal 
          onClose={() => ui.setShowAddModal(false)} 
          onSave={(prob) => {
            const dups = checkDuplicate(prob.statement, prob.solution);
            if (dups.length) {
              setPendingSave({ type: 'add', problem: prob, duplicates: dups });
            } else {
              addProblem(prob);
              ui.setShowAddModal(false);
              success('Đã thêm bài tập!');
              ui.setSelectedPreview(prob);
            }
          }} 
        />
      )}

      {ui.editingProblem && (
        <EditProblemModal 
          problem={ui.editingProblem} 
          onClose={() => ui.setEditingProblem(null)} 
          onSave={(prob) => {
            const dups = checkDuplicate(prob.statement, prob.solution, prob.id);
            if (dups.length) {
              setPendingSave({ type: 'edit', problem: prob, duplicates: dups });
            } else {
              updateProblem(prob);
              ui.setEditingProblem(null);
              success('Cập nhật thành công!');
              if (ui.selectedPreview?.id === prob.id) ui.setSelectedPreview(prob);
            }
          }} 
        />
      )}

      {ui.showImportModal && (
        <SmartImportModal 
          onClose={() => ui.setShowImportModal(false)} 
          checkDuplicate={checkDuplicate}
          onSave={(newProbs) => {
            saveImportedProblems(newProbs);
            success(`Cập nhật ${newProbs.length} bài thành công!`);
            ui.setShowImportModal(false);
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
          onClose={() => ui.setSelectedPreview(null)}
          onCopied={() => success('Đã chép mã LaTeX')}
        />
      )}

      <Toaster />
    </div>
  );
}

export default App;