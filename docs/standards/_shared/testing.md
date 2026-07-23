# Nguyên tắc: Kiểm thử

Nguyên tắc viết & tổ chức test, không phụ thuộc test runner, framework, hay nghiệp vụ. Áp dụng cụ thể (tên tool, con số coverage, role): xem file standards gốc của project.

## Nguyên tắc chung

- **KHÔNG ignore test fail để pass build.** Test đỏ thì fix trước, cấm commit/push/merge đè lên. Không dùng data giả, mock trá hình, hay skip để "cho qua" CI.
- **1 test = 1 kịch bản.** Không gom nhiều scenario lạc nhau vào một test; tên test chỉ rõ **điều kiện + kết quả kỳ vọng**.
- **Test qua I/O quan sát được, không qua internal state.** Assert trên đầu ra (response, bản ghi lưu, hiệu ứng phụ nhìn thấy được), không chọc vào biến/nội bộ private → test không vỡ khi refactor.
- **Assert cụ thể.** So khớp giá trị chính xác, không assert chung chung kiểu "truthy"/"tồn tại" — mất khả năng bắt lỗi.

## Test pyramid — 3 tầng

Ba tầng, tỉ trọng giảm dần từ dưới lên (nhiều unit, ít e2e — chi phí & độ giòn tăng dần):

| Tầng | Kiểm gì | Chọn khi nào |
|---|---|---|
| **Unit** | Logic thuần (validate, tính toán, transform), **không store, không I/O** | Function tinh sạch không side-effect. Logic rõ ràng không case cạnh → YAGNI, bỏ. |
| **Integration** | Nhiều tầng ghép: biên vào → logic → **store thật**; transaction, ràng buộc, filter quyền/ẩn | **Bắt buộc cho mutation & bảo mật.** Endpoint, service chạm store, rollback, constraint. |
| **E2E** | Luồng người dùng đầu-cuối qua giao diện: thao tác → mạng → hiển thị | Luồng **có ý nghĩa nghiệp vụ** (tạo → thấy trong danh sách). Không test từng nút lẻ. |

## Integration dùng STORE THẬT — không mock store

- **Test integration PHẢI chạy trên store thật** (DB thật trong container/instance test riêng), **KHÔNG mock/stub tầng truy cập dữ liệu**.
- Lý do: mock store bỏ lọt **migration fail, sai kiểu, vi phạm ràng buộc (constraint), filter mặc định** — những lỗi chỉ store thật mới bắt được. Mock làm test "pass giả".
- Cô lập giữa các test: mỗi test chạy trong transaction rồi rollback (hoặc reset store) → không rò state, chạy song song an toàn.

## Mock — chỉ dịch vụ ngoại vi, KHÔNG mock store

- **Được mock:** dịch vụ ngoại vi (object store, search engine, render/convert, queue, API bên thứ ba) ở tầng unit/integration khi chỉ cần xác nhận "được gọi đúng" hoặc tránh phụ thuộc hạ tầng nặng.
- **KHÔNG mock:** store dữ liệu chính ở tầng integration (xem trên).
- Ranh giới: mock để cắt phụ thuộc **ngoài phạm vi test**, không phải để né phần đang cần kiểm thật.

## Bắt buộc test bảo mật

Với mọi endpoint/thao tác có kiểm quyền, test **cả hai chiều** — thiếu một chiều là lỗ hổng:

- **Đủ quyền → cho phép:** chủ thể có quyền thực hiện được, trả kết quả đúng.
- **Thiếu quyền → chặn:** chủ thể không đủ quyền bị từ chối (mã lỗi quyền đúng), **không** rò dữ liệu.
- **Bản ghi đã ẩn (soft-delete) không lộ:** filter mặc định phải loại bản ghi đã xóa mềm khỏi list/get/mutation — test khẳng định điều này.
- Test list/search phải khẳng định **chỉ trả bản ghi chủ thể được phép thấy**, không lẫn của người khác.

## Coverage gate trong CI

- **Ngưỡng coverage là cổng chặn tự động** trong CI: dưới ngưỡng → CI đỏ → không merge. (Con số cụ thể per tầng: file standards gốc.)
- **Test fail → CI đỏ, không merge.** Không có ngoại lệ "tạm bỏ qua".
- Convention không có chốt chặn tự động sẽ bị vi phạm — CI gate chính là thứ biến "nên test" thành "bắt buộc test".

## Fixture factory — tái dùng dữ liệu test

- Dựng dữ liệu test qua **factory tái dùng** (một chỗ tạo, nhận override), không lặp lại boilerplate setup ở từng test → data nhất quán, DRY, sửa schema chỉ sửa một nơi.
- Factory nên có sẵn biến thể theo vai trò/trạng thái thường dùng để test bảo mật gọn.

## Co-located — test cạnh code

- **Đặt test ngay cạnh code nó kiểm** (cùng thư mục/thư mục con test kề bên), không gom hết vào cây thư mục test tách rời xa nguồn.
- Lý do: tìm test tức thì khi đọc code; refactor/di chuyển code thì test đi theo; giảm lệch giữa code và test.

## Setup / teardown rõ ràng

- Mỗi test **tự dựng tiền đề và dọn sạch sau đó** — không dựa vào thứ tự chạy hay state sót lại từ test trước.
- `await` tường minh cho thao tác bất đồng bộ trong test; không để promise treo ngoài assertion.
