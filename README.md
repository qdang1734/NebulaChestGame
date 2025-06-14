# NebulaChest

NebulaChest là một ứng dụng web dựa trên blockchain TON cho phép người dùng sưu tầm mèo NFT độc đáo. Ứng dụng tích hợp với ví TON và cung cấp trải nghiệm chơi game đầy đủ qua Telegram.

## Tính năng chính

- Sưu tầm các mèo NFT với độ hiếm khác nhau
- Tích hợp ví TON (TON Wallet) để giao dịch cryptocurrency
- Bật/mở trứng và nhận mèo ngẫu nhiên dựa trên tỷ lệ rơi
- Kiếm phần thưởng hàng ngày từ bộ sưu tập mèo của bạn
- Tích hợp bot Telegram (NebulaChestBot_Bot) để chơi trực tiếp trong Telegram
- Hỗ trợ đa ngôn ngữ với giao diện thân thiện người dùng

## Triển khai lên Render

Tham khảo tệp RENDER_DEPLOYMENT_GUIDE.md để biết hướng dẫn chi tiết về cách triển khai NebulaChest lên Render.

## Cấu trúc dự án

- `/client`: Giao diện người dùng ReactJS
- `/server`: API Express và xử lý backend
- `/shared`: Các module chung được sử dụng bởi cả frontend và backend
- `/public`: Các tài nguyên tĩnh

## Yêu cầu hệ thống

- Node.js v20+
- PostgreSQL database
- Telegram Bot Token (cho tính năng Telegram)

## Cài đặt

1. Clone repository
2. Chạy `npm install` để cài đặt các dependencies
3. Cấu hình biến môi trường (xem phần dưới)
4. Chạy `npm run db:push` để cập nhật schema database
5. Chạy `npm run dev` cho môi trường phát triển hoặc `npm start` cho môi trường production

## Biến môi trường

Tạo file `.env` ở thư mục gốc với các biến sau:

```
DATABASE_URL=postgres://username:password@host:port/database
NODE_ENV=development
APP_URL=https://your-app-url.com
```

## Kết nối với Telegram Bot

1. Tạo bot mới thông qua @BotFather trên Telegram
2. Lấy Bot Token và thêm vào biến môi trường BOT_TOKEN
3. Cập nhật URL webhook trong tệp server/telegram-bot.ts
4. Khởi động lại ứng dụng

## Kết nối với TON Wallet

1. Cập nhật tệp tonconnect-manifest.json với URL của ứng dụng
2. Triển khai ứng dụng lên domain chính thức (không phải localhost)
3. Đảm bảo tệp manifest có thể truy cập tại /tonconnect-manifest.json

## Giấy phép

MIT