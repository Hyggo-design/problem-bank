import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TOPICS, LEVELS, PROBLEM_TYPES } from '../../utils/constants';

const EditProblemModal = ({ problem, onClose, onSave }) => {
  // 1. Danh sách các chủ đề đồng bộ với AddProblemModal
  const topics = [
    'Đạo hàm', 'Tích phân', 'Lượng giác', 'Số phức', 
    'Ma trận', 'Hình học không gian', 'Xác suất', 'Giới hạn', 'Chưa phân loại'
  ];

  const [formData, setFormData] = useState({
    rawLatex: '',
    topic: 'Chưa phân loại',
    level: 1,
    type: 'Tự luận',
    tags: '',
    notes: ''
  });

  // 2. Tự động "hút" dữ liệu của câu hỏi đang chọn đổ vào form khi mở Modal
  useEffect(() => {
    if (problem) {
      // Tái cấu trúc lại mã LaTeX từ các trường dữ liệu riêng lẻ của bài tập
      const latex = `\\begin{bt}\n${problem.statement}\n${problem.solution ? `\\loigiai{\n${problem.solution}\n}\n` : ''}\\end{bt}`;
      
      setFormData({
        rawLatex: latex,
        topic: problem.topic || 'Chưa phân loại',
        level: problem.level || 1,
        type: problem.type || 'Tự luận',
        tags: problem.tags || '',
        notes: problem.notes || ''
      });
    }
  }, [problem]);

  // 3. TRẠM KIỂM DUYỆT DỮ LIỆU (Validation)
  const validateForm = (raw) => {
    const errors = [];
    if (!raw.trim()) {
      errors.push('Nội dung không được để trống ạ!');
    } else {
      if (raw.length > 10000) {
        errors.push('Nội dung quá dài (tối đa 10.000 ký tự).');
      }
      if (!raw.includes('\\begin{bt}') || !raw.includes('\\end{bt}')) {
        errors.push('Thiếu cấu trúc \\begin{bt} ... \\end{bt} chuẩn của ex_test!');
      }
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let raw = formData.rawLatex;

    // Chạy qua trạm kiểm soát
    const errors = validateForm(raw);
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    // 4. CHUẨN HÓA KÝ HIỆU GÓC THEO CHUẨN VIỆT NAM (\widehat)
    raw = raw.replace(/\\angle\s*\{([^}]+)\}/g, '\\widehat{$1}');
    raw = raw.replace(/\\angle\s+([a-zA-Z0-9]+)/g, '\\widehat{$1}');
    raw = raw.replace(/\\angle([a-zA-Z0-9]+)/g, '\\widehat{$1}');

    // 5. BÓC TÁCH NỘI DUNG SAU KHI SỬA
    let cleanText = raw.replace(/\\begin\{bt\}/g, '').replace(/\\end\{bt\}/g, '').trim();
    let statement = cleanText;
    let solution = '';

    const loigiaiMatch = cleanText.match(/\\loigiai\{([\s\S]*?)\}(?=\s*$|\\end)/);
    if (loigiaiMatch) {
      solution = loigiaiMatch[1].trim();
      statement = cleanText.replace(loigiaiMatch[0], '').trim();
    }

    // Giữ nguyên ID gốc và ngày tạo, chỉ cập nhật các thay đổi mới
    const updatedProblem = {
      ...problem, 
      statement: statement,
      solution: solution,
      topic: formData.topic,
      level: parseInt(formData.level),
      type: formData.type,
      tags: formData.tags,
      notes: formData.notes
    };

    onSave(updatedProblem);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        
        {/* Header Modal - Màu vàng nhẹ để phân biệt với Modal Thêm mới */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#92400e' }}>✏️ Chỉnh Sửa Bài Tập</h2>
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
              rows="10"
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '14px', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {/* Ô chọn Chủ đề */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Chủ đề</label>
              <select value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', outline: 'none' }}>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            {/* Ô chọn Độ khó */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Độ khó</label>
              <select value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', outline: 'none' }}>
                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            
            {/* Ô chọn Loại câu */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Loại câu</label>
              <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', outline: 'none' }}>
                {PROBLEM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Tags (cách nhau bởi dấu phẩy)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          {/* Nút lưu */}
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
              Hủy
            </button>
            <button type="submit" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#f59e0b', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={18} /> Cập Nhật Thay Đổi
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditProblemModal;