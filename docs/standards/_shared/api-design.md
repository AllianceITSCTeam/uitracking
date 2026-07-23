# Nguyên tắc: Thiết kế API (HTTP)

Nguyên tắc hợp đồng API, không phụ thuộc ngôn ngữ/framework/nghiệp vụ. Áp dụng cụ thể (cấu trúc envelope thật, bảng mã lỗi, route): xem file standards gốc của project.

## Một response envelope duy nhất

- **Mọi response bọc chung một khung** — thành công hay lỗi đều cùng hình dạng bên ngoài. Client chỉ cần một bộ bóc tách.
- **Tách bạch payload nghiệp vụ ↔ thông báo.** Dữ liệu nghiệp vụ (`data`) không trộn lẫn với thông tin lỗi/cảnh báo. Cách phân biệt thành công/thất bại là **quyết định cụ thể của project** — hoặc `data`/`error` loại trừ nhau, hoặc một trường trạng thái ở body (vd `status_code` phản chiếu HTTP) + object `message` mô tả — miễn client rẽ nhánh theo **một tín hiệu ổn định**, không đoán qua trường hiển thị.
- **`meta` LUÔN có mặt** ở mọi response (kể cả lỗi) — nó là metadata của bản thân response, không phải dữ liệu nghiệp vụ. Tối thiểu mang thời gian xử lý phía server và mốc thời gian.
- **HTTP status mang tín hiệu thô, body mang chi tiết.** Không dựa vào chỉ một trong hai; hai lớp bổ trợ nhau (project có thể phản chiếu status vào body làm tín hiệu rẽ nhánh chính).
- **`data` là data shape thuần** — không bọc lồng thêm tầng thừa quanh nó.

Quy ước serialize nên thống nhất một chỗ:
- **Thời gian → chuẩn hóa UTC** (có hậu tố chỉ múi giờ). DB lưu UTC; hiển thị giờ địa phương là việc của client.
- **ID → chuỗi opaque**, không lộ kiểu/định dạng nội bộ ra ngoài.

## Phân trang — có trần, giữ khung meta

- Tham số phân trang truyền qua query; thiếu thì có **giá trị mặc định**.
- **Kích thước trang phải có ngưỡng trần** (cap) — chống client yêu cầu lô quá lớn gây quá tải.
- `meta` của danh sách mang đủ thông tin điều hướng (tổng số, trang hiện tại, cỡ trang, tổng số trang).
- **Đổi kiểu phân trang (offset ↔ cursor) thì GIỮ NGUYÊN khung `meta`** để client không phải viết lại bộ bóc tách. Kiểu phân trang là chi tiết triển khai, khung meta là hợp đồng.

## Taxonomy mã lỗi → map sang HTTP status

- **Mã lỗi dạng `UPPER_SNAKE`**, ổn định, map **cứng** sang HTTP status ở một chỗ. Client bắt theo mã, không bắt theo chuỗi message.
- **`message` hướng người dùng cuối** — KHÔNG lộ chi tiết kỹ thuật (stack, tên bảng, câu query). Chi tiết kỹ thuật chỉ vào log.
- **Lỗi nội bộ (5xx):** message chung chung; tuyệt đối không rò nội tình ra body.
- **Lỗi validate:** kèm cấu trúc lỗi theo từng field (`field_errors` hoặc tương đương) — dạng map `<field> → [thông báo...]` **hoặc** mảng `[{ field, code, message }]` — để UI gắn lỗi đúng ô nhập. Dạng cụ thể do project chốt.

## Field dẫn xuất (join) — đặt phẳng, suffix nhất quán

- Field lấy qua join (không phải cột lưu trữ trực tiếp, vd tên hiển thị từ một khóa ID) đặt **phẳng cùng cấp**, dùng **suffix nhất quán** để phân biệt với cột gốc.
- Khóa ID gốc vẫn giữ nguyên; field dẫn xuất là phần bổ sung, không thay thế.
- **Chỉ kèm khi endpoint thực sự cần** — không nhồi mọi field dẫn xuất vào mọi response.

## Header client gửi — KHÔNG tin cho phân quyền

- **Mọi header do client gửi đều SPOOF được** → chỉ dùng cho audit / hiển thị / tùy biến hiển thị, **KHÔNG** dùng cho quyết định phân quyền.
- **IP thật lấy phía server**, không tin IP do client khai trong header.
- **Ngữ cảnh client** (màn hình, route, timezone, viewport...) truyền qua **header**, KHÔNG nhét vào body — giữ payload là data shape thuần.
- Bộ header ngữ cảnh nên set **một chỗ** (fetch wrapper) cho mọi request, không rải rác.
- Ngữ cảnh này chỉ persist khi có ghi vết (mutation / truy cập nhạy cảm), không cho mọi lượt đọc.

## Payload request — chỉ field được phép ghi

- Payload **chỉ chứa field client được phép ghi**; các cột hệ thống tự quản (id, mốc tạo/sửa, cờ xóa mềm, thứ tự...) do server gán, client KHÔNG gửi.
- **Validate ở biên trước khi chạm business logic** — fail thì trả lỗi validate kèm `field_errors`, không để dữ liệu bẩn đi sâu.

## Route conventions

- **Versioning từ đầu.** Đặt prefix version ngay cả khi chưa có consumer ngoài → an toàn khi tương lai có client phát hành lệch nhịp. Breaking change về sau tạo version mới cho *riêng* endpoint đổi, không đại phẫu toàn bộ.
- **Path ổn định, nhất quán** — dùng danh từ số nhiều, casing thống nhất, không trailing slash; ID trong path là opaque.
- **Partial update, không thay-toàn-bộ.** Cập nhật bộ phận (PATCH) chấp nhận payload rời rạc — tránh ngữ nghĩa "gửi thiếu = xóa" của thay-toàn-bộ (PUT).
- **Nesting tối đa một cấp.** Sâu hơn → chuyển sang query hoặc tách thành resource top-level. Tránh path lồng nhiều tầng khó bảo trì.
- **Mỗi chuyển-trạng-thái là một endpoint riêng** (động từ imperative). Phân quyền riêng cho từng chuyển tiếp, audit rõ hành động. **KHÔNG** nhồi state machine vào một endpoint update chung — đổi trạng thái là thao tác nghiệp vụ, không phải sửa field.
- **Search theo resource**, không đặt một endpoint search global; dùng chung envelope + phân trang.

### Query cho list & search

- **Sort theo whitelist.** Chỉ cho phép sort trên **tập cột được duyệt trước** của resource → chống sort cột tùy ý (rò cấu trúc, quét index xấu). Quy ước tiền tố để đảo chiều tăng/giảm; mỗi resource có sort mặc định riêng.
- **Filter theo tên field** — tham số filter trùng tên field, casing thống nhất với data shape.
- **Full-text** truyền qua một tham số truy vấn riêng.
