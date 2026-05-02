import { useState, useEffect } from 'react';

export const useProblems = () => {
  const [problems, setProblems] = useState([]);

  // Khởi tạo dữ liệu từ bộ nhớ
  useEffect(() => {
    const saved = localStorage.getItem('problems');
    if (saved) {
      setProblems(JSON.parse(saved));
    }
  }, []);

  // Hàm tiện ích lưu vào bộ nhớ ngầm
  const saveToStorage = (data) => {
    localStorage.setItem('problems', JSON.stringify(data));
  };

  const addProblem = (newProblem) => {
    const updated = [newProblem, ...problems];
    setProblems(updated);
    saveToStorage(updated);
  };

  const updateProblem = (updatedProblem) => {
    const updatedList = problems.map(p => p.id === updatedProblem.id ? updatedProblem : p);
    setProblems(updatedList);
    saveToStorage(updatedList);
  };

  const deleteProblem = (id) => {
    const updated = problems.filter(p => p.id !== id);
    setProblems(updated);
    saveToStorage(updated);
  };

  const bulkDeleteProblems = (idsToDelete) => {
    const updated = problems.filter(p => !idsToDelete.includes(p.id));
    setProblems(updated);
    saveToStorage(updated);
  };

  const saveImportedProblems = (newProblems) => {
    if (newProblems.length > 0) {
      setProblems(prev => {
        const updated = [...newProblems, ...prev];
        saveToStorage(updated);
        return updated;
      });
    }
  };

  return { 
    problems, 
    addProblem, 
    updateProblem, 
    deleteProblem, 
    bulkDeleteProblems, 
    saveImportedProblems 
  };
};