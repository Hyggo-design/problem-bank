import React, { useState, useEffect, useRef } from 'react';
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

import { Toaster, toast } from 'react-hot-toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCart } from './hooks/useCart';
import { useToast } from './hooks/useToast';
import { GoogleGenerativeAI } from '@google/generative-ai';

// LƯU Ý: Dán API Key của Thầy vào đây
const GEMINI_API_KEY = 'AIzaSyBGqPDomfO4sA5NY6OSBpxzjHqBzrV4X4g'; 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function App() {
  // 1. CÁC STATE QUẢN LÝ DỮ LIỆU
  const [problems, setProblems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState('date-new');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const [isOCRing, setIsOCRing] = useState(false);
  const searchInputRef = useRef(null);

  // 2. GỌI CÁC HOOKS (Não bộ logic)
  const { cartItems, addToCart, removeFromCart, clearCart, exportCart, cartCount } = useCart();
  const { success, error, loading, info } = useToast();

  // Khởi tạo dữ liệu từ bộ nhớ
  useEffect(() => {
    const saved = localStorage.getItem('problems');
    if (saved) {
      setProblems(JSON.parse(saved));
    }
  }, []);

  // 3. ĐĂNG KÝ PHÍM TẮT
  useKeyboardShortcuts({
    onNewProblem: () => info('Tính năng thêm bằng tay đang mở...'),
    onSearch: () => searchInputRef.current?.focus(),
    onEscape: () => setSelectedPreview(null),
    onSelectAll: () => {
      // Sẽ cập nhật ở bản nâng cấp
    },
    onDeselectAll: () => setSelectedIds([]),
    onDelete: () => handleBulkDelete(),
    onExport: () => exportCart({ includeSolutions: true }),
    onClearFilters: () => {
      setSearchTerm('');
      setFilterTopic('all');
      setFilterLevel('all');
      info('Đã xóa bộ lọc');
    },
    onSettings: () => info('Mở cài đặt...')
  });

  // 4. CÁC HÀM XỬ LÝ SỰ KIỆN
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Thầy có chắc chắn muốn xóa ${selectedIds.length} bài tập đã chọn?`)) {
      const updated = problems.filter(p => !selectedIds.includes(p.id));
      setProblems(updated);
      localStorage.setItem('problems', JSON.stringify(updated));
      setSelectedIds([]);
      setSelectedPreview(null);
      success('Đã xóa thành công!');
    }
  };

  const handleBulkAddToCart = () => {
    const problemsToAdd = problems.filter(p => selectedIds.includes(p.id));
    let addedCount = 0;

    // Lặp qua từng bài được chọn và nhờ hàm addToCart xử lý
    problemsToAdd.forEach(prob => {
      // Kiểm tra xem bài đã có trong giỏ chưa (dựa vào id)
      if (!cartItems.some(item => item.id === prob.id)) {
        addToCart(prob);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      success(`Đã thêm ${addedCount} bài vào giỏ đề thi!`);
    } else {
      info('Các bài Thầy chọn đều đã có sẵn trong giỏ rồi ạ.');
    }
    
    setSelectedIds([]); // Bỏ chọn các ô vuông sau khi đã thêm xong
  };

  const handleDeleteSingle = (id) => {
    if (window.confirm('Thầy chắc chắn muốn xóa bài này?')) {
      const updated = problems.filter(p => p.id !== id);
      setProblems(updated);
      localStorage.setItem('problems', JSON.stringify(updated));
      if (selectedPreview?.id === id) setSelectedPreview(null);
      success('Đã xóa bài tập');
    }
  };

  const handleSaveNewProblem = (newProblem) => {
    const updated = [newProblem, ...problems]; // Đẩy bài mới lên đầu danh sách
    setProblems(updated);
    localStorage.setItem('problems', JSON.stringify(updated));
    setShowAddModal(false); // Lưu xong thì tự động đóng Modal
    success('Đã thêm bài tập mới thành công!');
    setSelectedPreview(newProblem); // Hiển thị ngay lên màn hình bên phải
  };

  const handleUpdateProblem = (updatedProblem) => {
    const updatedList = problems.map(p => p.id === updatedProblem.id ? updatedProblem : p);
    setProblems(updatedList);
    localStorage.setItem('problems', JSON.stringify(updatedList));
    setEditingProblem(null);
    success('Đã cập nhật bài tập!');
    if (selectedPreview?.id === updatedProblem.id) {
      setSelectedPreview(updatedProblem); // Cập nhật luôn màn hình xem trước
    }
  };

// --- TÍNH NĂNG SMART IMPORT (Ảnh, PDF, .tex) ---
  const handleSaveImported = (newProblems) => {
    if (newProblems.length > 0) {
      setProblems(prev => {
        const updated = [...newProblems, ...prev];
        localStorage.setItem('problems', JSON.stringify(updated));
        return updated;
      });
      success(`Tuyệt vời! Đã cập nhật ${newProblems.length} bài vào ngân hàng.`);
    }
    setShowImportModal(false);
  };

  const handleFinalExport = (config) => {
    let exportItems = [...cartItems];
    
    // 1. Đảo câu hỏi nếu có yêu cầu
    if (config.shuffle) {
      exportItems = exportItems.sort(() => Math.random() - 0.5);
    }

    // 2. Xây dựng Header LaTeX chuẩn ex_test
    let tex = `\\documentclass[12pt,a4paper,oneside]{article}\n`;
    tex += `\\usepackage{ex_test}\n`;
    tex += `\\usepackage[utf8]{vietnam}\n`;
    tex += `\\begin{document}\n\n`;
    
    // Header đề thi
    tex += `\\begin{center}\n`;
    tex += `  {\\bf ${config.schoolName.toUpperCase()}} \\\\ \n`;
    tex += `  {\\bf ${config.examTitle}} \\\\ \n`;
    tex += `  ${config.subject} --- Thời gian: ${config.time} \n`;
    tex += `\\end{center}\n\n`;
    tex += `\\hrule \\vskip 0.5cm\n\n`;

    // 3. Nội dung câu hỏi
    exportItems.forEach((item, index) => {
      tex += `% Câu ${index + 1}\n`;
      tex += `\\begin{bt}\n`;
      tex += `${item.statement.trim()}\n`;
      
      // Nếu là trắc nghiệm và có options (logic từ parser)
      if (item.options && item.options.length > 0) {
        tex += `\\choice\n`;
        item.options.forEach(opt => {
          tex += `  {${opt.isTrue ? '\\True ' : ''}${opt.text}}\n`;
        });
      }

      if (config.includeSolutions && item.solution) {
        tex += `\\loigiai{\n${item.solution.trim()}\n}\n`;
      }
      tex += `\\end{bt}\n\n`;
    });

    tex += `\\end{document}`;

    // 4. Trigger Download
    const blob = new Blob([tex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.fileName}.tex`;
    link.click();
    success('Đề thi đã được đóng gói và tải về!');
  };

  // 5. RÁP GIAO DIỆN (UI)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header (Nhận dữ liệu Thống kê) */}
      <Header stats={{
        total: problems.length,
        unclassified: problems.filter(p => p.topic === 'Chưa phân loại').length,
        cartCount: cartCount,
        used: problems.reduce((sum, p) => sum + (p.timesUsed || 0), 0)
      }} />

      {/* Main Content: Chia đôi màn hình */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* NỬA TRÁI: Dữ liệu & Bộ lọc */}
        <div style={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', backgroundColor: '#fff', zIndex: 1 }}>
          <Toolbar 
            onAdd={() => setShowAddModal(true)} 
            onSmartImport={() => setShowImportModal(true)} // Gọi bật Modal lên
            isImporting={isImporting}
            selectedCount={selectedIds.length}
            onBulkDelete={handleBulkDelete}
            onBulkAddToCart={handleBulkAddToCart}
          />
          
          <ControlsRow 
            searchTerm={searchTerm} onSearchChange={setSearchTerm}
            filterTopic={filterTopic} onFilterTopicChange={setFilterTopic}
            filterLevel={filterLevel} onFilterLevelChange={setFilterLevel}
            sortBy={sortBy} onSortChange={setSortBy}
            searchInputRef={searchInputRef}
          />
          
          <DataGrid 
            problems={problems}
            sortBy={sortBy} filterTopic={filterTopic} filterLevel={filterLevel} searchTerm={searchTerm}
            selectedIds={selectedIds}
            onSelectChange={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            onSelectAll={(isChecked, allIds) => setSelectedIds(isChecked ? allIds : [])}
            onPreviewClick={(prob) => setSelectedPreview(prob)}
            onAddToCart={(prob) => { addToCart(prob); success('Đã tóm vào giỏ!'); }}
            onDelete={handleDeleteSingle}
            onEdit={(prob) => setEditingProblem(prob)}
          />
        </div>

        {/* NỬA PHẢI: Xem trước & Giỏ hàng */}
        <div style={{ flex: '1 1 40%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', maxWidth: '600px' }}>
          <PreviewPanel problem={selectedPreview} onClose={() => setSelectedPreview(null)} />
          <CartPanel items={cartItems} onRemove={removeFromCart} onClear={clearCart} onExport={() => setShowExportModal(true)} />
        </div>

      </div>

      {/* Cửa sổ Thêm bài tập (Modal) */}
      {showAddModal && (
        <AddProblemModal 
          onClose={() => setShowAddModal(false)} 
          onSave={handleSaveNewProblem} 
        />
      )}

      {/* Cửa sổ Sửa bài tập */}
      {editingProblem && (
        <EditProblemModal 
          problem={editingProblem} 
          onClose={() => setEditingProblem(null)} 
          onSave={handleUpdateProblem} 
        />
      )}

      {/* Cửa sổ Chuyển đổi AI (Import Đa Năng) */}
      {showImportModal && (
        <SmartImportModal 
          onClose={() => setShowImportModal(false)} 
          onSave={handleSaveImported}
          genAI={genAI} // Chuyền bộ não Gemini vào đây
        />
      )}

      {showExportModal && (
        <ExportModal 
          cartItems={cartItems} 
          onClose={() => setShowExportModal(false)} 
          onExport={handleFinalExport} 
        />
      )}

      {/* Thùng chứa Thông báo Toast */}
      <Toaster />
    </div>
  );
}

export default App;