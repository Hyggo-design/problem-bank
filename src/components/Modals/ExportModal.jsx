import React, { useState, useEffect } from 'react';
import { X, Download, Shuffle, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { buildContentFile, parseHeaderFields } from '../../utils/buildContentFile';
import { useToast } from '../../hooks/useToast';

const baseName = (p) => p.split(/[\\/]/).pop();
const lbl = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.4rem' };
const inp = { width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: '0.9rem', background: 'var(--color-surface)', color: 'var(--color-text)' };

const ExportModal = ({ cartItems, onClose }) => {
  const { success, error } = useToast();
  const folder = localStorage.getItem('pb-template-folder') || '';
  const [paths, setPaths] = useState([]);
  const [selected, setSelected] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState([]);
  const [includeSolution, setIncludeSolution] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!folder) { setNote('Chưa cấu hình thư mục template. Vào Cài đặt → "Thư mục template xuất" để chọn.'); return; }
    invoke('list_content_templates', { dir: folder })
      .then((list) => { setPaths(list); setNote(list.length ? '' : 'Thư mục chưa có file template (.tex) nào.'); })
      .catch((e) => setNote('Không đọc được thư mục template: ' + e));
  }, [folder]);

  const onPick = async (path) => {
    setSelected(path);
    if (!path) { setTemplateText(''); setFields([]); setValues([]); return; }
    try {
      const text = await invoke('read_text_file', { path });
      const f = parseHeaderFields(text);
      setTemplateText(text); setFields(f); setValues(f.map(() => ''));
    } catch (e) { error('Không đọc được template: ' + e); }
  };

  const doExport = async () => {
    if (!selected || !templateText) { error('Chưa chọn template'); return; }
    const content = buildContentFile(templateText, values, cartItems, { includeSolution, shuffle });
    try {
      const savePath = await save({
        defaultPath: folder ? `${folder}/NoiDung.tex` : 'NoiDung.tex',
        filters: [{ name: 'LaTeX', extensions: ['tex'] }],
      });
      if (!savePath) return;
      await invoke('write_text_file', { path: savePath, contents: content });
      success('Đã xuất file nội dung: ' + baseName(savePath));
      onClose();
    } catch (e) { error('Lỗi lưu file: ' + e); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow)' }}>
        <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text)' }}>Xuất file nội dung (.tex)</h2>
          <button onClick={onClose} className="card-btn" style={{ border: 'none' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '1.3rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {note && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0.7rem 0.9rem', borderRadius: 8, background: 'var(--color-amber-bg)', color: 'var(--color-amber-text)', fontSize: '0.88rem' }}>
              <AlertCircle size={18} /> {note}
            </div>
          )}

          <div>
            <label style={lbl}>Mẫu template</label>
            <select value={selected} onChange={(e) => onPick(e.target.value)} style={inp} disabled={paths.length === 0}>
              <option value="">-- Chọn template --</option>
              {paths.map((p) => <option key={p} value={p}>{baseName(p)}</option>)}
            </select>
          </div>

          {fields.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {fields.map((f, i) => (
                <div key={i}>
                  <label style={lbl}>{f.label}</label>
                  <input type="text" value={values[i] || ''}
                    onChange={(e) => setValues((v) => { const n = [...v]; n[i] = e.target.value; return n; })}
                    style={inp} />
                </div>
              ))}
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Các ô điền nguyên văn vào template (có thể gõ LaTeX). Tránh ký tự % trần và ngoặc lệch.</div>
            </div>
          )}

          <div style={{ padding: '0.9rem', background: 'var(--color-surface-muted)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--color-text)' }}>
              <input type="checkbox" checked={includeSolution} onChange={(e) => setIncludeSolution(e.target.checked)} /> Bao gồm Lời giải (\loigiai)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--color-text)' }}>
              <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} /> <Shuffle size={15} /> Đảo ngẫu nhiên thứ tự câu
            </label>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Sẽ chèn <b style={{ color: 'var(--color-text)' }}>{cartItems.length}</b> bài trong giỏ vào template.
          </div>
        </div>

        <div style={{ padding: '1.1rem 1.4rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} className="card-btn">Hủy</button>
          <button onClick={doExport} className="card-btn card-btn-primary" disabled={!selected || cartItems.length === 0}>
            <Download size={16} /> Xuất file nội dung
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
