# 🎯 Problem Bank Management System - Setup Guide

Hướng dẫn chi tiết từ A-Z để cài đặt và chạy ứng dụng Problem Bank trên máy tính của bạn.

---

## 📋 Yêu Cầu Ban Đầu

**Trước khi bắt đầu, bạn cần:**
- 💻 Máy tính (Windows/Mac/Linux) với ít nhất 2GB RAM
- 🌐 Internet connection (để download các package)
- ⏱️ Khoảng 30 phút cho lần setup đầu tiên

**Bạn KHÔNG cần:**
- ❌ Biết lập trình (tôi sẽ hướng dẫn từng bước)
- ❌ Cài Docker hay các tool phức tạp
- ❌ Hiểu về database (tôi đã setup sẵn SQLite)

---

## 🚀 Bước 1: Cài Đặt Node.js (10 phút)

Node.js là "engine" để chạy ứng dụng của bạn. Giống như cài Microsoft Office vậy.

### Windows

1. Mở trình duyệt → đi đến: **https://nodejs.org**
2. Click nút xanh **LTS** (bản ổn định)
3. File `.msi` sẽ tự động download
4. Double-click file → Next → Next → Install
5. Chọn `Automatically install the necessary tools` → Next → Finish
6. Máy tính sẽ restart (bình thường)

### Mac

**Cách 1 (Dễ nhất):**
1. Mở **Terminal** (Cmd + Space → gõ "Terminal" → Enter)
2. Dán lệnh này:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
```
3. Chờ xong (~5 phút)

**Cách 2 (Nếu cách 1 không được):**
- Tải file `.pkg` từ https://nodejs.org → Double-click → Next → Finish

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install nodejs npm -y
```

---

### ✅ Kiểm Tra Cài Đặt

Mở **Terminal** (Windows: Win+R → `cmd`) và gõ:
```bash
node --version
npm --version
```

**Kết quả mong muốn:**
```
v18.17.0  (hoặc version cao hơn)
9.6.7
```

Nếu thấy version → ✓ Cài đặt thành công!

---

## 🎯 Bước 2: Tải Starter Project (5 phút)

Tôi đã chuẩn bị sẵn một project starter cho bạn.

### Tải Project

1. **Cách dễ nhất:** Tôi sẽ gửi link GitHub
   - Vào link → Click **Code** (nút xanh) → **Download ZIP**
   - Giải nén vào folder (vd: `C:\Users\YourName\Desktop\problem-bank`)

2. **Hoặc dùng Git (nếu bạn biết):**
```bash
git clone https://github.com/[your-repo]/problem-bank.git
cd problem-bank
```

**Sau khi tải xong, folder của bạn sẽ có cấu trúc:**
```
problem-bank/
├─ src/                    ← Code React
├─ public/                 ← HTML static
├─ data/                   ← Database (SQLite)
├─ package.json            ← Dependencies
├─ README.md
└─ .gitignore
```

---

## ⚙️ Bước 3: Cài Dependencies (5 phút)

**Terminal** → Vào folder project:

```bash
cd C:\Users\YourName\Desktop\problem-bank
```

(Hoặc đường dẫn nơi bạn tải project)

Rồi chạy:
```bash
npm install
```

**Chờ cho đến khi thấy:**
```
added 150+ packages in 2m45s
```

(Có thể mất 3-5 phút tùy tốc độ internet)

---

## 🎬 Bước 4: Chạy App Lần Đầu (10 phút)

Vẫn trong Terminal (cùng folder), gõ:
```bash
npm start
```

**Chờ thấy:**
```
Compiled successfully!
Open http://localhost:3000
```

Sau đó:
- 🌐 Browser sẽ **tự động mở** → localhost:3000
- 📱 Bạn sẽ thấy trang **Problem Bank Home**

**Nếu browser không mở tự động:** Mở Chrome/Firefox → gõ `http://localhost:3000` vào URL bar

---

## 💡 Bước 5: Bước Đầu Tiên - Add Bài Tập (5 phút)

### Màn Hình Home
```
┌─────────────────────────────────┐
│  🎓 Problem Bank Management     │
├─────────────────────────────────┤
│ [+ Add Problem]  [Search]  [📊 Stats]
│
│ Recent problems:
│ ├─ Đạo hàm tại x=1 (Added: 2 hrs ago)
│ ├─ Tích phân ∫x² dx (Added: 1 day ago)
│ └─ [More...]
└─────────────────────────────────┘
```

### Thêm Bài Tập Đầu Tiên

1. Click **[+ Add Problem]**
2. Điền form:

```
Problem Statement (LaTeX):
┌─────────────────────────────┐
│ Tìm đạo hàm của $f(x) = x^2$
└─────────────────────────────┘

Solution (LaTeX):
┌─────────────────────────────┐
│ $f'(x) = 2x$
└─────────────────────────────┘

Topic:        [Đạo hàm ▼]
Level:        [1 ○ 2 ○ 3]  ← chọn 2
Type:         [Tự luận ☑] [Trắc nghiệp ☐]
Tags:         [đạo hàm cơ bản, tính toán]
Notes:        [Bài đơn giản, dành cho lớp 11]

[Save] [Cancel]
```

3. Click **[Save]** → ✓ Done!

---

## 🔍 Bước 6: Tìm & Filter Bài Tập

### Search Tab

```
Search: [____________________] [🔍]
Topic:      [All ▼]
Level:      [All ▼]
Type:       [All ▼]
Tags:       [Tag1] [Tag2] [+Add]

Results: 1 problems found
┌──────────────────────────────────┐
│ [✓] Đạo hàm của f(x)=x² (Level 2)
│     Tags: đạo hàm, tính toán
│     [Preview] [Edit] [Delete]
└──────────────────────────────────┘
```

---

## 📥 Bước 7: Export PDF (Sau đó)

Khi bạn có 5-10 bài tập → Click **[Generate PDF]** → Lấy file PDF → In

---

## 🛑 Bước 8: Dừng App

**Terminal** (nơi app đang chạy):
```
Ctrl + C
```

Sau đó gõ: `Y` → Enter

---

## 📅 Lần Sau Muốn Dùng

Chỉ cần:

```bash
cd C:\Users\YourName\Desktop\problem-bank
npm start
```

Browser tự mở → localhost:3000 → Done!

**Không cần `npm install` lần tiếp theo!**

---

## ❓ Gặp Lỗi? Troubleshooting

### Lỗi: "port 3000 already in use"
**Giải pháp:** Mở tab Terminal khác → gõ:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [pid] /F

# Mac/Linux
lsof -i :3000
kill -9 [pid]
```

### Lỗi: "npm: command not found"
**Giải pháp:** Node.js chưa cài đúng → restart máy → cài lại

### Lỗi: "Cannot find module..."
**Giải pháp:** 
```bash
npm install
npm start
```

### App mở nhưng không hiển thị gì
**Giải pháp:** Chờ 10 giây, thenrefresh page (F5)

---

## 💾 Backup Dữ Liệu

**Mỗi tuần, backup file:**
```
problem-bank/data/problems.db
```

Copy vào Google Drive hoặc USB → An toàn 100%

---

## 🎓 Tiếp Theo

1. ✅ Cài đặt xong → explore app
2. ✅ Thêm 10-20 bài tập → test filter
3. ✅ Generate PDF → xem kết quả
4. 📞 Hỏi tôi nếu muốn:
   - Thêm tính năng mới
   - Tùy chỉnh UI
   - Upgrade lên Desktop App

---

## 📞 Liên Hệ

Nếu gặp vấn đề:
- Gửi ảnh screenshot lỗi
- Gồm Terminal output
- Hệ điều hành (Windows/Mac/Linux)

Tôi sẽ fix trong 1 giờ! 💪

---

**Selamat! Bạn đã sẵn sàng! 🚀**
