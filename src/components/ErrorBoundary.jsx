import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error) {
    // Cập nhật state để render fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Thầy có thể log lỗi ra console để sau này dễ debug
    console.error("Lỗi giao diện bị bắt bởi Error Boundary:", error, errorInfo);
    this.setState({ errorMsg: error.toString() });
  }

  render() {
    if (this.state.hasError) {
      // Giao diện dự phòng khi có lỗi xảy ra
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--color-bg)', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛡️</div>
          <h1 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Oái! Giao diện vừa gặp sự cố nhỏ.</h1>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '600px', marginBottom: '2rem', lineHeight: '1.6' }}>
            Thầy đừng lo, dữ liệu bài tập của Thầy vẫn an toàn. Có thể một đoạn mã LaTeX nào đó bị lỗi cú pháp khiến trình duyệt không thể hiển thị được.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--color-cobalt)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)' }}
          >
            Tải Lại Ứng Dụng (F5)
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;