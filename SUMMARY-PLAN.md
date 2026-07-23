# Tool Tracking UI Changes — Tóm tắt trình bày

## 1. Vấn đề giải quyết
Trên mỗi project web, UI các màn hình thường xuyên thay đổi (đổi label/placeholder, đổi dropdown/header bảng, thêm/bớt/đổi thứ tự control, đổi màu sắc/kiểu dáng). Hiện **không có cách theo dõi tự động** những thay đổi này → khó phát hiện lỗi ngoài ý muốn (regression) và khó audit lịch sử thay đổi.

## 2. Giải pháp
Xây một tool **tự động chụp lại cấu trúc UI** của từng màn hình theo thời gian, **so sánh giữa các lần chạy** và **báo cáo chính xác đã thay đổi những gì**, xem trên dashboard.

## 3. Theo dõi được gì
- **Text**: label, placeholder, button, tooltip
- **Nội dung**: options dropdown, header cột bảng
- **Cấu trúc control**: loại control, thứ tự, thêm/bớt
- **Style**: màu sắc, font, kích thước, layout
- **Đa ngôn ngữ**: so sánh theo từng ngôn ngữ; phát hiện thiếu bản dịch / chưa dịch

## 4. Cách hoạt động (4 khối)
| Khối | Vai trò |
|---|---|
| **Capture** | Tự mở app (Playwright), đăng nhập, chụp cấu trúc UI |
| **Diff** | So sánh 2 lần chạy, phân loại từng thay đổi |
| **Dashboard** | Chọn project → xem timeline & báo cáo thay đổi trực quan |
| **Recorder** | Hỗ trợ QA khai báo control bán tự động (giảm công) |

## 5. Điểm mấu chốt về độ chính xác
Mỗi project chuẩn bị một **bộ khai báo control (locator)** — dùng cơ chế định danh bền vững của Playwright (ưu tiên `data-testid`). Nhờ đó tool phân biệt chính xác *"control cũ đổi màu"* với *"control bị xóa/thêm mới"*, thay vì đoán mò.

## 6. Quản lý & báo cáo
- **Nhiều project**: mỗi môi trường (dev/staging/prod) là 1 project, khai báo tập trung, chạy độc lập.
- **Lịch sử**: mỗi lần chạy lưu 1 report (xem trên dashboard hoặc file HTML offline), có timeline để mở lại bất kỳ mốc nào.

## 7. Lộ trình
- **Giai đoạn 1 (chạy thủ công)**: PoC → Capture → Recorder → Diff → Dashboard
- **Giai đoạn 2 (nâng cấp)**: chạy tự động theo lịch/CI, thông báo khi có thay đổi

## 8. Lợi ích
- **QA**: phát hiện sớm thay đổi UI ngoài ý muốn (regression)
- **Audit**: có nhật ký thay đổi UI để review/báo cáo
- **Đa ngôn ngữ**: kiểm soát chất lượng bản dịch
- **Chi phí thấp**: dùng công nghệ mã nguồn mở (Node.js + Playwright)

## 9. Cần chuẩn bị
- QA khai báo bộ locator cho các màn (trung bình 20–50 control/màn) — có Recorder hỗ trợ
- Khuyến nghị dev gắn `data-testid` để tối ưu độ bền

---
*Chi tiết kỹ thuật đầy đủ: xem `UI-TRACKING-TOOL-PLAN.md`.*
