import React from 'react';
import { BookOpen, AlertCircle, ShoppingCart, Activity } from 'lucide-react';

const Header = ({ stats }) => {
  const statCards = [
    { label: 'Tổng bài tập', value: stats.total, icon: <BookOpen size={22} color="var(--color-cobalt)" /> },
    { label: 'Chưa phân loại', value: stats.unclassified, icon: <AlertCircle size={22} color="var(--color-amber)" /> },
    { label: 'Giỏ đề thi', value: stats.cartCount, icon: <ShoppingCart size={22} color="var(--color-success)" /> },
    { label: 'Lượt sử dụng', value: stats.used, icon: <Activity size={22} color="var(--color-text-subtle)" /> },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px 0 rgba(15,23,42,0.05)' }}>

      {/* Tên App + người dùng */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
          Problem Bank <span style={{ color: 'var(--color-cobalt)' }}>Pro</span>
        </h1>
        <div style={{ padding: '0.35rem 0.85rem', backgroundColor: 'var(--color-surface-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-pill)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Thầy Sơn
        </div>
      </div>

      {/* Cụm thẻ thống kê */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        {statCards.map((stat, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--color-surface)', padding: '0.5rem 1.25rem', borderRadius: '10px', minWidth: '140px' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-surface-muted)', borderRadius: '8px', display: 'flex' }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Header;
