import { useEffect } from 'react';
import hotkeys from 'hotkeys-js';

export const useKeyboardShortcuts = ({
  onNewProblem,
  onSearch,
  onEscape,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onExport,
  onClearFilters,
  onSettings
}) => {
  useEffect(() => {
    // Ngăn chặn hành vi mặc định của trình duyệt để nhường chỗ cho App
    hotkeys.filter = function(event) {
      const tagName = (event.target || event.srcElement).tagName;
      const isInput = tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA';
      
      // Nếu Thầy đang gõ trong form nhập liệu, chặn TẤT CẢ phím tắt...
      if (isInput) {
        // ...NGOẠI TRỪ phím ESC (keyCode 27) để vẫn có thể bấm ESC đóng form nhanh
        return event.keyCode === 27; 
      }
      
      // Nếu đang ở ngoài bảng dữ liệu, phím tắt hoạt động bình thường
      return true; 
    };

    // Ctrl+N: Thêm bài mới
    hotkeys('ctrl+n', (e) => {
      e.preventDefault();
      onNewProblem();
    });

    // Ctrl+F: Nhảy nhanh vào ô Tìm kiếm
    hotkeys('ctrl+f', (e) => {
      e.preventDefault();
      onSearch();
    });

    // ESC: Đóng cửa sổ đang xem hoặc Hủy form
    hotkeys('escape', (e) => {
      onEscape();
    });

    // Ctrl+Shift+A: Chọn tất cả các bài đang hiển thị
    hotkeys('ctrl+shift+a', (e) => {
      e.preventDefault();
      onSelectAll();
    });

    // Ctrl+Shift+N: Bỏ chọn tất cả
    hotkeys('ctrl+shift+n', (e) => {
      e.preventDefault();
      onDeselectAll();
    });

    // Nút Delete / Backspace: Xóa các bài đã chọn
    hotkeys('del, backspace', (e) => {
      onDelete();
    });

    // Ctrl+E: Xuất file đề thi nhanh
    hotkeys('ctrl+e', (e) => {
      e.preventDefault();
      onExport();
    });

    // Ctrl+L: Xóa mọi bộ lọc
    hotkeys('ctrl+l', (e) => {
      e.preventDefault();
      onClearFilters();
    });

    // Ctrl+, : Mở cài đặt (Giống VS Code)
    hotkeys('ctrl+,', (e) => {
      e.preventDefault();
      onSettings();
    });

    // Dọn dẹp phím tắt khi đóng component để tránh rò rỉ bộ nhớ
    return () => hotkeys.unbind();
  }, [onNewProblem, onSearch, onEscape, onSelectAll, onDeselectAll, onDelete, onExport, onClearFilters, onSettings]);
};