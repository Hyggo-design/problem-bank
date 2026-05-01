# 📖 Problem Bank - Quick Reference Guide

## Tất Cả Những Gì Bạn Cần Biết Để Bắt Đầu

---

## 🎯 Bước Cơ Bản (Lần Đầu)

### 1. Cài Đặt Node.js
```bash
# Download từ: https://nodejs.org (LTS version)
# Cài như bất kỳ app khác
# Kiểm tra: node --version
```

### 2. Tải Project
```bash
# Option 1: Download ZIP từ GitHub → Unzip
# Option 2: git clone [repo-url]
cd problem-bank
```

### 3. Cài Dependencies
```bash
npm install
```

### 4. Chạy App
```bash
npm start
```
App sẽ tự mở ở http://localhost:3000

---

## 📝 Thêm Bài Tập

**Form có các trường:**

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| **Statement** | Đề bài (LaTeX) | `Tìm đạo hàm của $f(x) = x^2 + 3x$` |
| **Solution** | Lời giải (LaTeX) | `$f'(x) = 2x + 3$` |
| **Topic** | Chủ đề | Đạo hàm, Tích phân, ... |
| **Level** | Cấp độ | 1 (cơ bản), 2 (trung), 3 (nâng) |
| **Type** | Loại bài | Tự luận, Trắc nghiệp, Chứng minh |
| **Tags** | Từ khóa (cách dấu phẩy) | `đạo hàm, cực trị, tối ưu` |
| **Notes** | Ghi chú cá nhân | Bài này dùng cho lớp 11A |

**LaTeX Tips:**
```
Inline:   $x^2$  hoặc  $\frac{a}{b}$
Display:  $$\int x \, dx = \frac{x^2}{2} + C$$
```

---

## 🔍 Tìm & Lọc Bài Tập

### Search
- Tìm trong statement và tags
- Gõ keyword bất kỳ → kết quả xuất hiện ngay

### Filter
- **Topic**: Lọc theo chủ đề (Đạo hàm, Tích phân, ...)
- **Level**: 1 = cơ bản, 2 = trung bình, 3 = nâng cao
- Kết hợp nhiều filter → kết quả được refine

### Sort (trong version sau)
- Sẽ thêm sắp xếp theo: ngày thêm, độ khó, ...

---

## 💾 Backup Dữ Liệu

### Tự động backup (Khuyến nghị)
```bash
# Copy file này hàng tuần:
problem-bank/data/problems.db  →  Google Drive
```

### Hoặc dùng Cloud Sync
```bash
# Đặt folder 'data' trong Google Drive:
ln -s ~/GoogleDrive/pb-data ~/problem-bank/data
```

---

## 📥 Export

### Export Text (Hiện tại)
- Click **Export** → Download file `.txt`
- Mở với Notepad → copy vào Word/LaTeX

### Export PDF (Sẽ thêm)
- Tôi sẽ add feature này ở version tiếp theo
- Có thể chọn: có/không solution, randomize order, ...

---

## 🛠️ Tùy Chỉnh

### Thay đổi Topics
Mở `App.jsx` → tìm dòng:
```javascript
const topics = [
  'Đạo hàm', 'Tích phân', 'Lượng giác', ...
];
```
Thêm/xóa topic theo ý muốn

### Thay đổi Màu Sắc
Mở `App.css` → tìm:
```css
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```
Đổi hex color (#667eea, #764ba2) → https://colorpicker.com

### Thay đổi Font
Mở `App.css` → tìm:
```css
body {
  font-family: 'Segoe UI', Tahoma, ...;
}
```

---

## ⚡ Keyboard Shortcuts (Sẽ thêm)

| Shortcut | Hành động |
|----------|----------|
| `Ctrl+N` | Thêm bài mới |
| `Ctrl+F` | Focus search box |
| `Ctrl+E` | Export |
| `Ctrl+L` | Clear filters |

---

## 🐛 Troubleshooting

### App không chạy
```bash
# Xóa node_modules
rm -rf node_modules

# Cài lại
npm install
npm start
```

### Port 3000 đã dùng
```bash
# Windows:
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Mac/Linux:
lsof -i :3000
kill -9 [PID]
```

### Mất dữ liệu
- Dữ liệu lưu ở `localStorage` (browser)
- Xóa browser cache = mất dữ liệu!
- **Luôn backup file `.db` thường xuyên**

---

## 📚 LaTeX Cheat Sheet

```latex
Ký hiệu    | Code
-----------|----------
Superscript| x^2
Subscript  | x_1
Fraction   | \frac{a}{b}
Square root| \sqrt{x}
Integral   | \int
Derivative | \frac{d}{dx}
Greek      | \alpha, \beta, \pi
Limit      | \lim_{x \to 0}
Sum        | \sum_{i=1}^{n}
Infinity   | \infty
Absolute   | |x|
Inequality | \leq, \geq
Belongs    | \in, \notin
Subset     | \subset, \supset
Union      | \cup
Intersect  | \cap
```

---

## 🚀 Tiếp Theo (Roadmap)

**v1.1 (sắp tới):**
- ✓ Export PDF cố định
- ✓ Randomize order khi generate
- ✓ Dark mode

**v1.2 (tháng sau):**
- ✓ SQLite real database (thay localStorage)
- ✓ Import từ CSV/Excel
- ✓ Duplicate detection
- ✓ Student performance tracking

**v2.0 (Desktop App):**
- ✓ Electron packaging
- ✓ Standalone .exe / .dmg

---

## 📞 Hỗ Trợ

**Gặp vấn đề?**
1. Kiểm tra lại SETUP_GUIDE.md
2. Gửi screenshot + error message
3. Tôi sẽ fix trong 1 giờ! 💪

---

**Happy teaching! 🎓**
