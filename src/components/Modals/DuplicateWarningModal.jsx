import React from 'react';
import { AlertTriangle, X, Save } from 'lucide-react';
import MathText from '../MathText';

const DuplicateWarningModal = ({ pendingSave, onConfirm, onCancel }) => {
  if (!pendingSave) return null;
  const { problem, duplicateInfo } = pendingSave;
  const similarityPct = (duplicateInfo.similarity * 100).toFixed(0);
  const existingProblem = duplicateInfo.problem;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999, // Đảm bảo nằm đè trên các Modal nhập liệu khác (zIndex: 100)
      backdropFilter: 'blur(4px)',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #ffedd5',
        animation: 'scaleUp 0.15s ease-out'
      }}>
        
        {/* Header Modal - Tông màu vàng cam cảnh báo */}
        <div style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#fff7ed',
          borderBottom: '1px solid #ffedd5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.2rem',
            color: '#c2410c',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontWeight: 700
          }}>
            <AlertTriangle size={22} color="#ea580c" />
            Cảnh báo: Trùng lặp nội dung ({similarityPct}%)
          </h2>
          <button onClick={onCancel} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9a3412',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            borderRadius: '50%',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffedd5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X size={20} />
          </button>
        </div>

        {/* Nội dung đối sánh */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: '1.5' }}>
            Hệ thống phát hiện câu hỏi Thầy đang soạn rất tương đồng với một câu hỏi đã lưu từ trước. Vui lòng rà soát và đối chiếu dưới đây:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Khối 1: Đang nhập */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#2563eb',
                marginBottom: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                📝 Câu hỏi Thầy đang soạn
              </div>
              <div style={{
                fontSize: '0.95rem',
                color: '#1e293b',
                padding: '0.75rem',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #f1f5f9',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                <MathText text={problem.statement} />
              </div>
            </div>

            {/* Khối 2: Đã có sẵn */}
            <div style={{
              border: '1px solid #fed7aa',
              borderRadius: '10px',
              padding: '1rem',
              backgroundColor: '#fffbeb'
            }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#ea580c',
                marginBottom: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>🔍 Câu hỏi trùng nhất đã lưu</span>
                <span style={{
                  backgroundColor: '#ffedd5',
                  color: '#9a3412',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem'
                }}>
                  {existingProblem.topic} • Lvl {existingProblem.level}
                </span>
              </div>
              <div style={{
                fontSize: '0.95rem',
                color: '#1e293b',
                padding: '0.75rem',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #fed7aa',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                <MathText text={existingProblem.statement} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem'
        }}>
          <button 
            onClick={onCancel} 
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            Quay lại chỉnh sửa
          </button>
          
          <button 
            onClick={onConfirm} 
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ea580c',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c2410c'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
          >
            <Save size={16} /> Vẫn tiếp tục lưu
          </button>
        </div>

      </div>
    </div>
  );
};

export default DuplicateWarningModal;
