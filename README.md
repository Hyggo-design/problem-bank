# 🎓 Problem Bank Management System

Ứng dụng quản lý ngân hàng bài tập Toán chuyên cho giáo viên.

## ✨ Tính Năng

- ✅ **Thêm bài tập** với LaTeX support
- ✅ **Tìm kiếm & lọc** nhanh chóng
- ✅ **Sắp xếp** theo cấp độ, ngày thêm, ...
- ✅ **Export** bộ đề thành file
- ✅ **Backup** dữ liệu dễ dàng
- ✅ **Không cần internet** - toàn bộ lưu local

## 🚀 Quick Start

### 1. Cài Đặt
```bash
# Clone repo
git clone https://github.com/[your-repo]/problem-bank.git
cd problem-bank

# Cài dependencies
npm install

# Chạy app
npm start
```

App sẽ mở ở http://localhost:3000

### 2. Thêm Bài Tập
- Click **[+ Thêm Bài Tập]**
- Điền form (statement, solution, topic, level, ...)
- Click **[Lưu Bài Tập]**

### 3. Tìm Bài
- Dùng thanh search
- Lọc theo topic, level
- Click export nếu cần

## 📚 Hướng Dẫn Chi Tiết

- **Hướng dẫn setup:** Xem `SETUP_GUIDE.md`
- **Quick reference:** Xem `QUICK_REFERENCE.md`

## 🛠️ Công Nghệ

- **Frontend:** React 18
- **Styling:** CSS3
- **Database:** LocalStorage (sẽ upgrade lên SQLite)
- **Icons:** Lucide React

## 📦 Project Structure

```
problem-bank/
├── src/
│   ├── App.jsx              # Main component
│   ├── App.css              # Styling
│   ├── index.js             # Entry point
│   └── index.css
├── public/
│   └── index.html           # HTML template
├── data/
│   └── problems.db          # Database (khi upgrade)
├── package.json
├── SETUP_GUIDE.md
├── QUICK_REFERENCE.md
└── README.md
```

## 💾 Backup & Data

Dữ liệu hiện được lưu ở browser localStorage.

**Backup:**
```bash
# Copy file problems.db (khi upgrade)
problem-bank/data/problems.db → Google Drive
```

## 🔜 Roadmap

- [ ] SQLite database (thay localStorage)
- [ ] PDF export
- [ ] Import CSV
- [ ] Dark mode
- [ ] Student analytics
- [ ] Desktop app (Electron)

## 📞 Support

Gặp vấn đề? Xem `SETUP_GUIDE.md` phần troubleshooting hoặc liên hệ tôi.

## 📝 License

MIT License - Tự do sử dụng cho mục đích giáo dục.

---

**Happy teaching! 🎓**
