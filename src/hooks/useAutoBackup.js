import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { localDateStamp, backupFileName, pickBackupsToDelete } from '../utils/backupRotation';

const KEEP_DAYS = 14;

// Suy ra đường dẫn DB sống (giống logic trong SettingsPage/db.js).
const getDbPath = () => {
  const folder = localStorage.getItem('pb-db-folder') || 'D:\\0. Problems Bank\\app-data';
  return localStorage.getItem('pb-db-path-active') || `${folder}\\problem_bank.db`;
};
const dirOf = (p) => p.replace(/[\\/][^\\/]+$/, '');

// Chép DB ra bản của hôm nay + dọn bản quá hạn.
// Người gọi phải BỌC try/catch để lỗi không bao giờ chặn việc thoát app.
export const runAutoBackup = async () => {
  if (localStorage.getItem('pb-auto-backup-enabled') === '0') return; // đang tắt

  const dbPath = getDbPath();
  const backupsDir = dirOf(dbPath) + '\\backups';
  await invoke('ensure_dir', { path: backupsDir });

  const today = localDateStamp(new Date());
  const target = backupsDir + '\\' + backupFileName(today);
  await invoke('copy_file', { src: dbPath, dst: target }); // ghi đè nếu trùng ngày
  localStorage.setItem('pb-auto-backup-last', today);

  const files = await invoke('list_files', { dir: backupsDir });
  const toDelete = pickBackupsToDelete(files, today, KEEP_DAYS);
  for (const name of toDelete) {
    try { await invoke('delete_file', { path: backupsDir + '\\' + name }); }
    catch (e) { console.warn('Không xoá được bản cũ:', name, e); }
  }
};

// Đăng ký MỘT LẦN: bắt sự kiện đóng cửa sổ -> sao lưu -> mới đóng thật.
export const useAutoBackup = () => {
  useEffect(() => {
    let unlisten;
    let closing = false;
    (async () => {
      try {
        const w = getCurrentWindow();
        unlisten = await w.onCloseRequested(async (event) => {
          if (closing) return;      // lần thứ 2 vào đây: cho phép đóng
          event.preventDefault();   // giữ cửa sổ lại để kịp sao lưu
          closing = true;
          try { await runAutoBackup(); }
          catch (e) { console.warn('Auto-backup lỗi (vẫn cho thoát):', e); }
          await w.destroy();        // đóng thật
        });
      } catch (e) {
        // Chạy ngoài Tauri (vd npm start thuần trình duyệt) -> không có cửa sổ: bỏ qua an toàn.
        console.warn('Không đăng ký được auto-backup:', e);
      }
    })();
    return () => { if (unlisten) unlisten(); };
  }, []);
};
