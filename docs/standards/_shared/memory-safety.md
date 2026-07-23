# Nguyên tắc: An toàn bộ nhớ (chống rò)

Nguyên tắc quản lý bộ nhớ & vòng đời tài nguyên, không phụ thuộc ngôn ngữ/framework. Áp dụng cụ thể (cờ runtime, runbook, cổng kiểm tra): xem file standards gốc của project.

## Nguyên tắc chung

- **Rò ≠ baseline cao.** Bộ nhớ cao *ổn định* (plateau) là baseline, không phải rò. Rò = **tăng đơn điệu theo thời gian, không tụt khi nhàn rỗi**. Một snapshot đơn KHÔNG kết luận được — phải nhìn **trend**.
- **Process sống lâu tích lũy.** Runtime tái dùng instance ấm (worker/lambda ấm, dev server, long-running server) giữ bộ nhớ giữa các lượt. Bất cứ thứ gì cấp phát rồi **không giải phóng** sẽ cộng dồn qua từng lượt.

## Client/kết nối dùng chung = singleton một-vòng-đời

Client nặng (connection pool DB, cache client, SDK giữ socket) PHẢI khởi tạo **một lần** và tái dùng:

- Khởi tạo **lười** qua một điểm truy cập chung; giữ **một** instance cho cả vòng đời process.
- **Hot-reload / re-eval module KHÔNG được tạo instance mới** — nếu không mỗi lần nạp lại mở thêm pool ⇒ rò kết nối + bộ nhớ. Ghim instance vào phạm vi sống-dai hơn module (biến toàn cục runtime) để lần nạp sau tái dùng.
- Cấm `new <HeavyClient>()` rải rác trong code request/module. Ngoại lệ: test tạo instance throwaway rồi **đóng tường minh**.

## Cache in-memory PHẢI bị chặn

Cache không giới hạn = rò chờ xảy ra trên process sống lâu:

- Mọi cache PHẢI có **cả hai**: { giới hạn số phần tử } **và** { cơ chế loại bỏ — TTL hoặc eviction }. Thiếu một trong hai ⇒ không phải cache, là rò.
- Cache khóa theo chiều **không chặn trên** (mỗi user/tenant/token/session một entry) đặc biệt nguy hiểm: kích thước trôi theo lượng khóa. Chặn theo số phần tử, KHÔNG chỉ theo TTL.
- Trạng thái mang dữ liệu request đặt ở module-scope mà tăng theo lượng request ⇒ vi phạm. Hoặc để **request-scoped** (thu hồi sau mỗi lượt) hoặc **bounded** như trên.

## Timer, listener, subscription PHẢI có đường dọn

Timer lặp, event listener, subscription giữ closure sống mãi và ghim mọi thứ nó tham chiếu:

- Mỗi cái **tạo ra** phải có đường **hủy** tương ứng (hủy timer / gỡ listener / hủy đăng ký) trên nhánh teardown.
- Ưu tiên công việc định kỳ chạy ngoài process (scheduler/job nền) hơn timer in-process sống dai — tránh tích lũy trạng thái trong bộ nhớ tiến trình phục vụ request.

## Biến nguyên tắc thành đảm bảo — cần cổng cơ học

Quy ước "đừng rò" không tự cưỡng chế được. Như mọi bất biến ([architecture.md](architecture.md) §"convention→đảm bảo"), phải có **chốt chặn tự động**:

- Một **cổng kiểm tra** (audit/lint) bắt các anti-pattern xác định (client khởi tạo ngoài điểm chung; timer thiếu đường hủy; cache module-level chưa chặn) → vi phạm **fail CI**.
- Phân mức: xác định-được → **CỨNG** (chặn); heuristic dễ nhầm → **mềm/thông tin** (soát tay), tránh chặn nhầm.

## Chẩn đoán khi nghi rò

1. **Đo trend, không đo điểm** — lấy nhiều mẫu cách nhau; xem đường **phẳng dần (plateau)** hay **dốc lên đều**.
2. Một cú nhảy lớn ngay sau một thao tác = **cấp phát theo nhu cầu** (nạp/biên dịch/khởi tạo), không phải rò. Nhìn **biên tăng thu hẹp dần**.
3. Rò thật: bộ nhớ **không tụt khi nhàn rỗi** (không tải, không thao tác) và tiếp tục lên tới giới hạn.
