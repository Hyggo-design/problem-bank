import { useState, useRef } from 'react';

export const useUIState = () => {
  // 1. Quản lý Tìm kiếm & Lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');       // Task 16: lọc theo Lớp (grade id)
  const [filterDifficulty, setFilterDifficulty] = useState('all'); // Task 16: lọc theo Độ khó (difficulty id)
  const [sortBy, setSortBy] = useState('date-new');
  const searchInputRef = useRef(null);

  // 2. Quản lý Đóng/Mở các Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  
  // 3. Quản lý trạng thái đang chọn/Xem trước/Sửa
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [editingProblem, setEditingProblem] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(true);

  // Hàm tiện ích xoá bộ lọc
  const clearFilters = () => {
    setSearchTerm('');
    setFilterTopic('all');
    setFilterGrade('all');
    setFilterDifficulty('all');
  };

  return {
    searchTerm, setSearchTerm,
    filterTopic, setFilterTopic,
    filterGrade, setFilterGrade,
    filterDifficulty, setFilterDifficulty,
    sortBy, setSortBy,
    searchInputRef, clearFilters,
    
    showImportModal, setShowImportModal,
    showExportModal, setShowExportModal,
    showAddModal, setShowAddModal,
    showCategoryManager, setShowCategoryManager,
    
    selectedIds, setSelectedIds,
    selectedPreview, setSelectedPreview,
    editingProblem, setEditingProblem,
    isImporting, setIsImporting,
    isCartOpen, setIsCartOpen
  };
};