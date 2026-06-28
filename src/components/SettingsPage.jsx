import React, { useState, useEffect } from 'react';
import { FolderTree, Moon, Type, FileDown, KeyRound, Database } from 'lucide-react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '../hooks/useToast';
import SqlDb from '@tauri-apps/plugin-sql'; // đổi tên, tránh trùng icon "Database" của lucide-react
import { getDb } from '../utils/db';

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

const SettingsPage = ({ onManageCategories }) => {
  const [templateFolder, setTemplateFolder] = useState(localStorage.getItem('pb-template-folder') || '');
  const pickFolder = async () => {
    const dir = await open({ directory: true, title: 'Chọn thư mục chứa file template (.tex)' });
    if (typeof dir === 'string') {
      localStorage.setItem('pb-template-folder', dir);
      setTemplateFolder(dir);
    }
  };
  const [dark, setDark] = useState((localStorage.getItem('pb-theme') || 'light') === 'dark');
  const toggleDark = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pb-theme', next);
    setDark(!dark);
  };
  const { success, error } = useToast();
  const [apiKey, setApiKey] = useState(localStorage.getItem('pb-gemini-key') || '');
  const [showKey, setShowKey] = useState(false);
  const saveKey = () => { localStorage.setItem('pb-gemini-key', apiKey.trim()); success('Đã lưu API key'); };
  const [dbPath, setDbPath] = useState('');
  useEffect(() => {
    const folder = localStorage.getItem('pb-db-folder') || 'D:\\0. Problems Bank\\app-data';
    setDbPath(localStorage.getItem('pb-db-path-active') || `${folder}\\problem_bank.db`);
  }, []);

  // Kiểm tra file .db được chọn có đúng là dữ liệu Problem Bank không (phải có bảng "problems").
  const isValidBackup = async (path) => {
    let testDb;
    try {
      testDb = await SqlDb.load('sqlite:' + path);
      const rows = await testDb.select(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='problems'"
      );
      return rows.length > 0;
    } catch (e) {
      return false;
    } finally {
      if (testDb) { try { await testDb.close(); } catch (_) {} }
    }
  };

  const restoreBackup = async () => {
    // 1. Chọn file backup
    const picked = await open({
      title: 'Chọn file backup (.db) để khôi phục',
      filters: [{ name: 'SQLite DB', extensions: ['db'] }],
    });
    if (typeof picked !== 'string') return; // Thầy bấm Huỷ

    // 2. Kiểm tra file hợp lệ
    if (!(await isValidBackup(picked))) {
      error('File này không phải dữ liệu Problem Bank hợp lệ.');
      return;
    }

    // 3. Cảnh báo xác nhận
    const sure = window.confirm(
      'Toàn bộ dữ liệu hiện tại sẽ bị thay thế bằng dữ liệu trong file backup.\n\n' +
      'App sẽ tự lưu một bản phòng hờ trước khi thay.\n\n' +
      'Bạn có chắc chắn muốn tiếp tục?'
    );
    if (!sure) return;

    // 4a. Tự lưu bản phòng hờ (PHẢI chạy TRƯỚC khi đóng/ghi đè)
    const folder = dbPath.replace(/[\\/][^\\/]+$/, '');
    const autobackup = folder + '\\problem_bank-autobackup.db';
    try {
      await invoke('copy_file', { src: dbPath, dst: autobackup });
    } catch (e) {
      error('Không tạo được bản phòng hờ, đã huỷ khôi phục: ' + e);
      return; // chưa đóng DB, chưa ghi đè -> an toàn tuyệt đối
    }

    // 4b. Đóng kết nối DB để nhả khoá file (Windows)
    try {
      const db = await getDb();
      await db.close();
    } catch (e) {
      console.warn('Không đóng được DB trước khi ghi đè:', e);
    }

    // 4c. Ghi đè DB sống bằng file backup (thử lại tối đa 3 lần nếu Windows còn giữ khoá)
    let copied = false;
    for (let i = 0; i < 3; i++) {
      try {
        await invoke('copy_file', { src: picked, dst: dbPath });
        copied = true;
        break;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 400)); // chờ Windows nhả khoá rồi thử lại
      }
    }

    // 4d. Tải lại app (luôn reload sau khi đã đóng DB để có kết nối sạch)
    if (!copied) {
      window.alert('Khôi phục thất bại (Windows đang giữ khoá file). Dữ liệu cũ được giữ nguyên. App sẽ tải lại.');
    }
    window.location.reload();
  };

  const backupNow = async () => {
    if (!dbPath) return;
    const today = new Date().toISOString().slice(0, 10);
    const dst = await save({ defaultPath: `problem_bank-backup-${today}.db`, filters: [{ name: 'SQLite DB', extensions: ['db'] }] });
    if (!dst) return;
    try { await invoke('copy_file', { src: dbPath, dst }); success('Đã sao lưu cơ sở dữ liệu'); }
    catch (e) { error('Lỗi sao lưu: ' + e); }
  };
  const openDbFolder = () => {
    const folder = dbPath.replace(/[\\/][^\\/]+$/, '');
    invoke('open_path', { path: folder }).catch(() => {});
  };
  return (
  <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', background: 'var(--color-bg)' }}>
    <h2 style={{ marginTop: 0, color: 'var(--color-text)' }}>Cài đặt</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
      <Row
        icon={<FolderTree size={20} />}
        title="Quản lý phân loại"
        desc="Thiết lập hệ, cây chuyên đề, độ khó, lớp."
        action={<button className="card-btn card-btn-primary" onClick={onManageCategories}>Mở</button>}
      />
      <Row
        icon={<Moon size={20} />}
        title="Giao diện tối"
        desc={dark ? 'Đang bật (Tối).' : 'Đang tắt (Sáng).'}
        action={<button className="card-btn card-btn-primary" onClick={toggleDark}>{dark ? 'Chuyển Sáng' : 'Chuyển Tối'}</button>}
      />
      <Row icon={<Type size={20} />} title="Cỡ chữ" desc="Phóng to/thu nhỏ chữ toàn app." soon />
      <Row
        icon={<FileDown size={20} />}
        title="Thư mục template xuất"
        desc={templateFolder || 'Chưa chọn — nơi app tìm các file template .tex để xuất.'}
        action={<button className="card-btn card-btn-primary" onClick={pickFolder}>Chọn thư mục…</button>}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ color: 'var(--color-cobalt)', display: 'flex' }}><KeyRound size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Khoá API Gemini</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Dùng cho Smart Import (bóc tách ảnh/PDF). Lưu trên máy này.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Dán API key vào đây"
            style={{ flex: 1, padding: '0.55rem', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }} />
          <button className="card-btn" onClick={() => setShowKey((s) => !s)}>{showKey ? 'Ẩn' : 'Hiện'}</button>
          <button className="card-btn card-btn-primary" onClick={saveKey}>Lưu</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ color: 'var(--color-cobalt)', display: 'flex' }}><Database size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Vị trí dữ liệu & sao lưu</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>{dbPath || 'Đang lấy đường dẫn…'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="card-btn card-btn-primary" onClick={backupNow} disabled={!dbPath}>Sao lưu ngay</button>
          <button className="card-btn" onClick={openDbFolder} disabled={!dbPath}>Mở thư mục</button>
          <button className="card-btn" onClick={restoreBackup} disabled={!dbPath}>Khôi phục dữ liệu</button>
        </div>
      </div>
    </div>
  </div>
  );
};

export default SettingsPage;
