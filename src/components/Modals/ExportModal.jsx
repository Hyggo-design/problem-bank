import React, { useState } from 'react';
import { X, FileText, Download, Shuffle, Settings } from 'lucide-react';

const ExportModal = ({ cartItems, onClose, onExport }) => {
  const [config, setConfig] = useState({
    schoolName: 'Trường THCS & THPT Newton',
    examTitle: 'ĐỀ KIỂM TRA ĐỊNH KỲ HỌC KỲ I',
    subject: 'Môn: TOÁN HỌC - KHỐI 12',
    time: '90 phút',
    includeSolutions: true,
    shuffle: false,
    fileName: `De_Thi_Toan_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '_')}`
  });

  const handleExport = () => {
    onExport(config);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '550px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={22} color="#6366f1" /> Cấu hình xuất đề (.tex)
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Tên trường / Đơn vị</label>
              <input type="text" value={config.schoolName} onChange={e => setConfig({...config, schoolName: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Kỳ thi / Tiêu đề</label>
              <input type="text" value={config.examTitle} onChange={e => setConfig({...config, examTitle: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Môn học & Khối</label>
            <input type="text" value={config.subject} onChange={e => setConfig({...config, subject: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Thời gian làm bài</label>
              <input type="text" value={config.time} onChange={e => setConfig({...config, time: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Tên file lưu</label>
              <input type="text" value={config.fileName} onChange={e => setConfig({...config, fileName: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem', color: '#1e293b' }}>
              <input type="checkbox" checked={config.includeSolutions} onChange={e => setConfig({...config, includeSolutions: e.target.checked})} style={{ width: '18px', height: '18px' }} />
              Bao gồm Lời giải chi tiết (\loigiai)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem', color: '#1e293b' }}>
              <input type="checkbox" checked={config.shuffle} onChange={e => setConfig({...config, shuffle: e.target.checked})} style={{ width: '18px', height: '18px' }} />
              <Shuffle size={16} /> Đảo ngẫu nhiên thứ tự câu hỏi
            </label>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '0.75rem' }}>
            Đề thi sẽ được xuất bản cho <b>{cartItems.length}</b> câu hỏi đã chọn.
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Hủy bỏ</button>
          <button onClick={handleExport} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} /> Xuất file .tex
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExportModal;