# Nguyên tắc: Logging

Nguyên tắc ghi log, không phụ thuộc ngôn ngữ/framework/store cụ thể. Áp dụng cụ thể (tên bảng, store, con số retention): xem file standards gốc của project.

## Ba loại log — tách tuyệt đối theo bản chất

Log không phải một thứ đồng nhất. Có ba loại **khác bản chất**, đừng gộp vào một đường:

| | **Activity / audit** | **Exception** | **Request / access** |
|---|---|---|---|
| Bản chất | Vết **nghiệp vụ** — ai làm gì | Lỗi **kỹ thuật** — stack trace | Nhịp request |
| Giá trị | Pháp lý / tuân thủ / truy vết | Debug — biết đã văng lỗi để sửa | Đo hiệu năng |
| Được phép mất? | **KHÔNG** | Được (best-effort) | Được |
| Cách ghi | **Đồng bộ, cùng transaction với mutation** | **Async**, best-effort | Ra luồng output của nền tảng |
| Dedup | **KHÔNG** — mỗi hành động một dòng | **Có** — gộp theo fingerprint | — |
| Lưu lâu | Rất lâu / vĩnh viễn | Ngắn hạn | Theo nền tảng |

**Vì sao ngược nhau:** audit là bản ghi *không được mất, không được gộp, không được lệch* với hành động → phải đồng bộ + atomic. Exception là tín hiệu *biết-là-đủ, mất-vài-cái-không-chết* → async best-effort để không đụng luồng chính. **Đừng bê mô hình loại này sang loại kia** — mỗi loại có ràng buộc riêng, dùng nhầm cách của loại kia là sai bản chất.

## Activity / audit — đồng bộ, atomic, bất biến

- **Khi nào ghi:** MỌI mutation + truy cập nhạy cảm (xem/tải/sửa/xóa/duyệt/đổi quyền...). Đây là **mặc định**, không opt-in theo từng feature.
- **Ghi ĐỒNG BỘ trong cùng transaction với mutation.** Business write + audit insert chung một transaction → mutation rollback thì audit rollback theo. **Không async, không fire-and-forget, không đẩy queue.** Vết nghiệp vụ phải khớp 1-1 với hành động thật đã commit.
- **Không dedup** — mỗi hành động một dòng riêng (N lần thao tác = N dòng), không gộp đếm. Dedup làm mất chi tiết pháp lý.
- **Append-only** — chặn UPDATE/DELETE ở tầng store (không sửa được sau khi ghi), để làm bằng chứng bất biến.
- **Lưu lâu / vĩnh viễn** — backup phải bao trọn.
- **IP / ngữ cảnh:** ghi định danh thật lấy phía server; **không tin header client khai báo** cho mục đích phân quyền.
- **Lối thoát khi ghi cùng-transaction thành nút cổ chai** (hiếm): dùng **outbox trong cùng transaction** — vẫn atomic, vẫn **không mất**, rồi worker async chuyển sang store đọc. Đây là lối thoát *có bảo toàn*, khác hẳn fire-and-forget của exception.

## Exception — async, best-effort, gộp theo fingerprint

- **Một logger interface, một sink đổi được.** Call-site chỉ gọi một hàm log lỗi; đổi/thêm backend (thêm transport) không phải sửa nghiệp vụ — chỉ thêm nhánh trong logger.
- **Bắt exception tập trung MỘT chỗ** — không rải lệnh log lỗi khắp service. Nghiệp vụ ném lỗi có kiểu; một wrapper ở biên bắt và lo ghi.
- **Ghi async, best-effort:** đẩy sang đường xử lý riêng (worker/sink tách khỏi luồng phục vụ request) → log không kẹt sau việc nặng, lỗi ghi log không đụng luồng chính.
- **`await` việc đẩy log + fallback, nhưng KHÔNG bao giờ throw vào request.** Đợi cho chắc (giảm mất log), nhưng nếu đẩy hỏng → ghi ra output thô rồi **nuốt lỗi** đó. **Ghi log mà làm hỏng request là ngược đời** — log là phụ, request là chính.
- **Fingerprint + đếm gộp:** một lỗi lặp N lần = một dòng với số đếm, thay vì N dòng. Tính fingerprint trước khi đẩy; gộp (upsert theo fingerprint) ở phía nhận.
- **Tách store khỏi dữ liệu nghiệp vụ:** log lỗi để ở store/pool riêng, không ràng buộc khóa ngoại sang dữ liệu app; cần thông tin liên quan thì **snapshot** vào bản ghi log.
- **Lưu ngắn hạn** — dọn định kỳ.

## Request / access — không vào store nghiệp vụ

- **Không ghi vào DB.** Mỗi response đo **duration** và phát ra luồng output của nền tảng để nền tảng thu thập.
- Nhẹ, không atomic, không cần bền — chỉ phục vụ đo hiệu năng.

## Correlation — nối theo id, KHÔNG merge store

- Một **correlation id** (sinh ở server nếu client thiếu) xuyên cả ba loại log — có mặt trong bản ghi của từng loại.
- Điều tra sự cố → **join theo id**, KHÔNG gộp ba loại vào chung một bảng/đường. **Mỗi loại giữ store và vòng đời riêng**; correlation là sợi chỉ nối, không phải cái kho chung.

## Enforce — biến quy ước thành đảm bảo

Quy ước không có chốt chặn tự động sẽ bị vi phạm. Cần cơ chế cưỡng chế, không chỉ trông chờ review:

| Đảm bảo | Bằng cơ chế |
|---|---|
| Mọi mutation có audit | Ghi audit trong cùng transaction ở tầng service; review + test |
| Audit bất biến | Chặn UPDATE/DELETE ở tầng store |
| Mọi exception chưa xử lý được ghi | Bắt tập trung ở wrapper biên (tự động, không opt-in) |
| Ghi log không chặn request | Exception async; audit trong tx nhưng không I/O ngoài / không dedup |
| Ba loại không lẫn nhau | Store riêng cho từng loại |
