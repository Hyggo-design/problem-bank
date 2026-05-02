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
      
      return true; 
    };

    // Đăng ký phím tắt
    hotkeys('ctrl+n', (e) => { e.preventDefault(); onNewProblem(); });
    hotkeys('ctrl+f', (e) => { e.preventDefault(); onSearch(); });
    hotkeys('escape', () => { onEscape(); });
    hotkeys('ctrl+shift+a', (e) => { e.preventDefault(); onSelectAll(); });
    hotkeys('ctrl+shift+n', (e) => { e.preventDefault(); onDeselectAll(); });
    hotkeys('del, backspace', () => { onDelete(); });
    hotkeys('ctrl+e', (e) => { e.preventDefault(); onExport(); });
    hotkeys('ctrl+l', (e) => { e.preventDefault(); onClearFilters(); });
    hotkeys('ctrl+,', (e) => { e.preventDefault(); onSettings(); });

    // HÀM DỌN DẸP (CLEANUP): Gỡ các phím tắt khi component bị hủy hoặc re-render
    return () => {
      hotkeys.unbind('ctrl+n');
      hotkeys.unbind('ctrl+f');
      hotkeys.unbind('escape');
      hotkeys.unbind('ctrl+shift+a');
      hotkeys.unbind('ctrl+shift+n');
      hotkeys.unbind('del, backspace');
      hotkeys.unbind('ctrl+e');
      hotkeys.unbind('ctrl+l');
      hotkeys.unbind('ctrl+,');
    };

  // ✅ Đầy đủ dependencies: Chỉ đăng ký lại phím tắt khi các hàm này thực sự thay đổi
  }, [
    onNewProblem,
    onSearch,
    onEscape,
    onSelectAll,
    onDeselectAll,
    onDelete,
    onExport,
    onClearFilters,
    onSettings
  ]);
};