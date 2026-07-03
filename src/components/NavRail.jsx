import React from 'react';
import { PlusSquare, Upload, List, ShoppingCart, Settings, Trash2, ChevronsLeft, ChevronsRight, BarChart3 } from 'lucide-react';

// ==========================================
// NAV RAIL (cột 1) — điều hướng dọc kiểu Gmail, gập được.
// Trên: nút nhanh Thêm/Import. Giữa: Bài/Giỏ. Dưới: Cài đặt.
// ==========================================
const NavRail = ({ currentView, onNavigate, onAdd, onImport, cartCount, trashCount, collapsed, onToggleCollapse }) => {
  const lbl = (text) => (collapsed ? null : <span>{text}</span>);
  const align = collapsed ? 'center' : 'flex-start';

  return (
    <nav className="nav-rail" style={{ width: collapsed ? 56 : 168 }}>
      <button className="rail-item" onClick={onToggleCollapse} aria-label="Gập/mở thanh điều hướng"
        style={{ justifyContent: collapsed ? 'center' : 'flex-end' }}>
        {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
      </button>

      <button className="rail-cta" onClick={onAdd} style={{ justifyContent: align }}>
        <PlusSquare size={18} /> {lbl('Thêm bài')}
      </button>
      <button className="rail-item rail-ghost" onClick={onImport} style={{ justifyContent: align }}>
        <Upload size={18} /> {lbl('Import')}
      </button>

      <div style={{ height: 1, background: 'var(--color-border-subtle)', margin: '8px 2px' }} />

      <button className={`rail-item ${currentView === 'dashboard' ? 'on' : ''}`} onClick={() => onNavigate('dashboard')}
        style={{ justifyContent: align }}>
        <BarChart3 size={18} /> {lbl('Thống kê')}
      </button>
      <button className={`rail-item ${currentView === 'feed' ? 'on' : ''}`} onClick={() => onNavigate('feed')}
        style={{ justifyContent: align }}>
        <List size={18} /> {lbl('Bài')}
      </button>
      <button className={`rail-item ${currentView === 'cart' ? 'on' : ''}`} onClick={() => onNavigate('cart')}
        style={{ justifyContent: align }}>
        <ShoppingCart size={18} /> {lbl('Giỏ')}
        {cartCount > 0 && <span className="view-badge" style={{ marginLeft: 'auto' }}>{cartCount}</span>}
      </button>

      <div style={{ flex: 1 }} />

      <button className={`rail-item ${currentView === 'trash' ? 'on' : ''}`} onClick={() => onNavigate('trash')}
        style={{ justifyContent: align }}>
        <Trash2 size={18} /> {lbl('Thùng rác')}
        {trashCount > 0 && <span className="view-badge" style={{ marginLeft: 'auto' }}>{trashCount}</span>}
      </button>

      <button className={`rail-item ${currentView === 'settings' ? 'on' : ''}`} onClick={() => onNavigate('settings')}
        style={{ justifyContent: align }}>
        <Settings size={18} /> {lbl('Cài đặt')}
      </button>
    </nav>
  );
};

export default NavRail;
