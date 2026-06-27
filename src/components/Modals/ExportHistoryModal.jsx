import React, { useEffect } from 'react';
import { X, RefreshCcw, FileText } from 'lucide-react';
import { useExportHistory } from '../../hooks/useExportHistory';

const ExportHistoryModal = ({ onClose, onLoadToCart }) => {
  const { historyItems, isLoading, loadHistory } = useExportHistory();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 14, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
        
        <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text)' }}>Lịch sử xuất đề</h2>
          <button onClick={onClose} className="card-btn" style={{ border: 'none' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '1.3rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Đang tải lịch sử...</div>
          ) : historyItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
              Chưa có lịch sử xuất đề nào.
            </div>
          ) : (
            historyItems.map((item) => (
              <div key={item.id} style={{ 
                border: '1px solid var(--color-border)', borderRadius: 8, padding: '1rem', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg)' 
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                    <FileText size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
                    {item.template_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Ngày xuất: {formatDate(item.export_date)} — Gồm: {item.problem_ids.length} câu
                  </div>
                </div>
                <button 
                  onClick={() => onLoadToCart(item.problem_ids)} 
                  className="card-btn card-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RefreshCcw size={16} /> Tải lại vào giỏ
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportHistoryModal;
