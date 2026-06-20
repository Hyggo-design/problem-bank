import React, { useRef, useEffect, useState } from 'react';
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import ControlsRow from './components/ControlsRow';
import DataGrid from './components/DataGrid';
import PreviewPanel from './components/PreviewPanel';
import CartPanel from './components/CartPanel';
import AddProblemModal from './components/Modals/AddProblemModal';
import EditProblemModal from './components/Modals/EditProblemModal';
import SmartImportModal from './components/Modals/SmartImportModal';
import ExportModal from './components/Modals/ExportModal';
import DuplicateWarningModal from './components/Modals/DuplicateWarningModal';
import CategoryManagerModal from './components/Modals/CategoryManagerModal';

import { Toaster } from 'react-hot-toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCart } from './hooks/useCart';
import { useToast } from './hooks/useToast';
import { useProblems } from './hooks/useProblems';
import { useUIState } from './hooks/useUIState';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function App() {
  // 1. GỌI CÁC THƯ KÝ (Hooks) ĐỂ LẤY DỮ LIỆU
  const { 
    problems, 
    addProblem, 
    updateProblem, 
    deleteProblem, 
    bulkDeleteProblems, 
    saveImportedProblems,
    checkDuplicate 
  } = useProblems();
  const ui = useUIState(); 
  const { cartItems, addToCart, removeFromCart, clearCart, cartCount } = useCart();
  const { success, info } = useToast();
  const [pendingSave, setPendingSave] = useState(null); // { type: 'add' | 'edit', problem, duplicateInfo }

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

  // 3. CÁC HÀM XỬ LÝ SỰ KIỆN LIÊN KẾT (Business Logic)

  const cartRef = useRef(cartItems);

  useEffect(() => {
    cartRef.current = cartItems;
  }, [cartItems]);

  const handleBulkDelete = () => {
    if (ui.selectedIds.length === 0) return;
    if (window.confirm(`Thầy có chắc chắn muốn xóa ${ui.selectedIds.length} bài tập đã chọn?`)) {
      bulkDeleteProblems(ui.selectedIds);
      ui.setSelectedIds([]);
      ui.setSelectedPreview(null);
      success('Đã xóa thành công!');
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

  const handleFinalExport = (config) => {
    let exportItems = [...cartRef.current];
    if (config.shuffle) exportItems = exportItems.sort(() => Math.random() - 0.5);

    let tex = `\\documentclass[12pt,a4paper,oneside]{article}\n\\usepackage{ex_test}\n\\usepackage[utf8]{vietnam}\n\\begin{document}\n\n`;
    tex += `\\begin{center}\n  {\\bf ${config.schoolName.toUpperCase()}} \\\\ \n  {\\bf ${config.examTitle}} \\\\ \n  ${config.subject} --- Thời gian: ${config.time} \n\\end{center}\n\n\\hrule \\vskip 0.5cm\n\n`;

    exportItems.forEach((item, index) => {
      tex += `% Câu ${index + 1}\n\\begin{bt}\n${item.statement.trim()}\n`;
      if (item.options && item.options.length > 0) {
        tex += `\\choice\n`;
        item.options.forEach(opt => { tex += `  {${opt.isTrue ? '\\True ' : ''}${opt.text}}\n`; });
      }
      if (config.includeSolutions && item.solution) tex += `\\loigiai{\n${item.solution.trim()}\n}\n`;
      tex += `\\end{bt}\n\n`;
    });
    tex += `\\end{document}`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([tex], { type: 'text/plain' }));
    link.download = `${config.fileName}.tex`;
    link.click();
    success('Đề thi đã được đóng gói và tải về!');
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
      
      <Header stats={{
        total: problems.length,
        unclassified: problems.filter(p => (p.categoryIds?.length || 0) === 0).length,
        cartCount: cartCount,
        used: problems.reduce((sum, p) => sum + (p.timesUsed || 0), 0)
      }} />

      {/* THẺ BỌC CẢ TRÁI VÀ PHẢI */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* NỬA TRÁI: Dữ liệu & Bộ lọc */}
        <div style={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', backgroundColor: '#fff', zIndex: 1 }}>
          <Toolbar
            onAdd={() => ui.setShowAddModal(true)}
            onSmartImport={() => ui.setShowImportModal(true)}
            onManageCategories={() => ui.setShowCategoryManager(true)}
            isImporting={ui.isImporting}
            selectedCount={ui.selectedIds.length}
            onBulkDelete={handleBulkDelete}
            onBulkAddToCart={handleBulkAddToCart}
          />
          
          <ControlsRow 
            searchTerm={ui.searchTerm} onSearchChange={ui.setSearchTerm}
            filterTopic={ui.filterTopic} onFilterTopicChange={ui.setFilterTopic}
            filterGrade={ui.filterGrade} onFilterGradeChange={ui.setFilterGrade}
            filterDifficulty={ui.filterDifficulty} onFilterDifficultyChange={ui.setFilterDifficulty}
            sortBy={ui.sortBy} onSortChange={ui.setSortBy}
            searchInputRef={ui.searchInputRef}
          />
          
          <DataGrid 
            problems={problems}
            sortBy={ui.sortBy} filterTopic={ui.filterTopic} filterGrade={ui.filterGrade} filterDifficulty={ui.filterDifficulty} searchTerm={ui.searchTerm}
            selectedIds={ui.selectedIds}
            onSelectChange={(id) => ui.setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            onSelectAll={(isChecked, allIds) => ui.setSelectedIds(isChecked ? allIds : [])}
            onPreviewClick={(prob) => ui.setSelectedPreview(prob)}
            onAddToCart={(prob) => { 
              addToCart(prob);             
              ui.setIsCartOpen(true);      
              success('Đã thêm vào giỏ!'); 
            }}
            onDelete={(id) => {
              if (window.confirm('Thầy chắc chắn muốn xóa bài này?')) {
                deleteProblem(id);
                if (ui.selectedPreview?.id === id) ui.setSelectedPreview(null);
                success('Đã xóa bài tập');
              }
            }}
            onEdit={(prob) => ui.setEditingProblem(prob)}
          />
        </div>

        {/* NỬA PHẢI: Chỉ hiện khi có Preview hoặc Giỏ hàng đang mở */}
        {(ui.selectedPreview || ui.isCartOpen) && (
          <div style={{ flex: '0 0 450px', minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', borderLeft: '1px solid #e2e8f0' }}>
              
            {/* 1. Khu vực Preview */}
            {ui.selectedPreview && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <PreviewPanel problem={ui.selectedPreview} onClose={() => ui.setSelectedPreview(null)} />
              </div>
            )}

            {/* Vạch kẻ ngăn cách nếu mở cả hai bảng cùng lúc */}
            {ui.selectedPreview && ui.isCartOpen && <div style={{ height: '4px', backgroundColor: '#cbd5e1', flexShrink: 0 }}></div>}

            {/* 2. Khu vực Giỏ hàng */}
            {ui.isCartOpen && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CartPanel 
                  items={cartItems} 
                  onRemove={removeFromCart} 
                  onClear={clearCart}       
                  onExport={() => ui.setShowExportModal(true)} 
                  onClose={() => ui.setIsCartOpen(false)} 
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* CÁC CỬA SỔ MODAL */}
      {ui.showAddModal && (
        <AddProblemModal 
          onClose={() => ui.setShowAddModal(false)} 
          onSave={(prob) => {
            const dup = checkDuplicate(prob.statement);
            if (dup) {
              setPendingSave({ type: 'add', problem: prob, duplicateInfo: dup });
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
            const dup = checkDuplicate(prob.statement, prob.id);
            if (dup) {
              setPendingSave({ type: 'edit', problem: prob, duplicateInfo: dup });
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
          onSave={(newProbs) => {
            saveImportedProblems(newProbs);
            success(`Cập nhật ${newProbs.length} bài thành công!`);
            ui.setShowImportModal(false);
          }}
          genAI={genAI} 
        />
      )}

      {ui.showExportModal && (
        <ExportModal 
          cartItems={cartItems} 
          onClose={() => ui.setShowExportModal(false)} 
          onExport={handleFinalExport} 
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

      <Toaster />
    </div>
  );
}

export default App;