# Đóng góp

1. Fork repository công khai, tạo branch và mô tả thay đổi trong pull request.
2. Giữ kiến trúc React/TypeScript/Vite và tái sử dụng engine hiện có. Nội dung runtime đến từ public Google Sheets; tài liệu là tệp tĩnh.
3. Không thêm đăng nhập, backend, cơ sở dữ liệu khác, lưu tiến độ hoặc cơ chế che giấu đáp án.
4. Khi thêm nội dung, ghi tác giả/nguồn/giấy phép và bảo đảm có quyền chia sẻ. Không sao chép đề thi hoặc giáo trình chỉ vì chúng có thể xem công khai.
5. Thay schema phải cập nhật mẫu CSV, XLSX, tài liệu và parser tests cùng nhau. Tạo lại mẫu bằng `python scripts/build-sheet-template.py`.
6. Chạy `npm run typecheck`, `npm test`, `npm run build`; khi thay UI/tích hợp, chạy `npm run test:e2e`.

Giữ thông báo MIT gốc. Không cần cung cấp credential Google thật cho tests hoặc pull request.
