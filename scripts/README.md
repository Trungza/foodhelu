# Xuất báo cáo đồ án ra Word

Từ thư mục gốc của project, chạy:

```bash
npm install
npm run report:docx
```

Kết quả sẽ được tạo tại:

`output/helu-food-do-an-tot-nghiep.docx`

## Ghi chú
- Báo cáo được dựng bằng `docx`.
- Mục lục trong Word có thể cần mở lại và cập nhật field nếu muốn hiện số trang tự động.
- Nếu muốn chỉnh nội dung báo cáo, sửa file `scripts/generate-thesis-docx.js` rồi chạy lại lệnh trên.
