# TV Stream Server

Dự án web server đơn giản để xem TV online từ mọi thiết bị, kể cả thiết bị cũ.

## Cài đặt

```bash
npm install
```

## Chạy server

```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## Tính năng

- ✅ Hỗ trợ mọi thiết bị (PC, mobile, tablet, thiết bị cũ)
- ✅ Phát stream HLS (.m3u8)
- ✅ Giao diện thân thiện, responsive
- ✅ Tìm kiếm kênh nhanh
- ✅ Tự động parse file M3U
- ✅ Hỗ trợ trình duyệt cũ với HLS.js

## Cấu trúc dự án

```
tv_stream/
├── server.js          # Node.js Express server
├── package.json       # Dependencies
├── vn.m3u            # Danh sách kênh TV
└── public/
    └── index.html    # Web player interface
```

## API Endpoints

- `GET /` - Giao diện web player
- `GET /api/channels` - Lấy danh sách kênh (JSON)
- `GET /api/playlist.m3u` - Tải file M3U gốc

## Hướng dẫn sử dụng

1. Cài đặt dependencies: `npm install`
2. Chạy server: `npm start`
3. Mở trình duyệt tại `http://localhost:3000`
4. Chọn kênh từ danh sách bên phải để xem

## Yêu cầu hệ thống

- Node.js 12+
- Trình duyệt web hiện đại hoặc cũ (hỗ trợ cả IE11+)
