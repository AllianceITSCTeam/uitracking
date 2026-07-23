# Nguyên tắc: Mô hình hóa dữ liệu

Nguyên tắc thiết kế bảng/cột không phụ thuộc cơ sở dữ liệu, framework, hay nghiệp vụ. Áp dụng cụ thể (cú pháp, kiểu cột, tên bảng, con số retention): xem file standards gốc của project.

## Base audit columns — mỗi bản ghi tự kể chuyện của nó

Mỗi hàng nghiệp vụ mang sẵn nhóm cột trả lời **"tạo/sửa cuối khi nào, bởi ai, từ đâu"** mà không cần dò log:

- **Thời điểm** tạo & sửa cuối (mốc thời gian, chuẩn hóa cùng một múi giờ).
- **Người** tạo & sửa cuối — lưu bằng **khóa** trỏ tới thực thể người dùng, không lưu tên (xem *Người thao tác* bên dưới).
- **Nguồn (IP)** lúc tạo & lúc sửa cuối — dữ liệu **không suy ra được**, phải lưu tường minh trên hàng.

Đây là **lớp trạng thái hiện tại**: đọc một lần là biết. Lịch sử đầy đủ nằm ở lớp thứ hai (xem *Truy vết hai lớp*).

## Soft-delete — cờ boolean, ẩn chứ không xóa vật lý

- **Xóa mềm = một cờ boolean.** Bản ghi vẫn nằm trong lưu trữ, chỉ bị **ẩn** khỏi luồng đọc mặc định; không DELETE vật lý.
- **"Khi nào / ai xóa" suy từ nhóm sửa cuối** — xóa mềm bản chất là một lần sửa, nên mốc thời gian + người + IP của lần sửa cuối chính là của thao tác xóa. Không cần cặp cột "thời điểm xóa / người xóa" riêng.
- **Ràng buộc bất biến sau xóa:** không sửa nội dung hàng đã đánh dấu xóa, nếu không mốc sửa cuối sẽ trỏ tới lần sửa mới và **mất dấu thời điểm xóa**. Nguồn bất biến dự phòng: bảng lịch sử append-only.

## "Tạm ngưng" ≠ "đã xóa" — hai cờ khác nhau

Hai trạng thái mang ý nghĩa nghiệp vụ khác nhau, **phải là hai cờ riêng**:

- **Vô hiệu hóa / tạm ngưng:** bản ghi **vẫn tồn tại**, chỉ ngừng hoạt động; người quản trị vẫn thấy để bật lại.
- **Đã xóa:** ẩn hoàn toàn khỏi nghiệp vụ.

Gộp chung một cờ sẽ mất khả năng phân biệt "tắt tạm thời" với "đã bỏ".

## Người thao tác — suy từ khóa join, KHÔNG snapshot tên lên hàng

- Trên hàng chỉ lưu **khóa** người thao tác (đã có index, join nhẹ). Tên hiển thị **suy ra bằng join** tới bảng người dùng lúc đọc → luôn là tên **hiện tại**, không bao giờ **stale**.
- **Không** ghi tên (snapshot) lên hàng nghiệp vụ: đổi tên người dùng là phải đi sửa rải rác, và dễ lệch dữ liệu.
- Nếu cần **tên tại đúng thời điểm thao tác** (snapshot lịch sử), nó thuộc về bản ghi lịch sử/audit, không thuộc hàng nghiệp vụ.
- **Không** gộp mọi thứ (IP + tên + lịch sử) vào một cột dạng document/JSON: mất kiểu, dễ ghi đè nhầm phần "tạo" khi update, và trùng vai trò của bảng lịch sử (DRY).

## Public id — OPAQUE nhưng SORTABLE theo thời gian

Khóa chính lộ ra URL/API cần đồng thời:

- **Opaque:** không đoán/enumerate được → **không auto-increment** (số tuần tự để lộ quy mô và cho phép dò bản ghi kế cận).
- **Sortable theo thời gian:** sinh sao cho thứ tự khóa phản ánh thứ tự tạo → sắp xếp/phân trang theo thời gian mà không cần cột phụ.

Ưu tiên sinh khóa ở **tầng lưu trữ** (một nguồn, nhất quán) thay vì mỗi ứng dụng tự sinh mỗi kiểu.

## Bảng append-only / bất biến — NGOẠI LỆ, chỉ mang nhóm "tạo"

Bảng chỉ-ghi-thêm (lịch sử, phiên bản, bản ghi kiểm toán) **là ngoại lệ** của base columns:

- **Chỉ mang nhóm cột "tạo"** (khóa, thời điểm tạo, người tạo, IP tạo) + cột riêng.
- **Bỏ nhóm sửa/xóa** (`sửa cuối`, cờ xóa mềm, cờ tạm ngưng) vì mâu thuẫn bản chất — bản ghi không được sửa/xóa.
- Chặn UPDATE/DELETE ở **tầng lưu trữ** (trigger/ràng buộc), không chỉ trông vào kỷ luật code.
- Bảng nối quan hệ (many-to-many) cũng theo nhóm "tạo" + ràng buộc **duy nhất trên cặp khóa** chống trùng quan hệ; gỡ quan hệ = xóa vật lý.

## Trường sắp xếp thủ công — chèn-giữa-được

Khi cần thứ tự do người dùng kéo-thả:

- Dùng **kiểu số thực/thập phân đủ rộng**, không phải số nguyên liên tiếp → chèn giữa hai mục = lấy giá trị **trung bình** của hai mục liền kề, không phải đánh số lại cả danh sách.
- **Không unique**, có giá trị mặc định; mục mới nhận giá trị **lớn hơn max hiện tại một khoảng** để nối đuôi.
- Khi khoảng chèn cạn (hiếm): chạy job **đánh số lại** về các mốc cách đều.

## Index bộ phận (partial index) — theo cột hay query + predicate soft-delete

- **Không** đánh index đứng riêng trên **cột cờ** (xóa mềm, tạm ngưng) hay cột sắp xếp: **độ chọn lọc thấp**, bộ tối ưu thường bỏ qua.
- Dùng **index bộ phận**: đặt trên (các) cột **hay được query/scope**, kèm **predicate loại bỏ bản ghi đã xóa mềm** → index nhỏ, chỉ phủ dữ liệu đang hoạt động.
- Ràng buộc **unique cũng nên là partial** (chỉ áp trên bản ghi chưa xóa) để tái dùng lại giá trị sau khi xóa mềm.

## Truy vết hai lớp — hàng (hiện tại) + lịch sử (append-only)

Trả lời nhanh câu hỏi truy vết mà **không dò log phẳng**:

- **Lớp trên hàng (tức thì):** nhóm base audit columns → "ai/khi nào/IP nào tạo & sửa cuối" bằng **một lần đọc hàng**, không join log.
- **Lớp bảng lịch sử (đầy đủ):** append-only, có **index tổng hợp theo (loại tài nguyên, mã tài nguyên, thời điểm)** → lấy toàn bộ lịch sử của một bản ghi trúng index, không quét bảng.

Log "chậm" ở hệ cũ là do **không index / không phân theo tài nguyên** — không phải bản chất của việc ghi lịch sử.

## Tách AUDIT log khỏi ERROR log — ngay ở tầng lưu trữ

Hai loại log **khác bản chất, khác vòng đời**, tách riêng ngay ở lưu trữ:

| | **Audit log** (vết nghiệp vụ) | **Error log** (lỗi kỹ thuật) |
|---|---|---|
| Nội dung | Ai làm gì với tài nguyên nào | Exception, stack trace |
| Giữ | **Lâu dài** (bằng chứng nghiệp vụ) | **Ngắn hạn** (dữ liệu tạm để đi sửa) |
| Mỗi sự kiện | **Một dòng riêng**, không gộp | **Gộp theo fingerprint** |

- **Error log chống phình bằng fingerprint + đếm gộp:** một lỗi lặp N lần = **một dòng với bộ đếm = N**, không chèn N dòng trùng. Đây là **ngoại lệ append-only có kiểm soát**: chỉ cho cập nhật đúng cột đếm + lần-gặp-cuối, cấm mọi cập nhật/xóa khác.
- Cân nhắc đặt error log ở **hạ tầng lưu trữ tách biệt** (pool riêng) để lỗi tăng đột biến không ăn vào tài nguyên của nghiệp vụ chính.
- Mô hình **ghi** log (đồng bộ vs bất đồng bộ, correlation, retention) — xem [logging.md](logging.md).

## Versioning — bất biến sau khi tạo

- **Mỗi phiên bản = một bản ghi riêng**, không ghi đè; tạo con trỏ "phiên bản hiện tại" tách khỏi danh sách lịch sử.
- Các trường **toàn vẹn** (khóa lưu trữ, kích thước, checksum) **không sửa sau khi tạo** — chúng là **bằng chứng** toàn vẹn & lịch sử hợp lệ.

## Khóa ngoại — cùng KIỂU NATIVE với khóa chính nó trỏ tới

Khóa ngoại phải khai báo **đúng kiểu native của khóa chính** nó tham chiếu. Lệch kiểu → join chậm/sai, ràng buộc không gắn được. Chọn đúng kiểu lưu trữ native (thay vì đổ về kiểu chuỗi mặc định) để cột gọn và index nhanh.
