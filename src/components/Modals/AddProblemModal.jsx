import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PROBLEM_TYPES } from '../../utils/constants';
import ClassificationPicker from '../ClassificationPicker';
import { parseProblemLatex } from '../../utils/extractFigures';

const AddProblemModal = ({ onClose, onSave }) => {

  // 2. Khai báo hàm tạo dữ liệu gốc (LaTeX, loại câu, ghi chú)
  const getInitialFormData = () => ({
    rawLatex: '',
    type: 'Tự luận',
    notes: ''
  });
  // Phân loại mới (cây + độ khó theo hệ + lớp + tag) cho ClassificationPicker
  const getInitialCls = () => ({ categoryIds: [], difficultyByHe: {}, gradeIds: [], tags: '' });

  // 3. Nạp dữ liệu gốc vào state (CHỈ KHAI BÁO 1 LẦN DUY NHẤT)
  const [formData, setFormData] = useState(getInitialFormData());
  const [cls, setCls] = useState(getInitialCls());

  // 4. Hàm xử lý đóng Modal an toàn (Dọn rác trước khi đóng)
  const handleSafeClose = () => {
    setFormData(getInitialFormData());
    setCls(getInitialCls());
    onClose();
  };

  // --- HÀM KIỂM TRA DỮ LIỆU TẬP TRUNG ---
  const validateForm = (raw) => {
    const errors = [];
    
    if (!raw.trim()) {
      errors.push('Thầy chưa dán nội dung bài tập LaTeX vào ạ!');
    } else {
      // Chỉ kiểm tra các lỗi sâu hơn nếu đã có nội dung
      if (raw.length > 10000) {
        errors.push('Nội dung quá dài (vượt quá 10.000 ký tự). Thầy vui lòng chia nhỏ bài nhé!');
      }
      if (!raw.includes('\\begin{bt}') || !raw.includes('\\end{bt}')) {
        errors.push('Thiếu cấu trúc \\begin{bt} ... \\end{bt} chuẩn của ex_test!');
      }
      // Thầy có thể thêm check tags ở đây sau này nếu cần:
      // if (formData.tags && formData.tags.split(',').length > 10) errors.push('Không nên để quá 10 tags');
    }
    
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const raw = formData.rawLatex;

    // 1. Chạy qua trạm kiểm duyệt
    const errors = validateForm(raw);
    
    // 2. Nếu có lỗi, xả toàn bộ thông báo lỗi ra màn hình và dừng lại
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    // 3. Nếu an toàn, tự động bóc tách Đề bài và Lời giải
    const { statement, solution, figStatement, figSolution } = parseProblemLatex(raw);

    const newProblem = {
      id: crypto.randomUUID(),
      statement: statement,
      solution: solution,
      topic: 'Chưa phân loại',   // cột cũ (legacy) — giữ mặc định, không dùng nữa
      level: 1,                  // cột cũ (legacy) — giữ mặc định
      type: formData.type,
      tags: cls.tags,            // tag giờ lấy từ ClassificationPicker
      notes: formData.notes,
      figStatement,
      figSolution,
      // Phân loại mới — đi kèm để addProblem lưu qua saveClassification
      categoryIds: cls.categoryIds,
      difficultyByHe: cls.difficultyByHe,
      gradeIds: cls.gradeIds,
      dateAdded: new Date().toISOString(),
      timesUsed: 0
    };

    onSave(newProblem);
    setFormData(getInitialFormData()); // Dọn sạch form
    setCls(getInitialCls());
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px var(--shadow)' }}>

        {/* Header Modal */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text)' }}>Thêm Bài Tập Mới</h2>
          <button onClick={handleSafeClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text)' }}>Mã LaTeX (\begin&#123;bt&#125; ... \end&#123;bt&#125;)</label>
            <textarea
              value={formData.rawLatex}
              onChange={(e) => setFormData({...formData, rawLatex: e.target.value})}
              placeholder="\begin{bt}&#10;Nội dung đề bài...&#10;\loigiai{ Lời giải... }&#10;\end{bt}"
              rows="8"
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace', fontSize: '14px', resize: 'vertical' }}
            />
          </div>



          {/* Ô chọn Loại câu (giữ nguyên) */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9rem' }}>Loại câu</label>
            <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
              {PROBLEM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          {/* Phân loại mới: cây chuyên đề + độ khó theo hệ + lớp + tag (thay 3 ô cũ) */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9rem' }}>Phân loại</label>
            <ClassificationPicker value={cls} onChange={setCls} />
          </div>

          {/* Nút lưu */}
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={handleSafeClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'pointer' }}>
              Hủy
            </button>
            <button type="submit" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-cobalt)', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={18} /> Lưu Bài Tập
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddProblemModal;