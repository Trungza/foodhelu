# Weekly Schedule Publish Function

Function ID đề xuất: `weekly_schedule_publish`

## Mục đích
Nhận toàn bộ payload lịch ăn tuần từ frontend trong **1 request** rồi xử lý:
- Xóa dữ liệu tuần cũ (`daily_menu`, `combos`, `combo_items`)
- Tạo lại dữ liệu tuần mới

## Runtime
- Node.js (khuyến nghị Node 18+)
- Entry point: `src/main.js`

## Dependencies
```bash
npm install
```

## Environment variables
- `APPWRITE_DATABASE_ID=69eb95be00398251344a` (hoặc DB của bạn)

Các biến sau thường được Appwrite inject tự động cho function:
- `APPWRITE_FUNCTION_API_ENDPOINT`
- `APPWRITE_FUNCTION_PROJECT_ID`

## Permissions
Function cần quyền đọc/ghi/xóa trên các collection:
- `daily_menu`
- `combos`
- `combo_items`

## Request body (JSON)
```json
{
  "weekId": "2026-W18",
  "dishes": [],
  "combos": []
}
```

## Response
- Thành công: HTTP 200
```json
{
  "ok": true,
  "weekId": "2026-W18",
  "dishes": 10,
  "combos": 3
}
```

- Lỗi: HTTP 500
```json
{
  "ok": false,
  "message": "..."
}
```
