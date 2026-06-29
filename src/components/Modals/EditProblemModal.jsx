import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PROBLEM_TYPES } from '../../utils/constants';
import ClassificationPicker from '../ClassificationPicker';
import { parseProblemLatex, reconstructProblemLatex } from '../../utils/extractFigures';

const EditProblemModal = ({ problem, onClose, onSave }) => {
  // Mã LaTeX + loại câu + ghi chú (các trường còn ở form). Chủ đề/độ khó/lớp/tag
  // giờ do ClassificationPicker quản lý (state `cls` bên dưới).
  const [formData, setFormData] = useState({
    rawLatex: '',
    type: 'Tự luận',
    notes: ''
  });
  // Phân loại mới (cây + độ khó theo hệ + lớp + tag) cho ClassificationPicker.
  const [cls, setCls] = useState({ categoryIds: [], difficultyByHe: {}, gradeIds: [], tags: '' });

  // Tự động "hút" dữ liệu của câu hỏi đang chọn đổ vào form khi mở Modal.
  useEffect(() => {
    if (problem) {
      // Tái cấu trúc lại mã LaTeX từ các trường dữ liệu riêng lẻ của bài tập
      const latex = reconstructProblemLatex(problem);

      setFormData({
        rawLatex: latex,
        type: problem.type || 'Tự luận',
        notes: problem.notes || ''
      });

      // Task 14: nạp phân loại đã lưu của bài vào picker (đã được loadProblems gắn sẵn).
      setCls({
        categoryIds: problem.categoryIds || [],
        difficultyByHe: problem.difficultyByHe || {},
        gradeIds: problem.gradeIds || [],
        tags: problem.tags || ''
      });
    }
  }, [problem]);

  // TRẠM KIỂM DUYỆT DỮ LIỆU (Validation)
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

    // CHUẨN HÓA KÝ HIỆU GÓC THEO CHUẨN VIỆT NAM (\widehat)
    raw = raw.replace(/\\angle\s*\{([^}]+)\}/g, '\\widehat{$1}');
    raw = raw.replace(/\\angle\s+([a-zA-Z0-9]+)/g, '\\widehat{$1}');
    raw = raw.replace(/\\angle([a-zA-Z0-9]+)/g, '\\widehat{$1}');

    // BÓC TÁCH NỘI DUNG SAU KHI SỬA
    const { statement, solution, figStatement, figSolution } = parseProblemLatex(raw);

    // Giữ nguyên ID gốc, ngày tạo và các cột cũ (topic/level legacy) qua phép spread.
    // Phân loại mới đính thẳng lên object để sống sót qua chốt kiểm tra trùng
    // (App.jsx → checkDuplicate) trước khi tới updateProblem → saveClassification.
    const updatedProblem = {
      ...problem,
      statement: statement,
      solution: solution,
      type: formData.type,
      notes: formData.notes,
      figStatement,
      figSolution,
      tags: cls.tags, // tag giờ lấy từ ClassificationPicker
      categoryIds: cls.categoryIds,
      difficultyByHe: cls.difficultyByHe,
      gradeIds: cls.gradeIds
    };

    onSave(updatedProblem);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px var(--shadow)' }}>

        {/* Header Modal - nền amber nhẹ để phân biệt với Modal Thêm mới */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-amber-bg)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-amber-text)' }}>✏️ Chỉnh Sửa Bài Tập</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
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
              rows="10"
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
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'pointer' }}>
              Hủy
            </button>
            <button type="submit" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-amber)', color: 'var(--color-on-amber)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={18} /> Cập Nhật Thay Đổi
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditProblemModal;
