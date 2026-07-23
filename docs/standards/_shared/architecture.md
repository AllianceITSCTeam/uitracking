# Nguyên tắc: Kiến trúc tầng & enforce

Nguyên tắc tổ chức code, không phụ thuộc ngôn ngữ/framework. Áp dụng cụ thể: xem file standards gốc của project.

## Nguyên tắc chung

- **YAGNI · KISS · DRY.** File code nhỏ, tách theo trách nhiệm; đừng gộp nhiều việc vào một file/hàm.
- **Data shape nhất quán xuyên tầng.** Object mang hình dạng dữ liệu giữ **cùng một tên field** từ tầng lưu trữ → service → biên API, **không map qua lại**. Chỉ code logic thuần mới theo idiom ngôn ngữ. (Casing cụ thể: xem [naming.md](naming.md).)
- **Không nuốt lỗi thầm.** Lỗi phải đi qua cơ chế xử lý lỗi có kiểu; cấm `catch {}` rỗng.

## Layering — một chiều, không nhảy cóc

Luồng gọi **một chiều: controller → service → data-access**. Tầng trên không được nhảy cóc xuống tầng dưới cùng.

| Tầng | Trách nhiệm | Cấm |
|---|---|---|
| **Controller / route** | Chỉ việc giao tiếp: nhận input → validate ở biên → gọi service → trả qua lớp response chung | Business logic; chạm thẳng persistence; tự dựng response thô |
| **Service** | Business logic, orchestrate, transaction, ghi vết nghiệp vụ. Trả data shape | Biết về đối tượng HTTP (Request/Response) |
| **Data-access** | Truy vấn lưu trữ; **áp filter mặc định** (vd loại bỏ bản ghi đã xóa mềm) | Bỏ sót filter mặc định ngoài ý muốn |
| **Lớp dùng chung** | Response helper, kiểu lỗi, wrapper, client gọi API | — |
| **Schema validate** | Định nghĩa **một chỗ**, dùng chung cho cả validate lẫn suy kiểu | Định nghĩa trùng ở 2 nơi |

Vì sao: service không dính HTTP → test và tái dùng được ngoài ngữ cảnh request; data-access áp filter mặc định → tránh rò rỉ bản ghi đã ẩn.

## Biến "convention" thành "đảm bảo" — cần cả hai lớp

Chỉ có *hàm dùng chung* thì vẫn có người quên gọi. Chỉ có *quy ước* thì không cưỡng chế được. Phải kết hợp:

1. **Hàm/lớp dùng chung** dựng đúng *hình dạng* (response envelope, kiểu lỗi) → mọi nơi đi qua đây.
2. **Wrapper + lint cưỡng chế** để *không ai lách* hàm chung → vi phạm là **fail CI**, không lọt review.

Một convention không có chốt chặn tự động thì sớm muộn sẽ bị vi phạm. Cơ chế enforce (lint rule / wrapper bắt buộc) chính là thứ biến nó thành đảm bảo.

Các đảm bảo điển hình và cơ chế:

| Đảm bảo | Bằng cơ chế |
|---|---|
| Response đúng một hình dạng | Một response helper duy nhất |
| Không controller nào lách helper | Wrapper bắt buộc + lint rule |
| Input luôn hợp lệ | Validate schema tại biên |
| Data shape không lệch casing | Cùng tên field xuyên tầng, zero mapping |
| Bản ghi đã ẩn không rò | Filter mặc định ở tầng data-access |
| Mọi mutation có vết | Service ghi audit trong cùng transaction |

## State machine — validate chuyển trạng thái trước khi gọi service

Với thực thể có vòng đời (nhiều trạng thái + chuyển tiếp hợp lệ):

- **Định nghĩa tập chuyển tiếp hợp lệ ở một chỗ** (bảng/khai báo), **validate trước khi gọi service** — cấm mọi chuyển tiếp không nằm trong tập.
- Thiết kế để **dễ thêm trạng thái mới**, tránh cascading effect lan rộng khi thêm.
- Mỗi hành động chuyển trạng thái là một thao tác nghiệp vụ riêng — đừng nhồi việc đổi trạng thái vào một endpoint update chung.

## Cấu hình thay vì hardcode

Giá trị mang tính chính sách (ngưỡng, thời hạn, danh sách cho phép) đặt ở **bảng/cấu hình**, không hardcode rải rác trong code → đổi chính sách không phải sửa & deploy lại code.

## Logging tách riêng

Mô hình audit đồng bộ vs exception async là **chuẩn xuyên suốt** — xem [logging.md](logging.md). Nguyên tắc cốt lõi: hai loại log **ngược mô hình nhau**, đừng bê cách xử lý loại này sang loại kia.
