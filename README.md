# 🧠 MindMap Studio

App vẽ **sơ đồ tư duy (mindmap)** chạy 100% static (HTML/CSS/JS thuần) — vẽ được **giống ảnh mẫu** bạn gửi:
- Node trung tâm đỏ `Phương pháp thực nghiệm khoa học`
- Nhánh cong Bezier: `Khái niệm`, `Vai trò`, `Đặc điểm`, `Quy trình thực hiện`
- Node cấp 2 kiểu **Pill**, cấp 3 kiểu **gạch chân (underline)**
- Xuất **PNG nền trắng** giống ảnh mẫu

Mở `index.html` là chạy. Deploy free bằng **GitHub Pages**.

## ✨ Tính năng (đầy đủ công cụ mindmap)

- ➕ Thêm nhánh con (Tab) / nhánh ngang (Enter) / Xóa (Delete)
- ✏️ Double-click sửa chữ ngay trên node + panel thuộc tính phải
- 🎨 Màu nhánh, màu nền, màu chữ, kiểu node: Trung tâm / Pill / Gạch chân / Hộp
- 🔠 Đậm / Nghiêng / Tăng-giảm cỡ chữ
- 👁 Thu gọn / mở rộng nhánh
- 🖱️ Kéo node chỉnh tay, kéo nền để pan, lăn chuột để zoom, Fit / Center
- ↩️ Undo / Redo (Ctrl+Z / Ctrl+Y)
- 💾 Tự lưu localStorage
- 📤 Export JSON / 📥 Import JSON
- 🖼️ Export PNG chất lượng cao (x2) nền trắng
- ⭐ Nút **Mẫu ảnh** nạp sẵn mindmap giống file mẫu

## 🚀 Chạy local

```bash
# cách 1: mở trực tiếp
start index.html

# cách 2: chạy server
npx serve .
# hoặc
python -m http.server 8000
```

## 📤 Up lên GitHub (copy-paste)

```bash
cd "C:\Users\lllT2\OneDrive\Desktop\mindmap"
git init -b main
git add .
git commit -m "MindMap Studio - app ve so do tu duy"
# Tạo repo mới trên https://github.com/new , rồi:
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Bật web online (GitHub Pages):
1. Vào repo → **Settings → Pages**
2. Source: **Deploy from a branch** → Branch: **main** / **(root)** → Save
3. Đợi 1-2 phút → link: `https://USERNAME.github.io/REPO/`

## 📁 Cấu trúc

```
mindmap/
├── index.html  # giao diện
├── style.css   # style nhánh cong, pill, underline
├── app.js      # engine vẽ + tools
└── README.md
```

## ⌨️ Phím tắt

| Phím | Chức năng |
|------|-----------|
| Double-click | Sửa node |
| Tab | Thêm nhánh con |
| Enter | Thêm nhánh ngang |
| Delete | Xóa node |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Kéo nền / Lăn chuột | Pan / Zoom |
| Kéo node | Chỉnh vị trí tay |

License: MIT — dùng tự do cho học tập.
