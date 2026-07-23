# Nguyên tắc: Validate input & xử lý lỗi

Nguyên tắc validate dữ liệu vào và ánh xạ lỗi ra response, không phụ thuộc ngôn ngữ/framework/nghiệp vụ. Áp dụng cụ thể (cú pháp schema, tên mã lỗi tầng lưu trữ, wrapper route): xem file standards gốc.

## Một schema — validate lẫn suy kiểu

- **Định nghĩa schema validate ở một chỗ duy nhất**, dùng chung cho cả **validate lúc chạy** lẫn **suy kiểu tĩnh**. Không định nghĩa hai lần (một để kiểm tra, một để khai kiểu) — lệch nhau là nguồn bug.
- Một schema per resource → tránh trùng lặp (DRY), đổi một chỗ khớp mọi nơi.

## Validate ở biên — trước khi vào service

- **Validate tại biên (controller/route) TRƯỚC khi gọi service.** Biên là ranh giới tin cậy: qua khỏi đây, dữ liệu coi như đã hợp lệ.
- Service chỉ nhận input đã hợp lệ → không phải tự thủ input thô, không lặp lại validate rải rác.
- Validate ở tầng service là **quá muộn** — biên phải là nơi chặn.

## Parse không throw — validation là logic nghiệp vụ

- **Dùng cơ chế parse trả kết quả (thành công/lỗi), KHÔNG ném exception** khi input sai.
- Validation error **là phần logic nghiệp vụ bình thường**, không phải lỗi kỹ thuật → xử như một nhánh dữ liệu trả về, đừng đẩy vào đường xử lý exception.
- Fail → bóc chi tiết lỗi từng field → gắn vào response lỗi (xem *field_errors*).

## Coerce & chuẩn hóa input

- **Tham số query luôn là chuỗi** → coerce sang số/boolean/ngày khi cần, kèm ràng buộc (min/max, default).
- Chuẩn hóa nhẹ ở biên khi hợp lý: trim khoảng trắng, hạ/nâng case cho field định danh (email...) → so khớp nhất quán.

## Sanitize trước khi ghi lưu trữ

Chống injection/XSS và dữ liệu độc hại — làm **TRƯỚC khi ghi vào nơi lưu trữ**:

- **Tên file:** chuẩn hóa chống path traversal — loại `../`, null byte, đường dẫn tuyệt đối, ký tự cấm theo hệ điều hành; giới hạn độ dài. Không tin tên client gửi.
- **Blob JSON có cấu trúc:** dùng **schema nghiêm ngặt** — chỉ nhận đúng các key/kiểu đã khai; **từ chối key tùy ý**. Đừng nhận "bất kỳ object nào".
- **Text tự do:** trim; từ chối HTML/script nếu không chủ đích cho phép — đừng dùng field ghi chú để chứa markup thực thi được.
- **Giá trị động (loại/trạng thái...):** kiểm theo **whitelist/enum** — chỉ nhận giá trị nằm trong tập cho phép.

## Lỗi có kiểu ở service → wrapper map sang HTTP

- **Service ném lỗi CÓ KIỂU** (mang mã lỗi thuộc taxonomy chung), **không** tự dựng response HTTP — service không biết về HTTP.
- **Wrapper ở biên** bắt lỗi có kiểu → ánh xạ sang **HTTP status + mã lỗi** theo taxonomy (xem [api-design.md](api-design.md)).
- **Wrap lỗi tầng dưới** (lưu trữ, hạ tầng) thành lỗi có kiểu ở ranh giới — mỗi mã lỗi hạ tầng map về một mã nghiệp vụ tương ứng.

## Không lộ nội bộ ra client

- **KHÔNG trả raw error / stack trace / thông điệp hạ tầng ra client.** Lỗi 5xx: trả thông điệp chung; chi tiết đưa vào log.
- Thông điệp lỗi quyền/không tìm thấy không được lộ chi tiết hệ thống bên trong.

## Chi tiết lỗi theo field — cho lỗi 400

- Lỗi validation (400) trả **chi tiết theo từng field** để client hiển thị đúng chỗ.
- Cấu trúc nhất quán, dễ tra theo tên field. Dạng cụ thể (map `field→[msg]` hoặc mảng `[{field, code, message}]`) do project chốt — xem file gốc.

## Không log business/validation error như lỗi kỹ thuật

- **CHỈ log lỗi kỹ thuật (5xx)** vào kênh exception. Validation/business error (4xx) **KHÔNG** ghi như lỗi kỹ thuật — chúng là hành vi bình thường, log vào đó chỉ tạo nhiễu.
- Chi tiết mô hình log (audit vs exception): xem [logging.md](logging.md).

## Tóm tắt — CÓ / CẤM

| ✅ CÓ | ❌ CẤM |
|---|---|
| Validate mọi input ở biên trước khi gọi service | Validate ở tầng service (quá muộn) |
| Parse trả kết quả, không throw khi input sai | Ném exception cho validation error |
| Một schema dùng chung validate + suy kiểu | Định nghĩa schema/kiểu ở hai nơi |
| Service ném lỗi có kiểu; wrapper map sang HTTP | Service tự dựng response HTTP thô |
| Sanitize (filename, blob JSON) trước khi ghi | Nhận object tùy ý / tin tên file client |
| Whitelist/enum cho giá trị động | Nhận giá trị động không kiểm |
| field_errors chi tiết cho 400 | Lộ raw error / stack ra client |
| Chỉ log 5xx vào kênh exception | Log validation/business error như lỗi kỹ thuật |
