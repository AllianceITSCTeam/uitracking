# Nguyên tắc: Lưu trữ & truy xuất file

Nguyên tắc xử lý file trên object store bất kỳ (S3/R2/GCS/Azure Blob). Không phụ thuộc provider. Chi tiết provider + con số: xem file standards gốc.

## Storage key — bất biến, opaque

- **Key bất biến.** Tạo lần đầu rồi không sửa. Mỗi lần upload = một version mới = một object mới với key mới.
- **Không đoán được từ tên file gốc.** Tên gốc do người dùng đặt lưu ở **metadata/DB**, KHÔNG nhét vào key. Key dựng từ ID opaque (không tuần tự, không enumerate được).
- Object đã ghi = **bất biến**; xóa logic (soft-delete) **không** xóa object ngay (xem *Xóa*).

## Upload — kiểm soát tập trung, validate trước khi lưu

Hai chiến lược, đánh đổi rõ:
- **Proxy qua server:** client gửi file tới server, server validate rồi stream tới store. Kiểm soát tập trung (bảo mật, audit), **không lộ credential store**; đổi lại server gánh I/O.
- **Ký URL upload thẳng (presigned direct):** client upload thẳng lên store, giảm tải server; đổi lại phải **verify bất đồng bộ sau upload** (magic-byte, virus).

Nguyên tắc:
- **Validate TRƯỚC khi lưu** — sai thì từ chối ngay (400/413/422), không để rác vào store.
- **Flag config chuyển chiến lược** (proxy ↔ presigned) mà không phá code hiện tại → không khóa cứng một phương án.

## Validate file — không tin client

- **Kích thước:** vượt ngưỡng → **413**. Nếu stream thì kiểm khi đọc, không đợi nhận hết.
- **Loại file (MIME):** dùng **whitelist**. **KHÔNG tin extension / MIME header client khai báo.**
- **Magic-byte:** đọc n byte đầu, so khớp signature thật của định dạng. Lệch → từ chối (422). Đây là lớp chặn file ác ý ngụy trang (đổi đuôi).
- **Chuẩn hóa tên file gốc:** loại `../`, null byte, đường dẫn tuyệt đối; giới hạn độ dài. Chống path traversal.
- **Virus scan:** YAGNI ở giai đoạn đầu (whitelist + magic-byte đủ ngăn cơ bản); khi cần thì quét **async, không block upload**, xấu thì flag/cách ly + audit.

## Versioning — bất biến sau khi commit

- **Mỗi version = object riêng**, không ghi đè. Upload lại → version tăng, key khác.
- Trường toàn vẹn (**key, size, checksum**) **không sửa sau khi tạo** — là bằng chứng toàn vẹn & lịch sử hợp lệ.
- Có con trỏ "phiên bản hiện tại" tách khỏi danh sách lịch sử.
- Soft-delete version = ẩn khỏi UI; object vẫn còn cho tới khi cleanup.

## Download — kiểm quyền trước, URL ngắn hạn, chống IDOR

- **Kiểm quyền là bước đầu tiên**; ghi **audit đồng thời** khi cấp quyền tải (ai tải file gì, IP, ngữ cảnh).
- **URL ký ngắn hạn (presigned GET):** client tải thẳng từ store, giảm tải server; TTL đủ ngắn để chống chia sẻ URL lâu dài.
- **Chống IDOR:**
  - Key opaque không enumerate được; biết id mà không có quyền → vẫn chặn.
  - **KHÔNG dẫn xuất quyền từ khả-năng-truy-cập-URL.** Quyền kiểm ở server (DB + policy), không phải "vào được URL = có quyền".
- **Response headers** cho file nhạy cảm: `no-store`/`no-cache` (quyền có thể đổi), `nosniff` (chống đoán loại), checksum làm ETag cho cache có kiểm soát, `Content-Disposition` mã hóa tên UTF-8 đúng chuẩn.

## Preview / chuyển đổi — async, không embed trong route

- Chuyển đổi nặng (Office→PDF, render) chạy ở **worker nền riêng**, KHÔNG chặn request.
- **Cache-key gồm cả quyền của người xem** — người quyền khác nhau không dùng chung bản cache.
- **Không tiền-tính** mọi bản lúc upload (YAGNI) — tạo khi có yêu cầu đầu tiên.

## Toàn vẹn — checksum & size lúc ghi

Tính **checksum + size** ngay khi upload, lưu cùng metadata → phục vụ kiểm toàn vẹn, audit, restore từ backup. Đây là dữ liệu bất biến.

## Xóa — soft-delete + grace, cleanup trì hoãn

- **Soft-delete trước**, đánh dấu "chờ xóa"; object **không xóa vật lý ngay**.
- **Grace period** rồi mới hard-delete qua worker cleanup định kỳ → cho phép khôi phục khi xóa nhầm, đáp ứng compliance.
- **Hard-delete (purge)** cần **quyền cao + xác thực mạnh** (2FA/approval).
- **Audit giữ nguyên** dù object bị xóa — lịch sử không mất.

## Client store — pool & retry

- **Reuse client instance (singleton)** — không tạo pool mới mỗi request.
- **Retry exponential backoff** khi store timeout; giới hạn số lần.
- Điều tiết concurrency theo tài nguyên; đo latency (avg/p95/p99) để phát hiện bottleneck sớm.
