import React from 'react';
import { BookOpen, AlertCircle, ShoppingCart, Activity } from 'lucide-react';

const Header = ({ stats }) => {
  const statCards = [
    { label: 'Tổng bài tập', value: stats.total, icon: <BookOpen size={22} color="#2563eb" />, bg: '#eff6ff', textColor: '#1e3a8a' },
    { label: 'Chưa phân loại', value: stats.unclassified, icon: <AlertCircle size={22} color="#d97706" />, bg: '#fffbeb', textColor: '#92400e' },
    { label: 'Giỏ đề thi', value: stats.cartCount, icon: <ShoppingCart size={22} color="#059669" />, bg: '#ecfdf5', textColor: '#064e3b' },
    { label: 'Lượt sử dụng', value: stats.used, icon: <Activity size={22} color="#7c3aed" />, bg: '#faf5ff', textColor: '#4c1d95' },
  ];

  return (
    <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
      
      {/* Tên App và User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.025em' }}>
          Problem Bank <span style={{ color: '#2563eb' }}>Pro</span>
        </h1>
        <div style={{ padding: '0.35rem 0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
          👨‍🏫 Thầy Sơn
        </div>
      </div>

      {/* Cụm thẻ thống kê */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        {statCards.map((stat, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: stat.bg, padding: '0.5rem 1.25rem', borderRadius: '10px', minWidth: '140px' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#fff', borderRadius: '8px', display: 'flex', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: stat.textColor, lineHeight: 1.2 }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Header;