import { useState, useCallback } from 'react';

export const useCart = () => {
  // Lấy dữ liệu giỏ hàng từ bộ nhớ trình duyệt (nếu có)
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('problem-bank-cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Thêm câu hỏi vào giỏ
  const addToCart = useCallback((problem) => {
    setCartItems(prev => {
      // Kiểm tra xem câu hỏi đã có trong giỏ chưa để tránh thêm trùng
      if (prev.find(p => p.id === problem.id)) return prev;

      const newCart = [...prev, problem];
      localStorage.setItem('problem-bank-cart', JSON.stringify(newCart));
      return newCart;
    });
  }, []);

  // Xóa câu hỏi khỏi giỏ
  const removeFromCart = useCallback((problemId) => {
    setCartItems(prev => {
      const newCart = prev.filter(p => p.id !== problemId);
      localStorage.setItem('problem-bank-cart', JSON.stringify(newCart));
      return newCart;
    });
  }, []);

  // Làm sạch giỏ hàng
  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem('problem-bank-cart');
  }, []);

  return {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    cartCount: cartItems.length
  };
};
