import { useState, useRef } from 'react';

export const useUIState = () => {
  // 1. Quản lý Tìm kiếm & Lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState('date-new');
  const searchInputRef = useRef(null);

  // 2. Quản lý Đóng/Mở các Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // 3. Quản lý trạng thái đang chọn/Xem trước/Sửa
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [editingProblem, setEditingProblem] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  // Hàm tiện ích xoá bộ lọc
  const clearFilters = () => {
    setSearchTerm('');
    setFilterTopic('all');
    setFilterLevel('all');
  };

  return {
    searchTerm, setSearchTerm,
    filterTopic, setFilterTopic,
    filterLevel, setFilterLevel,
    sortBy, setSortBy,
    searchInputRef, clearFilters,
    
    showImportModal, setShowImportModal,
    showExportModal, setShowExportModal,
    showAddModal, setShowAddModal,
    
    selectedIds, setSelectedIds,
    selectedPreview, setSelectedPreview,
    editingProblem, setEditingProblem,
    isImporting, setIsImporting
  };
};