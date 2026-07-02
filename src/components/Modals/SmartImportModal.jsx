import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Upload, FileText, CheckCircle, Trash2, Loader, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ClassificationPicker from '../ClassificationPicker';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseProblemLatex } from '../../utils/extractFigures';

// Phân loại rỗng khởi tạo cho mỗi câu rà soát (giống form Thêm/Sửa).
const makeEmptyCls = () => ({ categoryIds: [], difficultyByHe: {}, gradeIds: [], tags: '' });

const SmartImportModal = ({ onClose, onSave, checkDuplicate }) => {
  const [files, setFiles] = useState([]);
  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'review'
  const [results, setResults] = useState([]);
  const [selectedForBulk, setSelectedForBulk] = useState([]); // id các bài đang tick để phân loại hàng loạt
  const [showBulkPicker, setShowBulkPicker] = useState(false); // có đang mở bảng phân loại dùng chung không
  const [bulkCls, setBulkCls] = useState(makeEmptyCls());       // giá trị đang chọn trong bảng dùng chung
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);

  // API key đọc lúc chạy: ưu tiên key đã lưu trong Cài đặt, fallback biến môi trường (lúc dev).
  const apiKey = (localStorage.getItem('pb-gemini-key') || process.env.REACT_APP_GEMINI_API_KEY || '').trim();
  const genAI = useMemo(() => (apiKey ? new GoogleGenerativeAI(apiKey) : null), [apiKey]);

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
    if (!genAI) { toast.error('Chưa có API key Gemini — vào Cài đặt để nhập.'); return; }
    setStep('processing');
    let tempResults = [];
    let hasError = false;

    try {
      // Đổi sang model flash mới nhất của Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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
                id: crypto.randomUUID(),
                rawLatex: `\\begin{bt}\n${match[1].trim()}\n\\end{bt}`,
                type: 'Tự luận',
                cls: makeEmptyCls()
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
                  id: crypto.randomUUID(),
                  rawLatex: latexStr,
                  type: p.type || 'Tự luận', // giữ loại câu AI dự đoán; phân loại để Thầy tự gắn
                  cls: makeEmptyCls()
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
        // Kiểm trùng với kho đã lưu (đối chiếu từng bài vừa bóc tách).
        const checked = tempResults.map(item => {
          const { statement, solution } = parseProblemLatex(item.rawLatex);
          const dups = checkDuplicate(statement, solution);
          return dups.length ? { ...item, dup: dups[0] } : item;
        });
        setResults(checked);
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
    setSelectedForBulk(prev => prev.filter(x => x !== id)); // bài bị xoá thì cũng bỏ khỏi danh sách đang tick
  };

  // --- PHÂN LOẠI HÀNG LOẠT: chỉ áp dụng cho các bài đang được tick ở màn review ---
  const toggleSelectForBulk = (id) => {
    setSelectedForBulk(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAllForBulk = () => {
    setSelectedForBulk(prev => prev.length === results.length ? [] : results.map(r => r.id));
  };
  const applyBulkCls = () => {
    setResults(prev => prev.map(r => selectedForBulk.includes(r.id) ? { ...r, cls: bulkCls } : r));
    setSelectedForBulk([]);
    setShowBulkPicker(false);
    setBulkCls(makeEmptyCls());
  };

  const handleFinalSave = () => {
    // Chuyển đổi rawLatex về format lưu chuẩn của ngân hàng
    const finalProblems = results.map(item => {
      const { statement, solution, figStatement, figSolution } = parseProblemLatex(item.rawLatex);
      return {
        id: item.id,
        statement: statement,
        solution: solution,
        topic: 'Chưa phân loại', // cột cũ (legacy) — giữ mặc định, không dùng nữa
        level: 1,                // cột cũ (legacy) — giữ mặc định
        type: item.type,
        tags: item.cls?.tags || '',
        figStatement,
        figSolution,
        // Phân loại mới — đính kèm để saveImportedProblems lưu qua saveClassification
        categoryIds: item.cls?.categoryIds || [],
        difficultyByHe: item.cls?.difficultyByHe || {},
        gradeIds: item.cls?.gradeIds || [],
        dateAdded: new Date().toISOString(),
        timesUsed: 0
      };
    });
    onSave(finalProblems);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: 'var(--color-surface-muted)', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        
        {/* Header Modal */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', borderRadius: '16px 16px 0 0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={24} style={{ color: 'var(--color-cobalt)' }} /> Chuyển đổi LaTeX (AI)
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Hỗ trợ Kéo thả & Ctrl+V ảnh trực tiếp vào cửa sổ này.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={28} /></button>
        </div>

        {/* --- STEP 1: UPLOAD & DRAG DROP --- */}
        {step === 'upload' && (
          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {!genAI && (
              <div style={{ padding: '0.8rem 1rem', borderRadius: 8, background: 'var(--color-amber-bg)', color: 'var(--color-amber-text)', fontSize: '0.9rem' }}>
                Chưa có API key Gemini. Vào <b>Cài đặt → Khoá API Gemini</b> để nhập, rồi mở lại cửa sổ này.
              </div>
            )}
            <div
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              style={{ border: `2px dashed ${isDragging ? 'var(--color-cobalt)' : 'var(--color-border)'}`, backgroundColor: isDragging ? 'var(--color-cobalt-bg)' : 'var(--color-surface)', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => fileInputRef.current.click()}
            >
              <input type="file" ref={fileInputRef} multiple accept=".tex,.txt,image/png,image/jpeg,application/pdf" style={{ display: 'none' }} onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
              <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--color-cobalt-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Upload size={32} style={{ color: 'var(--color-cobalt)' }} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text)', fontSize: '1.25rem' }}>Kéo thả hoặc Nhấp để chọn file</h3>
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Hỗ trợ PDF, Ảnh (PNG, JPG) và File .tex</p>
            </div>

            {files.length > 0 && (
              <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border)' }}>
                <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} /> Tài liệu nguồn ({files.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {files.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--color-surface-muted)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--color-text)', fontWeight: 500 }}>{f.name}</span>
                      <button onClick={() => removeFile(idx)} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16}/></button>
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
            <Loader size={48} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem', color: 'var(--color-cobalt)' }} />
            <h3 style={{ color: 'var(--color-text)' }}>AI đang đọc và bóc tách tài liệu...</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>Tốc độ phụ thuộc vào số lượng và dung lượng file.</p>
          </div>
        )}

        {/* --- STEP 3: REVIEW & EDIT --- */}
        {step === 'review' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--color-border)' }}>
            <div style={{ backgroundColor: 'var(--color-surface)', padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--color-solution-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20}/> Hoàn tất phân tích!</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Tìm thấy <b>{results.length}</b> câu hỏi. Thầy có thể rà soát và chỉnh sửa ngay bên dưới.</p>
              </div>
            </div>

            {/* Thanh công cụ: tick nhiều bài rồi gán phân loại chung 1 lần */}
            <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', border: showBulkPicker ? '1px solid var(--color-cobalt)' : '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  {selectedForBulk.length > 0 ? `Đã chọn ${selectedForBulk.length} bài` : 'Tick các bài giống nhau để phân loại hàng loạt'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="card-btn" onClick={toggleSelectAllForBulk} disabled={results.length === 0}>
                    {selectedForBulk.length === results.length && results.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                  <button type="button" className="card-btn card-btn-primary" disabled={selectedForBulk.length === 0} onClick={() => setShowBulkPicker(s => !s)}>
                    Phân loại hàng loạt
                  </button>
                </div>
              </div>

              {showBulkPicker && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                  <ClassificationPicker value={bulkCls} onChange={setBulkCls} />
                  <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                    <button type="button" className="card-btn card-btn-primary" disabled={selectedForBulk.length === 0} onClick={applyBulkCls}>
                      Áp dụng cho {selectedForBulk.length} bài
                    </button>
                    <button type="button" className="card-btn" onClick={() => setShowBulkPicker(false)}>Đóng</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {results.map((res, index) => (
                <div key={res.id} style={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedForBulk.includes(res.id)}
                        onChange={() => toggleSelectForBulk(res.id)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                        title="Chọn bài này để phân loại hàng loạt"
                      />
                      <select value={res.type} onChange={(e) => updateResultItem(res.id, 'type', e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
                        <option value="Tự luận">Tự luận</option>
                        <option value="Trắc nghiệm">Trắc nghiệm</option>
                        <option value="Đúng/Sai">Đúng/Sai</option>
                        <option value="Trả lời ngắn">Trả lời ngắn</option>
                      </select>
                    </div>
                    <button onClick={() => removeResultItem(res.id)} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }} title="Xóa câu này nếu nhận diện sai"><Trash2 size={20}/></button>
                  </div>
                  
                  {res.dup && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--color-amber-bg)', color: 'var(--color-amber-text)', fontSize: '0.85rem', fontWeight: 600 }}>
                      <AlertTriangle size={16} />
                      <span>Có thể trùng với một bài đã lưu — Đề: {(res.dup.statementSimilarity * 100).toFixed(0)}% · Lời giải: {(res.dup.solutionSimilarity * 100).toFixed(0)}%</span>
                    </div>
                  )}

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
                      border: '1px solid var(--color-border)', 
                      fontFamily: 'monospace', 
                      fontSize: '14px',
                      resize: 'none', // Tắt thanh kéo gạch chéo ở góc
                      backgroundColor: 'var(--color-surface-muted)',
                      color: 'var(--color-text)',
                      overflow: 'hidden' // Giấu thanh cuộn thừa
                    }}
                  />

                  {/* Task 17: gắn phân loại cho từng câu trước khi lưu hàng loạt */}
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9rem' }}>Phân loại</label>
                    <ClassificationPicker value={res.cls} onChange={(newCls) => updateResultItem(res.id, 'cls', newCls)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', borderRadius: '0 0 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
          
          {step === 'upload' && (
            <button onClick={handleProcess} disabled={files.length === 0 || !genAI} style={{ padding: '0.75rem 2rem', borderRadius: '8px', border: 'none', backgroundColor: (files.length > 0 && genAI) ? 'var(--color-cobalt)' : 'var(--color-text-subtle)', color: '#fff', fontWeight: 600, cursor: (files.length > 0 && genAI) ? 'pointer' : 'not-allowed' }}>
              Bắt đầu chuyển hóa
            </button>
          )}

          {step === 'review' && (
            <button onClick={handleFinalSave} style={{ padding: '0.75rem 2rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-success)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Lưu {results.length} bài vào Ngân hàng
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default SmartImportModal;