import React from 'react';
import { FolderTree, Moon, Type, FileDown, KeyRound, Database } from 'lucide-react';

// ==========================================
// TRANG CÀI ĐẶT (cột phải khi currentView === 'settings').
// Chứa "Quản lý phân loại" (mở CategoryManagerModal hiện có) + các mục để sau.
// ==========================================
const Row = ({ icon, title, desc, action, soon }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)', opacity: soon ? 0.55 : 1,
  }}>
    <div style={{ color: 'var(--color-cobalt)', display: 'flex' }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{desc}</div>
    </div>
    {soon ? <span className="chip">Sắp có</span> : action}
  </div>
);

const SettingsPage = ({ onManageCategories }) => (
  <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', background: 'var(--color-bg)' }}>
    <h2 style={{ marginTop: 0, color: 'var(--color-text)' }}>Cài đặt</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
      <Row
        icon={<FolderTree size={20} />}
        title="Quản lý phân loại"
        desc="Thiết lập hệ, cây chuyên đề, độ khó, lớp."
        action={<button className="card-btn card-btn-primary" onClick={onManageCategories}>Mở</button>}
      />
      <Row icon={<Moon size={20} />} title="Giao diện tối" desc="Bật/tắt dark mode." soon />
      <Row icon={<Type size={20} />} title="Cỡ chữ" desc="Phóng to/thu nhỏ chữ toàn app." soon />
      <Row icon={<FileDown size={20} />} title="Mặc định xuất đề" desc="Khung, cỡ chữ, kèm lời giải mặc định." soon />
      <Row icon={<KeyRound size={20} />} title="Khoá API Gemini" desc="Dùng cho Smart Import." soon />
      <Row icon={<Database size={20} />} title="Vị trí dữ liệu & sao lưu" desc="Đường dẫn CSDL, backup." soon />
    </div>
  </div>
);

export default SettingsPage;
