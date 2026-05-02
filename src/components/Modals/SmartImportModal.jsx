import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, Trash2, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';

const SmartImportModal = ({ onClose, onSave, genAI }) => {
  const [files, setFiles] = useState([]);
  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'review'
  const [results, setResults] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);

  // --- XỬ LÝ KÉO THẢ & PASTE ẢNH ---
  useEffect(() => {
    const handlePaste = (e) => {
      if (step !== 'upload') return;
      const pastedFiles = Array.from(e.clipboardData.files);
      if (pastedFiles.length > 0) {
        setFiles(prev => [...prev, ...pastedFiles]);
        toast.success(`Đã dán ${pastedFiles.length} tệp từ Clipboard`);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [step]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // --- XỬ LÝ AI & BÓC TÁCH (CÓ XỬ LÝ LỖI CHUẨN DOANH NGHIỆP) ---
  const handleProcess = async () => {
    if (files.length === 0) return;
    setStep('processing');
    let tempResults = [];
    let hasError = false;

    try {
      // Đổi sang model flash mới nhất của Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // LUỒNG 1: File .tex (Regex bóc tách trực tiếp không cần AI)
        if (file.name.endsWith('.tex') || file.name.endsWith('.txt')) {
          try {
            const text = await file.text();
            const safeText = text.replace(/\\angle\s*\{([^}]+)\}/g, '\\widehat{$1}')
                                 .replace(/\\angle\s+([a-zA-Z0-9]+)/g, '\\widehat{$1}')
                                 .replace(/\\angle([a-zA-Z0-9]+)/g, '\\widehat{$1}');

            const regex = /\\begin\{bt\}([\s\S]*?)\\end\{bt\}/g;
            let match;
            while ((match = regex.exec(safeText)) !== null) {
              tempResults.push({
                id: Date.now() + Math.random(),
                rawLatex: `\\begin{bt}\n${match[1].trim()}\n\\end{bt}`,
                topic: 'Chưa phân loại', level: 1, type: 'Tự luận'
              });
            }
          } catch (fileErr) {
            console.error("Lỗi đọc file text:", fileErr);
            toast.error(`Không thể đọc nội dung file: ${file.name}`);
            hasError = true;
          }
        } 
        // LUỒNG 2: Ảnh & PDF (Gọi API Gemini)
        else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
          try {
            const base64Data = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result.split(',')[1]);
              reader.readAsDataURL(file);
            });
            
            const prompt = `Trích xuất tất cả bài toán trong tài liệu này sang LaTeX (chuẩn gói ex_test, dùng \\widehat{} thay cho \\angle). Trả về mảng JSON cấu trúc: [{"statement": "đề bài", "solution": "lời giải (nếu có)", "topic": "chuyên đề dự đoán", "level": 1 hoặc 2 hoặc 3, "type": "Tự luận" hoặc "Trắc nghiệm"}]. CHỈ TRẢ VỀ JSON.`;
            
            // Gọi API (có nguy cơ rớt mạng ở đây)
            const result = await model.generateContent([prompt, { inlineData: { data: base64Data, mimeType: file.type } }]);
            let textRes = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            
            try {
              const aiProblems = JSON.parse(textRes);
              aiProblems.forEach(p => {
                const latexStr = `\\begin{bt}\n${p.statement || ''}\n${p.solution ? `\\loigiai{\n${p.solution}\n}` : ''}\n\\end{bt}`;
                tempResults.push({
                  id: Date.now() + Math.random(),
                  rawLatex: latexStr,
                  topic: p.topic || 'Chưa phân loại', // Fallback nếu AI không phân loại được
                  level: p.level || 1,
                  type: p.type || 'Tự luận'
                });
              });
            } catch (jsonErr) {
              console.error("Lỗi JSON từ AI:", textRes);
              toast.error(`AI không trả về đúng định dạng JSON cho file: ${file.name}`);
              hasError = true;
            }
          } catch (apiErr) {
            // Lỗi mạng hoặc lỗi server Gemini
            console.error("Gemini API Error:", apiErr);
            toast.error(`Lỗi kết nối AI (${file.name}): ${apiErr.message}`);
            hasError = true;
          }
        }
      }

      // Xử lý kết quả sau khi duyệt xong tất cả các file
      if (tempResults.length > 0) {
        setResults(tempResults);
        setStep('review');
        if (hasError) {
          toast.info("Đã bóc tách được một phần, nhưng có file bị lỗi trong quá trình xử lý.", { duration: 4000 });
        } else {
          toast.success("Bóc tách tài liệu thành công!");
        }
      } else {
        // Không có kết quả nào được bóc ra
        if (hasError) {
          toast.error("Quá trình xử lý thất bại. Thầy vui lòng thử lại nhé.");
        } else {
          toast.info("Không tìm thấy cấu trúc bài tập nào trong các file Thầy tải lên.");
        }
        setStep('upload'); // Trả về màn hình cũ để không bị kẹt loading
      }

    } catch (criticalErr) {
      // Bắt mọi lỗi tồi tệ nhất ở cấp cao nhất
      console.error("Lỗi hệ thống nghiêm trọng:", criticalErr);
      toast.error(`Hệ thống gặp sự cố: ${criticalErr.message}`);
      setStep('upload');
    }
  };

  // --- CẬP NHẬT KẾT QUẢ REVIEW ---
  const updateResultItem = (id, field, value) => {
    setResults(results.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const removeResultItem = (id) => {
    setResults(results.filter(r => r.id !== id));
  };

  const handleFinalSave = () => {
    // Chuyển đổi rawLatex về format lưu chuẩn của ngân hàng
    const finalProblems = results.map(item => {
      let cleanText = item.rawLatex.replace(/\\begin\{bt\}/g, '').replace(/\\end\{bt\}/g, '').trim();
      let statement = cleanText;
      let solution = '';
      const solMatch = cleanText.match(/\\loigiai\{([\s\S]*?)\}(?=\s*$|\\end)/);
      if (solMatch) {
        solution = solMatch[1].trim();
        statement = cleanText.replace(solMatch[0], '').trim();
      }
      return {
        id: item.id,
        statement: statement,
        solution: solution,
        topic: item.topic,
        level: parseInt(item.level),
        type: item.type,
        dateAdded: new Date().toLocaleDateString('vi-VN'),
        timesUsed: 0
      };
    });
    onSave(finalProblems);
  };

  const topics = ['Đạo hàm', 'Tích phân', 'Lượng giác', 'Số phức', 'Ma trận', 'Hình học không gian', 'Xác suất', 'Giới hạn', 'Chưa phân loại'];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        
        {/* Header Modal */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: '16px 16px 0 0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={24} color="#0ea5e9" /> Chuyển đổi LaTeX (AI)
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Hỗ trợ Kéo thả & Ctrl+V ảnh trực tiếp vào cửa sổ này.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={28} /></button>
        </div>

        {/* --- STEP 1: UPLOAD & DRAG DROP --- */}
        {step === 'upload' && (
          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div 
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              style={{ border: `2px dashed ${isDragging ? '#0ea5e9' : '#cbd5e1'}`, backgroundColor: isDragging ? '#f0f9ff' : '#fff', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => fileInputRef.current.click()}
            >
              <input type="file" ref={fileInputRef} multiple accept=".tex,.txt,image/png,image/jpeg,application/pdf" style={{ display: 'none' }} onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
              <div style={{ width: '64px', height: '64px', backgroundColor: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Upload size={32} color="#0284c7" />
              </div>
              <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '1.25rem' }}>Kéo thả hoặc Nhấp để chọn file</h3>
              <p style={{ margin: 0, color: '#64748b' }}>Hỗ trợ PDF, Ảnh (PNG, JPG) và File .tex</p>
            </div>

            {files.length > 0 && (
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} /> Tài liệu nguồn ({files.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {files.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{f.name}</span>
                      <button onClick={() => removeFile(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 2: LOADING --- */}
        {step === 'processing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Loader size={48} color="#0ea5e9" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <h3 style={{ color: '#0f172a' }}>AI đang đọc và bóc tách tài liệu...</h3>
            <p style={{ color: '#64748b' }}>Tốc độ phụ thuộc vào số lượng và dung lượng file.</p>
          </div>
        )}

        {/* --- STEP 3: REVIEW & EDIT --- */}
        {step === 'review' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: '#e2e8f0' }}>
            <div style={{ backgroundColor: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '1.5rem', borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#064e3b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20}/> Hoàn tất phân tích!</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#475569' }}>Tìm thấy <b>{results.length}</b> câu hỏi. Thầy có thể rà soát và chỉnh sửa ngay bên dưới.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {results.map((res, index) => (
                <div key={res.id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                      <select value={res.topic} onChange={(e) => updateResultItem(res.id, 'topic', e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        {topics.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select value={res.level} onChange={(e) => updateResultItem(res.id, 'level', e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option value="1">Level 1 - Cơ bản</option>
                        <option value="2">Level 2 - Trung bình</option>
                        <option value="3">Level 3 - Nâng cao</option>
                      </select>
                      <select value={res.type} onChange={(e) => updateResultItem(res.id, 'type', e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option value="Tự luận">Tự luận</option>
                        <option value="Trắc nghiệm">Trắc nghiệm</option>
                        <option value="Đúng/Sai">Đúng/Sai</option>
                        <option value="Trả lời ngắn">Trả lời ngắn</option>
                      </select>
                    </div>
                    <button onClick={() => removeResultItem(res.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }} title="Xóa câu này nếu nhận diện sai"><Trash2 size={20}/></button>
                  </div>
                  
                  <textarea 
                    value={res.rawLatex} 
                    onChange={(e) => updateResultItem(res.id, 'rawLatex', e.target.value)}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    style={{ 
                      width: '100%', 
                      boxSizing: 'border-box', // Chìa khóa để không bị tràn khung
                      minHeight: '120px', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      border: '1px solid #cbd5e1', 
                      fontFamily: 'monospace', 
                      fontSize: '14px', 
                      outline: 'none', 
                      resize: 'none', // Tắt thanh kéo gạch chéo ở góc
                      backgroundColor: '#f8fafc',
                      overflow: 'hidden' // Giấu thanh cuộn thừa
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', borderRadius: '0 0 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
          
          {step === 'upload' && (
            <button onClick={handleProcess} disabled={files.length === 0} style={{ padding: '0.75rem 2rem', borderRadius: '8px', border: 'none', backgroundColor: files.length > 0 ? '#0ea5e9' : '#94a3b8', color: '#fff', fontWeight: 600, cursor: files.length > 0 ? 'pointer' : 'not-allowed' }}>
              Bắt đầu chuyển hóa
            </button>
          )}

          {step === 'review' && (
            <button onClick={handleFinalSave} style={{ padding: '0.75rem 2rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Lưu {results.length} bài vào Ngân hàng
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default SmartImportModal;