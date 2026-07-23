# Nguyên tắc: Job nền & hàng đợi

Nguyên tắc xử lý công việc nền, không phụ thuộc thư viện queue / message broker / hạ tầng cụ thể. Chi tiết công cụ + con số: xem file standards gốc của project.

## Job là gì — hành động nền, KHÔNG chặn request

- **Job = việc chạy nền, tách khỏi vòng đời request.** Request chỉ **đẩy job vào queue rồi trả về ngay**; công việc thật (chuyển đổi file nặng, đánh index, gửi thông báo, việc định kỳ) do **worker nền** xử lý sau.
- Dùng job khi việc **tốn thời gian / gọi dịch vụ ngoài / có thể làm bất đồng bộ** — không bắt người dùng chờ.
- Ngược với ghi vết đồng bộ trong transaction (audit): job **best-effort, có độ trễ, có thể retry**. Đừng dùng job cho việc bắt buộc phải xong-cùng-lúc với mutation.

## Idempotent — chạy lại phải an toàn

Worker có thể chạy một job **nhiều lần** (retry sau lỗi, cron chạy trùng, redelivery của broker). Vì vậy **mọi job phải idempotent**: chạy lại cho cùng kết quả hoặc bỏ qua nếu đã làm — không nhân đôi tác dụng phụ. Ba cơ chế, dùng phối hợp:

- **JobId ổn định từ resource id.** Tính jobId **suy diễn được** từ id tài nguyên (+ biến thể hành động), không random. Enqueue lại cùng jobId → đè job cũ, không tạo bản trùng.
- **Unique constraint / insert-nếu-chưa-có.** Việc ghi trạng thái nên chặn trùng ở tầng lưu trữ (unique constraint + "bỏ qua nếu đã tồn tại"), không dựa vào cờ "đang xử lý" trong bộ nhớ.
- **Hành động bản thân idempotent.** Thiết kế thao tác để lặp vô hại: xóa lần 2 vẫn ok (không có → coi như xong), update **có điều kiện** (`chỉ đổi nếu đang ở trạng thái cũ`), gửi thông báo kèm khóa khử trùng.

## Payload tối thiểu — chỉ gửi ID, worker tự đọc

- **Chỉ đẩy định danh** (id tài nguyên + tham số cần thiết) vào job, **không nhét dữ liệu lớn** (nội dung file, cả bản ghi).
- Worker **tự đọc dữ liệu hiện tại** từ nguồn sự thật khi chạy. Lý do cốt lõi: giữa lúc enqueue và lúc chạy, dữ liệu có thể đã đổi — đọc lúc chạy **tránh xử lý dữ liệu cũ (race)**. Kèm lợi ích: hàng đợi không phình, dễ debug.

## Retry & backoff — phân biệt lỗi tạm vs vĩnh viễn

- **Exponential backoff** giữa các lần retry (giãn dần), kèm **cap max delay** để không chờ vô hạn.
- **Lỗi TẠM THỜI** (timeout, rate limit, mất kết nối dịch vụ ngoài) → **retry**: nhiều khả năng lần sau thành công.
- **Lỗi VĨNH VIỄN** (input sai, tài nguyên không tồn tại, vi phạm ràng buộc nghiệp vụ) → **KHÔNG retry, đưa dead-letter ngay**: thử lại chỉ tốn tài nguyên, kết quả vẫn hỏng.
- Giới hạn số lần retry; hết số lần vẫn fail → chuyển dead-letter.

## Dead-letter — giữ job fail, không âm thầm mất

- Job fail (hết retry hoặc lỗi vĩnh viễn) phải **được giữ lại** ở một nơi (dead-letter), **KHÔNG drop**. Mất job = mất việc âm thầm, không ai biết.
- Cần **cách liệt kê** job fail + metadata (vì sao fail, bao nhiêu lần) và **cách retry thủ công** sau khi khắc phục nguyên nhân.
- **Alert khi vượt ngưỡng** (số job fail trong khoảng thời gian) → để vận hành phát hiện và xử lý, không để tồn đọng lặng lẽ.

## Concurrency cap — không làm quá tải dịch vụ ngoài

Giới hạn số job chạy song song **theo tài nguyên hạ tầng** (dịch vụ ngoài, DB) mà worker gọi tới. Cap để không vượt rate limit / làm nghẽn dịch vụ phụ thuộc. Việc nặng (CPU/bộ nhớ) đặt cap thấp; việc I/O nhẹ có thể cao hơn. Mutation nên chạy tuần tự khi cần an toàn.

## Scheduling định kỳ — vẫn phải idempotent

- Job chạy theo lịch (định kỳ) dùng cơ chế lập lịch của queue.
- **Cron có thể chạy trùng** (lịch chồng, redelivery, nhiều instance) → job định kỳ vẫn **bắt buộc idempotent** như mọi job khác. Đừng giả định "mỗi kỳ chạy đúng một lần".

## Graceful shutdown — xử nốt job đang chạy

- Worker phải bắt tín hiệu dừng (SIGTERM từ orchestrator): **ngừng nhận job mới, hoàn thành job đang chạy** (hoặc rời queue sạch sẽ), rồi mới thoát.
- Đặt **timeout tự thoát NHỎ HƠN cửa sổ kill** của hạ tầng → tự dừng gọn trước khi bị kill cứng (kill giữa chừng làm job dở dang, dễ mất/nhân đôi tác dụng).

## Job-state ≠ DB-state — đồng bộ rõ ràng

Trạng thái job trong queue (pending/active/failed) **khác** trạng thái nghiệp vụ trong DB (đang xử lý / xong / lỗi). Đừng để client suy ra tiến độ nghiệp vụ từ trạng thái queue. **Đồng bộ tường minh:** service ghi trạng thái vào DB khi enqueue; worker cập nhật DB khi xong/lỗi; client đọc trạng thái từ DB.

## Correlation — nối request → job → exception

Dùng **một correlation id chung** (lấy từ request gốc, thiếu thì sinh mới) truyền vào payload/metadata của job, và mọi log của job đều mang id này. Nhờ đó tra ngược được một luồng xuyên suốt: request phát sinh → job xử lý → exception (nếu có). Chi tiết mô hình log: xem [logging.md](logging.md).
