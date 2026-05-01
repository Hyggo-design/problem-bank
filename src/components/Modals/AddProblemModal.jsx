import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

const AddProblemModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    rawLatex: '',
    topic: 'Đạo hàm',
    level: 1,
    type: 'Tự luận',
    tags: '',
    notes: ''
  });

  const topics = [
    'Đạo hàm', 'Tích phân', 'Lượng giác', 'Số phức', 
    'Ma trận', 'Hình học không gian', 'Xác suất', 'Giới hạn', 'Chưa phân loại'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const raw = formData.rawLatex;
    if (!raw.trim()) {
      alert('Vui lòng dán nội dung bài tập LaTeX vào nhé!');
      return;
    }

    // Tự động bóc tách Đề bài và Lời giải
    let cleanText = raw.replace(/\\begin\{bt\}/g, '').replace(/\\end\{bt\}/g, '').trim();
    let statement = cleanText;
    let solution = '';

    const loigiaiMatch = cleanText.match(/\\loigiai\{([\s\S]*?)\}(?=\s*$|\\end)/);
    if (loigiaiMatch) {
      solution = loigiaiMatch[1].trim();
      statement = cleanText.replace(loigiaiMatch[0], '').trim();
    }

    const newProblem = {
      id: Date.now(),
      statement: statement,
      solution: solution,
      topic: formData.topic,
      level: parseInt(formData.level),
      type: formData.type,
      tags: formData.tags,
      notes: formData.notes,
      dateAdded: new Date().toLocaleDateString('vi-VN'),
      timesUsed: 0
    };

    onSave(newProblem);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        
        {/* Header Modal */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Thêm Bài Tập Mới</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={24} />
          </button>
        </div>

        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>Mã LaTeX (\begin&#123;bt&#125; ... \end&#123;bt&#125;)</label>
            <textarea
              value={formData.rawLatex}
              onChange={(e) => setFormData({...formData, rawLatex: e.target.value})}
              placeholder="\begin{bt}&#10;Nội dung đề bài...&#10;\loigiai{ Lời giải... }&#10;\end{bt}"
              rows="8"
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '14px', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Chủ đề</label>
              <select value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', outline: 'none' }}>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Độ khó</label>
              <select value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', outline: 'none' }}>
                <option value="1">1 - Cơ bản</option>
                <option value="2">2 - Trung bình</option>
                <option value="3">3 - Nâng cao</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Loại câu</label>
              <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', outline: 'none' }}>
                <option value="Tự luận">Tự luận</option>
                <option value="Trắc nghiệm">Trắc nghiệm</option>
                <option value="Chứng minh">Chứng minh</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Tags (cách nhau bởi dấu phẩy)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              placeholder="ví dụ: cực trị, hình nón, min-max"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          {/* Nút lưu */}
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
              Hủy
            </button>
            <button type="submit" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={18} /> Lưu Bài Tập
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddProblemModal;