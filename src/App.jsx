import React, { useRef, useEffect } from 'react';
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
  const { problems, addProblem, updateProblem, deleteProblem, bulkDeleteProblems, saveImportedProblems } = useProblems();
  const ui = useUIState(); 
  const { cartItems, addToCart, removeFromCart, clearCart, cartCount } = useCart();
  const { success, info } = useToast();

  // 2. ĐĂNG KÝ PHÍM TẮT
  useKeyboardShortcuts({
    onNewProblem: () => info('Tính năng thêm bằng tay đang mở...'),
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

  // 4. RÁP GIAO DIỆN (UI)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
      
      <Header stats={{
        total: problems.length,
        unclassified: problems.filter(p => p.topic === 'Chưa phân loại').length,
        cartCount: cartCount,
        used: problems.reduce((sum, p) => sum + (p.timesUsed || 0), 0)
      }} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* NỬA TRÁI: Dữ liệu & Bộ lọc */}
        <div style={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', backgroundColor: '#fff', zIndex: 1 }}>
          <Toolbar 
            onAdd={() => ui.setShowAddModal(true)} 
            onSmartImport={() => ui.setShowImportModal(true)} 
            isImporting={ui.isImporting}
            selectedCount={ui.selectedIds.length}
            onBulkDelete={handleBulkDelete}
            onBulkAddToCart={handleBulkAddToCart}
          />
          
          <ControlsRow 
            searchTerm={ui.searchTerm} onSearchChange={ui.setSearchTerm}
            filterTopic={ui.filterTopic} onFilterTopicChange={ui.setFilterTopic}
            filterLevel={ui.filterLevel} onFilterLevelChange={ui.setFilterLevel}
            sortBy={ui.sortBy} onSortChange={ui.setSortBy}
            searchInputRef={ui.searchInputRef}
          />
          
          <DataGrid 
            problems={problems}
            sortBy={ui.sortBy} filterTopic={ui.filterTopic} filterLevel={ui.filterLevel} searchTerm={ui.searchTerm}
            selectedIds={ui.selectedIds}
            onSelectChange={(id) => ui.setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            onSelectAll={(isChecked, allIds) => ui.setSelectedIds(isChecked ? allIds : [])}
            onPreviewClick={(prob) => ui.setSelectedPreview(prob)}
            onAddToCart={(prob) => { addToCart(prob); success('Đã tóm vào giỏ!'); }}
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

        {/* NỬA PHẢI: Xem trước & Giỏ hàng */}
        <div style={{ flex: '1 1 40%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', maxWidth: '600px' }}>
          <PreviewPanel problem={ui.selectedPreview} onClose={() => ui.setSelectedPreview(null)} />
          <CartPanel items={cartItems} onRemove={removeFromCart} onClear={clearCart} onExport={() => ui.setShowExportModal(true)} />
        </div>
      </div>

      {/* CÁC CỬA SỔ MODAL */}
      {ui.showAddModal && (
        <AddProblemModal 
          onClose={() => ui.setShowAddModal(false)} 
          onSave={(prob) => {
            addProblem(prob);
            ui.setShowAddModal(false);
            success('Đã thêm bài tập!');
            ui.setSelectedPreview(prob);
          }} 
        />
      )}

      {ui.editingProblem && (
        <EditProblemModal 
          problem={ui.editingProblem} 
          onClose={() => ui.setEditingProblem(null)} 
          onSave={(prob) => {
            updateProblem(prob);
            ui.setEditingProblem(null);
            success('Cập nhật thành công!');
            if (ui.selectedPreview?.id === prob.id) ui.setSelectedPreview(prob);
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

      <Toaster />
    </div>
  );
}

export default App;